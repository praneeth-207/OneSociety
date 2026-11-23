import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../i18n/app_strings.dart';
import '../auth/auth_provider.dart';
import '../theme/app_theme.dart';
import 'status_badge.dart';

class ResponsiveScaffold extends ConsumerWidget {
  final Widget body;
  final String currentRoute;

  const ResponsiveScaffold({
    super.key,
    required this.body,
    required this.currentRoute,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(languageProvider);
    final authState = ref.watch(authProvider);
    final user = authState.user;

    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 900;

    final navItems = [
      _NavItem(
        route: '/',
        label: AppStrings.get('nav_home', lang),
        icon: Icons.dashboard_outlined,
        selectedIcon: Icons.dashboard,
      ),
      _NavItem(
        route: '/complaints',
        label: AppStrings.get('nav_complaints', lang),
        icon: Icons.report_problem_outlined,
        selectedIcon: Icons.report_problem,
      ),
      _NavItem(
        route: '/society-help',
        label: AppStrings.get('nav_society_help', lang),
        icon: Icons.shield_outlined,
        selectedIcon: Icons.shield,
      ),
      _NavItem(
        route: '/service-hub',
        label: AppStrings.get('nav_service_hub', lang),
        icon: Icons.handyman_outlined,
        selectedIcon: Icons.handyman,
      ),
      _NavItem(
        route: '/share-rent',
        label: AppStrings.get('nav_share_rent', lang),
        icon: Icons.swap_horiz_outlined,
        selectedIcon: Icons.swap_horiz,
      ),
      _NavItem(
        route: '/group-buying',
        label: AppStrings.get('nav_group_buying', lang),
        icon: Icons.shopping_basket_outlined,
        selectedIcon: Icons.shopping_basket,
      ),
    ];

    int selectedIndex = navItems.indexWhere((item) => item.route == currentRoute);
    if (selectedIndex == -1) selectedIndex = 0;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.apartment, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              AppStrings.get('app_name', lang),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
            if (user?.flatNumber != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Flat ${user!.flatNumber}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          // Language selector
          PopupMenuButton<AppLanguage>(
            tooltip: 'Language / भाषा / భాష',
            icon: const Icon(Icons.language, color: AppColors.textPrimary),
            onSelected: (selected) {
              ref.read(languageProvider.notifier).setLanguage(selected);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: AppLanguage.english,
                child: Text('English'),
              ),
              const PopupMenuItem(
                value: AppLanguage.hindi,
                child: Text('हिन्दी (Hindi)'),
              ),
              const PopupMenuItem(
                value: AppLanguage.telugu,
                child: Text('తెలుగు (Telugu)'),
              ),
            ],
          ),
          if (user != null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Center(
                child: StatusBadge(status: user.role),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.logout, color: AppColors.error),
              tooltip: AppStrings.get('logout', lang),
              onPressed: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) {
                  context.go('/login');
                }
              },
            ),
          ],
          const SizedBox(width: 12),
        ],
      ),
      drawer: !isDesktop
          ? Drawer(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  DrawerHeader(
                    decoration: const BoxDecoration(color: AppColors.primary),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          user?.name ?? 'User',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: const TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        StatusBadge(status: user?.role ?? 'Resident'),
                      ],
                    ),
                  ),
                  ...navItems.map(
                    (item) => ListTile(
                      leading: Icon(
                        item.route == currentRoute ? item.selectedIcon : item.icon,
                        color: item.route == currentRoute ? AppColors.primary : AppColors.textSecondary,
                      ),
                      title: Text(
                        item.label,
                        style: TextStyle(
                          fontWeight: item.route == currentRoute ? FontWeight.bold : FontWeight.normal,
                          color: item.route == currentRoute ? AppColors.primary : AppColors.textPrimary,
                        ),
                      ),
                      selected: item.route == currentRoute,
                      onTap: () {
                        Navigator.of(context).pop();
                        context.go(item.route);
                      },
                    ),
                  ),
                ],
              ),
            )
          : null,
      body: Row(
        children: [
          if (isDesktop)
            NavigationRail(
              selectedIndex: selectedIndex,
              onDestinationSelected: (idx) {
                context.go(navItems[idx].route);
              },
              labelType: NavigationRailLabelType.all,
              backgroundColor: Colors.white,
              selectedIconTheme: const IconThemeData(color: AppColors.primary),
              unselectedIconTheme: const IconThemeData(color: AppColors.textSecondary),
              selectedLabelTextStyle: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
              unselectedLabelTextStyle: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
              destinations: navItems
                  .map(
                    (item) => NavigationRailDestination(
                      icon: Icon(item.icon),
                      selectedIcon: Icon(item.selectedIcon),
                      label: Text(item.label),
                    ),
                  )
                  .toList(),
            ),
          if (isDesktop) const VerticalDivider(thickness: 1, width: 1, color: AppColors.border),
          Expanded(child: body),
        ],
      ),
      bottomNavigationBar: !isDesktop && navItems.length <= 5
          ? BottomNavigationBar(
              currentIndex: selectedIndex,
              onTap: (idx) => context.go(navItems[idx].route),
              type: BottomNavigationBarType.fixed,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textSecondary,
              items: navItems
                  .take(5)
                  .map(
                    (item) => BottomNavigationBarItem(
                      icon: Icon(item.icon),
                      activeIcon: Icon(item.selectedIcon),
                      label: item.label,
                    ),
                  )
                  .toList(),
            )
          : null,
    );
  }
}

class _NavItem {
  final String route;
  final String label;
  final IconData icon;
  final IconData selectedIcon;

  _NavItem({
    required this.route,
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });
}
