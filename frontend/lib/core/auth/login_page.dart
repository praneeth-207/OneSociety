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
  final _phoneController = TextEditingController(text: '9876543210');
  final _passwordController = TextEditingController(text: 'password123');
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _quickFill(String phone, String password) {
    setState(() {
      _phoneController.text = phone;
      _passwordController.text = password;
    });
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).login(
          _phoneController.text,
          _passwordController.text,
        );

    if (success && mounted) {
      final auth = ref.read(authProvider);
      if (auth.mustChangePassword) {
        context.go('/change-password');
      } else {
        context.go('/');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final lang = ref.watch(languageProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 460),
            child: AppCard(
              padding: const EdgeInsets.all(32),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(16),
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
                    const SizedBox(height: 28),
                    if (authState.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.error.withAlpha(80)),
                        ),
                        child: Text(
                          authState.errorMessage!,
                          style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number / Mobile',
                        hintText: 'Enter 10-digit mobile number',
                        prefixIcon: Icon(Icons.phone_android_outlined),
                      ),
                      validator: (val) => val == null || val.trim().length < 10 ? 'Enter valid phone number' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: InputDecoration(
                        labelText: AppStrings.get('password', lang),
                        prefixIcon: const Icon(Icons.lock_outline),
                      ),
                      validator: (val) => val == null || val.length < 6 ? 'Password min 6 chars' : null,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: authState.isLoading ? null : _handleLogin,
                      child: authState.isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(AppStrings.get('login', lang)),
                    ),
                    const SizedBox(height: 28),
                    const Divider(),
                    const SizedBox(height: 12),
                    const Text(
                      'Quick Demo Login Credentials (Phone / Password):',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _demoButton('President (9876543210)', '9876543210', 'password123'),
                        _demoButton('Rahul - Res (9876543211)', '9876543211', 'password123'),
                        _demoButton('Amrutha - Res (9876543212)', '9876543212', 'password123'),
                        _demoButton('Guard - Gate (9876543220)', '9876543220', 'password123'),
                        _demoButton('Provider - Temp (9876543230)', '9876543230', 'password123'),
                        _demoButton('Supplier (9876543240)', '9876543240', 'password123'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _demoButton(String label, String phone, String password) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        textStyle: const TextStyle(fontSize: 11),
      ),
      onPressed: () => _quickFill(phone, password),
      child: Text(label),
    );
  }
}
