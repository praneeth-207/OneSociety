import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/simulated_badge.dart';
import '../../../core/widgets/qr_view_dialog.dart';
import '../providers/share_rent_provider.dart';
import '../models/share_rent_model.dart';

class ShareRentPage extends ConsumerStatefulWidget {
  const ShareRentPage({super.key});

  @override
  ConsumerState<ShareRentPage> createState() => _ShareRentPageState();
}

class _ShareRentPageState extends ConsumerState<ShareRentPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(shareRentProvider.notifier).fetchItems();
      ref.read(shareRentProvider.notifier).fetchMyRentals();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Text(
                      'Share & Rent',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(width: 8),
                    SimulatedBadge(),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'Peer-to-peer item sharing, tools & appliance rentals with escrow deposit security',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  tabs: const [
                    Tab(text: 'Community Marketplace'),
                    Tab(text: 'My Rentals & Escrow Dashboard'),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMarketplaceView(),
                _buildRentalsDashboardView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMarketplaceView() {
    final state = ref.watch(shareRentProvider);
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Available Items in Society',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () => _showListItemDialog(context),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('List My Item for Rent'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.items.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(48),
                child: Text('No items listed for rent yet. Be the first to share an item!'),
              ),
            )
          else
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 380,
                mainAxisExtent: 260,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: state.items.length,
              itemBuilder: (context, index) {
                final item = state.items[index];
                return AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(20),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.inventory_2, color: AppColors.primary, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.title,
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  'Owner: ${item.ownerName} (Flat ${item.ownerFlatNumber})',
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        item.description.isNotEmpty ? item.description : 'Available for peer sharing',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      const Divider(height: 16),
                      Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${currency.format(item.dailyRate)} / day',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              Text(
                                'Deposit: ${currency.format(item.securityDeposit)}',
                                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                          const Spacer(),
                          ElevatedButton(
                            onPressed: () => _showRentRequestDialog(context, item),
                            child: const Text('Rent Item'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildRentalsDashboardView() {
    final state = ref.watch(shareRentProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Items I am Borrowing',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          if (state.borrowedRentals.isEmpty)
            const Text('You have not rented any items.')
          else
            ...state.borrowedRentals.map((r) => _buildRentalCard(r, isBorrower: true)),
          const SizedBox(height: 32),
          const Text(
            'My Listed Items Out on Rent',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          if (state.ownedRentals.isEmpty)
            const Text('None of your items are currently requested or out on rent.')
          else
            ...state.ownedRentals.map((r) => _buildRentalCard(r, isBorrower: false)),
        ],
      ),
    );
  }

  Widget _buildRentalCard(SRRentalModel rental, {required bool isBorrower}) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return AppCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 6,
            children: [
              Wrap(
                spacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    rental.rentalId,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  StatusBadge(status: rental.status),
                ],
              ),
              Text(
                'Total: ${currency.format(rental.totalAmount)} (Deposit: ${currency.format(rental.securityDeposit)})',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const Divider(height: 20),
          Text(
            rental.itemTitle,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            isBorrower
                ? 'Owner: ${rental.ownerName} (Flat ${rental.ownerFlatNumber})'
                : 'Borrower: ${rental.borrowerName} (Flat ${rental.borrowerFlatNumber})',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            'Duration: ${rental.startDate} to ${rental.endDate} (${rental.rentalDays} days) • Rent: ${currency.format(rental.rentalFee)}',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          // Actions according to 6-card lifecycle
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              if (isBorrower) ...[
                if (rental.status == 'APPROVED')
                  ElevatedButton(
                    onPressed: () => ref.read(shareRentProvider.notifier).checkoutRental(rental.rentalId),
                    child: const Text('Checkout & Pay Escrow [SIMULATED]'),
                  )
                else if (rental.status == 'CHECKOUT' && rental.handoverToken != null)
                  OutlinedButton.icon(
                    onPressed: () => _showTokenModal(rental),
                    icon: const Icon(Icons.qr_code),
                    label: Text('Pickup Token: ${rental.handoverToken}'),
                  ),
              ] else ...[
                if (rental.status == 'REQUESTED')
                  ElevatedButton(
                    onPressed: () => ref.read(shareRentProvider.notifier).approveRental(rental.rentalId),
                    child: const Text('Approve Request'),
                  )
                else if (rental.status == 'CHECKOUT')
                  ElevatedButton(
                    onPressed: () => _showHandoverVerifyDialog(rental),
                    child: const Text('Verify Handover Token at Pickup'),
                  )
                else if (rental.status == 'IN_USE')
                  ElevatedButton.icon(
                    onPressed: () => _showReturnInspectionDialog(rental),
                    icon: const Icon(Icons.fact_check),
                    label: const Text('Return Inspection Checklist'),
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _showTokenModal(SRRentalModel rental) {
    showDialog(
      context: context,
      builder: (context) => QrViewDialog(
        title: 'Item Pickup Token: ${rental.itemTitle}',
        qrData: rental.handoverToken ?? '',
        tokenLabel: 'Token: ${rental.handoverToken}',
      ),
    );
  }

  void _showHandoverVerifyDialog(SRRentalModel rental) {
    final tokenController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Item Handover'),
        content: TextField(
          controller: tokenController,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Enter Borrower Pickup Token (e.g. SR-PASS-...)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(shareRentProvider.notifier).confirmHandover(rental.rentalId, tokenController.text);
            },
            child: const Text('Confirm Handover'),
          ),
        ],
      ),
    );
  }

  void _showReturnInspectionDialog(SRRentalModel rental) {
    String selectedCondition = 'GOOD';
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Return Inspection Checklist'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Inspect item condition upon borrower return:'),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: selectedCondition,
                decoration: const InputDecoration(labelText: 'Condition'),
                items: const [
                  DropdownMenuItem(value: 'GOOD', child: Text('Good (Full deposit refund)')),
                  DropdownMenuItem(value: 'MINOR_WEAR', child: Text('Minor Wear (Normal use)')),
                  DropdownMenuItem(value: 'DAMAGED', child: Text('Damaged (Raise Dispute)')),
                ],
                onChanged: (val) => setDialogState(() => selectedCondition = val!),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(labelText: 'Inspection Notes / Defect Details'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await ref.read(shareRentProvider.notifier).returnInspection(
                      rental.rentalId,
                      selectedCondition,
                      notesController.text.trim(),
                      selectedCondition == 'DAMAGED' ? notesController.text.trim() : null,
                    );
              },
              child: const Text('Submit Inspection'),
            ),
          ],
        ),
      ),
    );
  }

  void _showListItemDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    final rateController = TextEditingController(text: '100');
    final depController = TextEditingController(text: '1000');
    String category = 'TOOLS';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('List Item for Community Renting'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Item Title')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(labelText: 'Category'),
                items: const [
                  DropdownMenuItem(value: 'TOOLS', child: Text('Tools & Hardware')),
                  DropdownMenuItem(value: 'APPLIANCES', child: Text('Home Appliances')),
                  DropdownMenuItem(value: 'CAMPING', child: Text('Camping & Outdoor')),
                  DropdownMenuItem(value: 'ELECTRONICS', child: Text('Electronics & Audio')),
                  DropdownMenuItem(value: 'GAMES_BOOKS', child: Text('Board Games & Books')),
                ],
                onChanged: (val) => category = val!,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: rateController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Daily Rent (₹)'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: depController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Security Deposit (₹)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(controller: descController, decoration: const InputDecoration(labelText: 'Description / Usage Rules')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(shareRentProvider.notifier).createItem(
                    title: titleController.text.trim(),
                    category: category,
                    description: descController.text.trim(),
                    dailyRate: double.tryParse(rateController.text) ?? 100,
                    securityDeposit: double.tryParse(depController.text) ?? 1000,
                  );
            },
            child: const Text('List Item'),
          ),
        ],
      ),
    );
  }

  void _showRentRequestDialog(BuildContext context, SRItemModel item) {
    final startController = TextEditingController(text: DateFormat('yyyy-MM-dd').format(DateTime.now()));
    final endController = TextEditingController(
      text: DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 2))),
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Rent: ${item.title}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Daily Rate: ₹${item.dailyRate.toStringAsFixed(0)}'),
            Text('Refundable Security Deposit: ₹${item.securityDeposit.toStringAsFixed(0)}'),
            const SizedBox(height: 16),
            TextField(controller: startController, decoration: const InputDecoration(labelText: 'Start Date (YYYY-MM-DD)')),
            const SizedBox(height: 12),
            TextField(controller: endController, decoration: const InputDecoration(labelText: 'End Date (YYYY-MM-DD)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(shareRentProvider.notifier).requestRental(
                    item.id,
                    startController.text.trim(),
                    endController.text.trim(),
                  );
            },
            child: const Text('Submit Rental Request'),
          ),
        ],
      ),
    );
  }
}
