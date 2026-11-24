import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../auth/auth_provider.dart';
import '../theme/app_theme.dart';
import '../i18n/app_strings.dart';
import '../widgets/app_card.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  int _selectedTab = 0; // 0 = Role Profiles, 1 = Manual Sign-In

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loginWithCredentials(String identifier, String password) async {
    final success = await ref.read(authProvider.notifier).login(identifier, password);
    if (success && mounted) {
      final auth = ref.read(authProvider);
      if (auth.mustChangePassword) {
        context.go('/change-password');
      } else {
        context.go('/');
      }
    }
  }

  Future<void> _handleManualLogin() async {
    if (!_formKey.currentState!.validate()) return;
    await _loginWithCredentials(
      _identifierController.text.trim(),
      _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final lang = ref.watch(languageProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: AppCard(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Logo & Title
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withAlpha(50),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.apartment, color: Colors.white, size: 36),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      AppStrings.get('app_name', lang),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      AppStrings.get('app_tagline', lang),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Error Notification
                    if (authState.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.error.withAlpha(80)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Color(0xFF991B1B), size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                authState.errorMessage!,
                                style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Segmented Selector: Profiles vs Direct Sign-In
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: _tabButton(
                              title: 'Choose Role',
                              icon: Icons.badge_outlined,
                              isSelected: _selectedTab == 0,
                              onTap: () => setState(() => _selectedTab = 0),
                            ),
                          ),
                          Expanded(
                            child: _tabButton(
                              title: 'Custom Sign-In',
                              icon: Icons.login_outlined,
                              isSelected: _selectedTab == 1,
                              onTap: () => setState(() => _selectedTab = 1),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Tab View
                    if (_selectedTab == 0) ...[
                      // Role Profiles (Separate 1-click logins, NO raw phone numbers)
                      const Text(
                        'Select your role to sign in directly:',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _roleProfileCard(
                        title: 'Resident',
                        subtitle: 'Rahul Sharma • Flat A-101',
                        icon: Icons.home_outlined,
                        color: const Color(0xFF2563EB),
                        phone: '9876543211',
                        password: 'password123',
                        isLoading: authState.isLoading,
                      ),
                      const SizedBox(height: 8),
                      _roleProfileCard(
                        title: 'Society President',
                        subtitle: 'Management, Finances & Approvals',
                        icon: Icons.admin_panel_settings_outlined,
                        color: const Color(0xFF7C3AED),
                        phone: '9876543210',
                        password: 'password123',
                        isLoading: authState.isLoading,
                      ),
                      const SizedBox(height: 8),
                      _roleProfileCard(
                        title: 'Gate Security Guard',
                        subtitle: 'Visitor Pass Verification & Gate Logs',
                        icon: Icons.shield_outlined,
                        color: const Color(0xFF0D9488),
                        phone: '9876543220',
                        password: 'password123',
                        isLoading: authState.isLoading,
                      ),
                      const SizedBox(height: 8),
                      _roleProfileCard(
                        title: 'Service Provider',
                        subtitle: 'Ramesh • Verified Electrician',
                        icon: Icons.handyman_outlined,
                        color: const Color(0xFFD97706),
                        phone: '9876543230',
                        password: 'password123',
                        isLoading: authState.isLoading,
                      ),
                      const SizedBox(height: 8),
                      _roleProfileCard(
                        title: 'Society Supplier',
                        subtitle: 'Fresh Farms • Group Bulk Deals',
                        icon: Icons.local_shipping_outlined,
                        color: const Color(0xFF059669),
                        phone: '9876543240',
                        password: 'password123',
                        isLoading: authState.isLoading,
                      ),
                    ] else ...[
                      // Direct Manual Sign-In Form
                      Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _identifierController,
                              keyboardType: TextInputType.text,
                              decoration: const InputDecoration(
                                labelText: 'Mobile Number or Email',
                                hintText: 'Enter registered mobile or email',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                              validator: (val) => val == null || val.trim().isEmpty
                                  ? 'Please enter mobile number or email'
                                  : null,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: true,
                              decoration: InputDecoration(
                                labelText: AppStrings.get('password', lang),
                                prefixIcon: const Icon(Icons.lock_outline),
                              ),
                              validator: (val) =>
                                  val == null || val.length < 6 ? 'Password min 6 chars' : null,
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: authState.isLoading ? null : _handleManualLogin,
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                              ),
                              child: authState.isLoading
                                  ? const SizedBox(
                                      height: 20,
                                      width: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(
                                      AppStrings.get('login', lang),
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _tabButton({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withAlpha(12),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                title,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? AppColors.primary : AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _roleProfileCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String phone,
    required String password,
    required bool isLoading,
  }) {
    return InkWell(
      onTap: isLoading ? null : () => _loginWithCredentials(phone, password),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 14, color: color),
          ],
        ),
      ),
    );
  }
}
