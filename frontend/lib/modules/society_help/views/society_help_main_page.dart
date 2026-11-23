import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'visitor_management_page.dart';
import 'maintenance_page.dart';

class SocietyHelpMainPage extends ConsumerStatefulWidget {
  const SocietyHelpMainPage({super.key});

  @override
  ConsumerState<SocietyHelpMainPage> createState() => _SocietyHelpMainPageState();
}

class _SocietyHelpMainPageState extends ConsumerState<SocietyHelpMainPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isSecurity = auth.user?.role == 'Security Personnel';

    // Security personnel cannot see financial / maintenance tabs
    if (isSecurity) {
      return const VisitorManagementPage();
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: AppColors.secondary,
            unselectedLabelColor: AppColors.textSecondary,
            indicatorColor: AppColors.secondary,
            tabs: const [
              Tab(
                icon: Icon(Icons.shield_outlined, size: 18),
                text: 'Visitor Gate & Passes',
              ),
              Tab(
                icon: Icon(Icons.account_balance_wallet_outlined, size: 18),
                text: 'Maintenance & Financial Ledger',
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          VisitorManagementPage(),
          MaintenancePage(),
        ],
      ),
    );
  }
}
