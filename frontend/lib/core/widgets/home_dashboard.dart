import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../theme/app_theme.dart';
import 'app_card.dart';

class HomeDashboard extends ConsumerWidget {
  const HomeDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
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
                  child: const Icon(Icons.verified_user, color: Colors.white, size: 30),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          const Text(
            'Society Services',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),

          // 5 Feature Cards Grid
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
                childAspectRatio: crossAxisCount == 1 ? 2.0 : 1.45,
                children: [
                  _serviceCard(
                    context,
                    title: 'Smart Complaints',
                    subtitle: 'Report maintenance issues with automated assignment, status tracking, and resident verification.',
                    icon: Icons.report_problem,
                    color: const Color(0xFFEF4444),
                    route: '/complaints',
                  ),
                  _serviceCard(
                    context,
                    title: 'Society Help & Visitors',
                    subtitle: 'Generate guest QR gate passes, unexpected visitor approval, and pay flat maintenance bills.',
                    icon: Icons.shield,
                    color: const Color(0xFF0D9488),
                    route: '/society-help',
                  ),
                  _serviceCard(
                    context,
                    title: 'Service Hub',
                    subtitle: 'Book verified housemaids with dedicated daily slots, electricians, tutors, and plumbers.',
                    icon: Icons.handyman,
                    color: const Color(0xFF3B82F6),
                    route: '/service-hub',
                  ),
                  _serviceCard(
                    context,
                    title: 'Share & Rent',
                    subtitle: 'Peer-to-peer household item rentals with neighbors, secured by simulated escrow deposits.',
                    icon: Icons.swap_horiz,
                    color: const Color(0xFF8B5CF6),
                    route: '/share-rent',
                  ),
                  _serviceCard(
                    context,
                    title: 'Group Buying Deals',
                    subtitle: 'Pool society bulk demand for volume discounts, truck gate delivery, and price drops.',
                    icon: Icons.shopping_basket,
                    color: const Color(0xFFF59E0B),
                    route: '/group-buying',
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _serviceCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String route,
  }) {
    return AppCard(
      onTap: () => context.go(route),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Expanded(
            child: Text(
              subtitle,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                height: 1.35,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                'Open',
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
