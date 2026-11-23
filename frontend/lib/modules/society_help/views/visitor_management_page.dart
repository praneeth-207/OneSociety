import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/qr_view_dialog.dart';
import '../providers/society_help_provider.dart';
import '../models/visitor_model.dart';

class VisitorManagementPage extends ConsumerStatefulWidget {
  const VisitorManagementPage({super.key});

  @override
  ConsumerState<VisitorManagementPage> createState() => _VisitorManagementPageState();
}

class _VisitorManagementPageState extends ConsumerState<VisitorManagementPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _tokenController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(societyHelpProvider.notifier).fetchVisitorPasses();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isSecurity = auth.user?.role == 'Security Personnel';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            color: Colors.white,
            child: Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 16,
              runSpacing: 12,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isSecurity ? 'Gate Security & Visitor Verification' : 'Visitor Pass Management',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isSecurity
                          ? 'Scan visitor QR passes or approve unexpected gate arrivals'
                          : 'Generate pre-planned QR passes for your guests, deliveries, and cabs',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                if (!isSecurity)
                  ElevatedButton.icon(
                    onPressed: () => _showCreatePassDialog(context),
                    icon: const Icon(Icons.qr_code, size: 18),
                    label: const Text('Generate QR Pass'),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Main Content
          Expanded(
            child: isSecurity ? _buildSecurityGateView() : _buildResidentPassesView(),
          ),
        ],
      ),
    );
  }

  Widget _buildResidentPassesView() {
    final state = ref.watch(societyHelpProvider);

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.passes.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.badge_outlined, size: 64, color: AppColors.textMuted),
            const SizedBox(height: 16),
            const Text(
              'No visitor passes generated yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Create a pass for guests, service workers, or deliveries',
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _showCreatePassDialog(context),
              icon: const Icon(Icons.add),
              label: const Text('Create Pre-Planned Pass'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: state.passes.length,
      itemBuilder: (context, index) {
        final pass = state.passes[index];
        return _buildPassCard(pass);
      },
    );
  }

  Widget _buildPassCard(VisitPassModel pass) {
    final dateFormat = DateFormat('dd MMM, hh:mm a');
    final isExpired = pass.isExpired;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  pass.visitorType == 'DELIVERY'
                      ? Icons.delivery_dining
                      : pass.visitorType == 'CAB'
                          ? Icons.local_taxi
                          : pass.visitorType == 'SERVICE'
                              ? Icons.build
                              : Icons.person,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          pass.visitorName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          status: pass.status == 'REVOKED'
                              ? 'REVOKED'
                              : isExpired
                                  ? 'EXPIRED'
                                  : pass.status,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${pass.visitorType} • Phone: ${pass.visitorPhone}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: () => _showQrModal(pass),
                icon: const Icon(Icons.qr_code_2, size: 18),
                label: Text(pass.passToken),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            children: [
              Text(
                'Valid: ${dateFormat.format(pass.validFrom)} – ${dateFormat.format(pass.validUntil)} (${pass.validityHours}h)',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const Spacer(),
              if (pass.status == 'ACTIVE' || pass.status == 'EXPIRED') ...[
                TextButton.icon(
                  onPressed: () => _renewPass(pass),
                  icon: const Icon(Icons.replay, size: 16),
                  label: const Text('Renew (Invalidates Old QR)'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _showQrModal(VisitPassModel pass) {
    showDialog(
      context: context,
      builder: (context) => QrViewDialog(
        title: 'Visitor Gate Pass: ${pass.visitorName}',
        qrData: pass.passToken,
        tokenLabel: 'Token: ${pass.passToken} (${pass.visitorType})',
      ),
    );
  }

  Future<void> _renewPass(VisitPassModel pass) async {
    final success = await ref.read(societyHelpProvider.notifier).renewPass(pass.id, 2);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pass renewed! Previous pass token has been revoked.')),
      );
    }
  }

  Widget _buildSecurityGateView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section 1: Verify & Admit Pass
          AppCard(
            title: 'Verify Visitor Gate Pass',
            subtitle: 'Scan pass QR code with mobile camera or enter pass token manually',
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _tokenController,
                        textCapitalization: TextCapitalization.characters,
                        decoration: const InputDecoration(
                          hintText: 'Enter Pass Token (e.g. VP-A1B2C3D4)',
                          prefixIcon: Icon(Icons.qr_code_scanner),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      ),
                      onPressed: _handleTokenVerification,
                      child: const Text('Verify & Admit'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Section 2: Unexpected Visitor Arrival
          AppCard(
            title: 'Log Unexpected Visitor at Gate',
            subtitle: 'Sends an instant real-time notification to the resident for entry approval',
            child: _UnexpectedVisitorForm(),
          ),
        ],
      ),
    );
  }

  Future<void> _handleTokenVerification() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) return;

    final res = await ref.read(societyHelpProvider.notifier).verifyAndAdmitPass(token);
    if (!mounted) return;

    if (res != null && res['success'] == true) {
      _tokenController.clear();
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 48),
          title: const Text('Visitor Verified & Admitted'),
          content: Text(res['message'] ?? 'Entry recorded.'),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    } else {
      final state = ref.read(societyHelpProvider);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.error,
          content: Text(state.errorMessage ?? 'Verification failed'),
        ),
      );
    }
  }

  void _showCreatePassDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => const _CreatePassDialog(),
    );
  }
}

