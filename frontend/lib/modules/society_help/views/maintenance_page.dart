import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/simulated_badge.dart';
import '../providers/society_help_provider.dart';
import '../models/maintenance_model.dart';

class MaintenancePage extends ConsumerStatefulWidget {
  const MaintenancePage({super.key});

  @override
  ConsumerState<MaintenancePage> createState() => _MaintenancePageState();
}

class _MaintenancePageState extends ConsumerState<MaintenancePage> {
  final String _selectedMonth = DateFormat('yyyy-MM').format(DateTime.now());

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(societyHelpProvider.notifier).fetchMaintenanceOverview(_selectedMonth);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isPresident = auth.user?.role == 'President';
    final state = ref.watch(societyHelpProvider);

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
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: const [
                        Text(
                          'Society Maintenance & Finances',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        SimulatedBadge(),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isPresident
                          ? 'Manage society monthly dues, expense ledger, and carry-forward balance sheet'
                          : 'View and pay your flat maintenance bills with instant receipt verification',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                if (isPresident)
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _showGenerateBillsDialog(context),
                        icon: const Icon(Icons.receipt_long, size: 18),
                        label: const Text('Generate Bills (All Flats)'),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => _closeMonth(context),
                        icon: const Icon(Icons.calculate, size: 18),
                        label: const Text('Close Month & Carry Forward'),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Main View
          Expanded(
            child: state.isLoading
                ? const Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Carry-Forward Summary Cards
                        _buildFinancialSummaryCards(state.summary),
                        const SizedBox(height: 24),

                        // Bills Section
                        _buildBillsSection(state.bills, isPresident),
                        const SizedBox(height: 24),

                        // Expenses Section (Visible to President)
                        if (isPresident) _buildExpensesSection(state.expenses),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialSummaryCards(MaintMonthlySummaryModel? summary) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return Row(
      children: [
        Expanded(
          child: _summaryMetricCard(
            title: 'Opening Balance (Carried Forward)',
            amount: currency.format(summary?.openingBalance ?? 0),
            icon: Icons.account_balance,
            color: const Color(0xFF3B82F6),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _summaryMetricCard(
            title: 'Actual Collections (This Month)',
            amount: currency.format(summary?.actualCollections ?? 0),
            icon: Icons.trending_up,
            color: const Color(0xFF10B981),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _summaryMetricCard(
            title: 'Total Expenses (This Month)',
            amount: currency.format(summary?.totalExpenses ?? 0),
            icon: Icons.trending_down,
            color: const Color(0xFFEF4444),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _summaryMetricCard(
            title: 'Closing Balance (Carry Forward)',
            amount: currency.format(summary?.closingBalance ?? 0),
            icon: Icons.savings,
            color: const Color(0xFF8B5CF6),
          ),
        ),
      ],
    );
  }

  Widget _summaryMetricCard({
    required String title,
    required String amount,
    required IconData icon,
    required Color color,
  }) {
    return AppCard(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withAlpha(25),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 4),
                Text(
                  amount,
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillsSection(List<MaintBillModel> bills, bool isPresident) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return AppCard(
      title: isPresident ? 'Flat Dues & Collection Roster' : 'My Flat Maintenance Bill',
      subtitle: 'Billing Month: $_selectedMonth',
      child: bills.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No maintenance bills generated for this month yet.'),
              ),
            )
          : ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: bills.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final bill = bills[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withAlpha(20),
                    child: Text(
                      bill.flatNumber,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ),
                  title: Text(
                    'Flat ${bill.flatNumber} • ${bill.residentName ?? "Resident"}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    'Due: ${DateFormat('dd MMM yyyy').format(bill.dueDate)} • Method: ${bill.paymentMethod ?? "Unpaid"}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        currency.format(bill.amount),
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 12),
                      StatusBadge(status: bill.status),
                      const SizedBox(width: 12),
                      if (!bill.isPaid)
                        ElevatedButton(
                          onPressed: () => _payBill(bill),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                          child: const Text('Pay [SIMULATED]'),
                        )
                      else if (bill.receiptNumber != null)
                        OutlinedButton(
                          onPressed: () => _showReceipt(bill),
                          child: const Text('Receipt'),
                        ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _buildExpensesSection(List<MaintExpenseModel> expenses) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return AppCard(
      title: 'Society Expenditures Ledger',
      subtitle: 'Approved common area maintenance, security, and utility expenses',
      child: expenses.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No expenses recorded for this month.'),
              ),
            )
          : ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: expenses.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final exp = expenses[index];
                return ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.error.withAlpha(20),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.receipt, color: AppColors.error, size: 20),
                  ),
                  title: Text(exp.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('${exp.category} • Vendor: ${exp.vendorName ?? "Internal"}'),
                  trailing: Text(
                    currency.format(exp.amount),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.error,
                    ),
                  ),
                );
              },
            ),
    );
  }

  Future<void> _payBill(MaintBillModel bill) async {
    final success = await ref.read(societyHelpProvider.notifier).payBillSimulated(bill.id, _selectedMonth);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF10B981),
          content: Text('Payment simulated successfully! Receipt generated.'),
        ),
      );
    }
  }

  void _showReceipt(MaintBillModel bill) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Maintenance Payment Receipt'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Receipt Number: ${bill.receiptNumber}'),
            const SizedBox(height: 6),
            Text('Flat: ${bill.flatNumber}'),
            const SizedBox(height: 6),
            Text('Month: ${bill.billingMonth}'),
            const SizedBox(height: 6),
            Text('Amount Paid: ₹${bill.amount.toStringAsFixed(0)} [SIMULATED]'),
            const SizedBox(height: 6),
            Text('Payment Method: ${bill.paymentMethod}'),
            const SizedBox(height: 6),
            Text('Paid On: ${bill.paidAt != null ? DateFormat('dd MMM yyyy, hh:mm a').format(bill.paidAt!) : "-"}'),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _closeMonth(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Close Month & Carry Forward'),
        content: const Text(
          'This will compute:\n\n'
          'Available Balance = Opening Balance + Actual Collections\n'
          'Closing Balance = Available Balance - Total Expenses\n\n'
          'The closing balance will be locked and carried forward to next month.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm Close')),
        ],
      ),
    );

    if (confirm == true) {
      await ref.read(societyHelpProvider.notifier).closeOrSummarizeMonth(_selectedMonth);
    }
  }

  void _showGenerateBillsDialog(BuildContext context) {
    final amountController = TextEditingController(text: '2500');
    final dueDateController = TextEditingController(text: '2026-11-30');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate Monthly Maintenance Bills'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount per Flat (₹)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: dueDateController,
              decoration: const InputDecoration(labelText: 'Due Date (YYYY-MM-DD)'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text) ?? 2500.0;
              Navigator.pop(context);
              await ref.read(societyHelpProvider.notifier).generateBills(_selectedMonth, amount, dueDateController.text);
            },
            child: const Text('Generate'),
          ),
        ],
      ),
    );
  }
}
