import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../theme/app_theme.dart';
import 'app_card.dart';
import 'status_badge.dart';

class HomeDashboard extends ConsumerWidget {
  const HomeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Banner
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withAlpha(50),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back, ${user?.name ?? 'Resident'}!',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Shantiniketan Apartment Society • ${user?.flatNumber != null ? 'Flat ${user!.flatNumber} • ' : ''}${user?.role ?? 'Resident'}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.verified_user, color: Colors.white, size: 32),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            'OneSociety Modules',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),

          // 5 Module Cards Grid
          LayoutBuilder(
            builder: (context, constraints) {
              final crossAxisCount = constraints.maxWidth > 1100
                  ? 3
                  : constraints.maxWidth > 700
                      ? 2
                      : 1;

              return GridView.count(
                crossAxisCount: crossAxisCount,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.5,
                children: [
                  _moduleCard(
                    context,
                    title: 'Smart Complaints',
                    subtitle: 'Report common-area issues with AI triage, track status (#C1024), assign providers.',
                    icon: Icons.report_problem,
                    color: const Color(0xFFEF4444),
                    route: '/complaints',
                    badge: 'Module 4',
                  ),
                  _moduleCard(
                    context,
                    title: 'Society Help & Visitors',
                    subtitle: 'Visitor single-use QR passes, unexpected entry approval, and monthly maintenance bills.',
                    icon: Icons.shield,
                    color: const Color(0xFF0D9488),
                    route: '/society-help',
                    badge: 'Module 5',
                  ),
                  _moduleCard(
                    context,
                    title: 'Service Hub',
                    subtitle: 'Hire verified housemaids with dedicated modules, book tutors, and verify credentials.',
                    icon: Icons.handyman,
                    color: const Color(0xFF3B82F6),
                    route: '/service-hub',
                    badge: 'Module 3',
                  ),
                  _moduleCard(
                    context,
                    title: 'Share & Rent',
                    subtitle: 'Peer-to-peer item rentals among verified neighbors. Simulated escrow & deposit settlement.',
                    icon: Icons.swap_horiz,
                    color: const Color(0xFF8B5CF6),
                    route: '/share-rent',
                    badge: 'Module 2',
                  ),
                  _moduleCard(
                    context,
                    title: 'Group Buying',
                    subtitle: 'Pool society demand for bulk tiered prices. Escrow hold, gate manifest QR verification.',
                    icon: Icons.shopping_basket,
                    color: const Color(0xFFF59E0B),
                    route: '/group-buying',
                    badge: 'Module 1',
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _moduleCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String route,
    required String badge,
  }) {
    return AppCard(
      onTap: () => context.go(route),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              StatusBadge(status: badge),
            ],
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Open Module',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.arrow_forward, size: 14, color: color),
            ],
          ),
        ],
      ),
    );
  }
}