class _UnexpectedVisitorForm extends ConsumerStatefulWidget {
  @override
  ConsumerState<_UnexpectedVisitorForm> createState() => _UnexpectedVisitorFormState();
}

class _UnexpectedVisitorFormState extends ConsumerState<_UnexpectedVisitorForm> {
  final _formKey = GlobalKey<FormState>();
  final _flatController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _purposeController = TextEditingController();
  final _vehicleController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _flatController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _purposeController.dispose();
    _vehicleController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final success = await ref.read(societyHelpProvider.notifier).createUnexpectedRequest(
          flatNumber: _flatController.text.trim(),
          visitorName: _nameController.text.trim(),
          visitorPhone: _phoneController.text.trim(),
          purpose: _purposeController.text.trim(),
          vehicleNumber: _vehicleController.text.trim(),
        );

    setState(() => _isSubmitting = false);
    if (success && mounted) {
      _flatController.clear();
      _nameController.clear();
      _phoneController.clear();
      _purposeController.clear();
      _vehicleController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Approval request sent to resident!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _flatController,
                  decoration: const InputDecoration(labelText: 'Flat Number (e.g. A-101)'),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Visitor Name'),
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'Visitor Phone'),
                  validator: (val) => val == null || val.length < 10 ? 'Enter 10-digit number' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _vehicleController,
                  decoration: const InputDecoration(labelText: 'Vehicle Number (Optional)'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _purposeController,
            decoration: const InputDecoration(labelText: 'Purpose of Visit'),
            validator: (val) => val == null || val.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _submit,
              icon: const Icon(Icons.send),
              label: const Text('Send Approval Request to Resident'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CreatePassDialog extends ConsumerStatefulWidget {
  const _CreatePassDialog();

  @override
  ConsumerState<_CreatePassDialog> createState() => _CreatePassDialogState();
}

class _CreatePassDialogState extends ConsumerState<_CreatePassDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _visitorType = 'GUEST';
  int _validityHours = 2;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final pass = await ref.read(societyHelpProvider.notifier).createPass(
          visitorName: _nameController.text.trim(),
          visitorPhone: _phoneController.text.trim(),
          visitorType: _visitorType,
          passType: 'INDIVIDUAL',
          validityHours: _validityHours,
        );

    if (pass != null && mounted) {
      Navigator.pop(context);
      showDialog(
        context: context,
        builder: (context) => QrViewDialog(
          title: 'Pass Created: ${pass.visitorName}',
          qrData: pass.passToken,
          tokenLabel: 'Token: ${pass.passToken} (Valid ${_validityHours}h)',
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Generate Pre-Planned QR Pass'),
      content: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Visitor / Delivery Name'),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Visitor Phone Number'),
                validator: (val) => val == null || val.length < 10 ? 'Enter valid phone' : null,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _visitorType,
                decoration: const InputDecoration(labelText: 'Visitor Category'),
                items: const [
                  DropdownMenuItem(value: 'GUEST', child: Text('Guest / Friend / Family')),
                  DropdownMenuItem(value: 'DELIVERY', child: Text('Delivery Partner')),
                  DropdownMenuItem(value: 'CAB', child: Text('Cab / Taxi')),
                  DropdownMenuItem(value: 'SERVICE', child: Text('Service / Repair Technician')),
                ],
                onChanged: (val) => setState(() => _visitorType = val!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: _validityHours,
                decoration: const InputDecoration(labelText: 'Pass Validity Duration'),
                items: const [
                  DropdownMenuItem(value: 1, child: Text('1 Hour Validity')),
                  DropdownMenuItem(value: 2, child: Text('2 Hours Validity')),
                  DropdownMenuItem(value: 4, child: Text('4 Hours Validity')),
                ],
                onChanged: (val) => setState(() => _validityHours = val!),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('Generate Pass'),
        ),
      ],
    );
  }
}
