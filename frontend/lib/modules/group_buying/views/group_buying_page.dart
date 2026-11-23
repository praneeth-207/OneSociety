import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/simulated_badge.dart';
import '../../../core/widgets/qr_view_dialog.dart';
import '../providers/group_buying_provider.dart';
import '../models/group_buying_model.dart';

class GroupBuyingPage extends ConsumerStatefulWidget {
  const GroupBuyingPage({super.key});

  @override
  ConsumerState<GroupBuyingPage> createState() => _GroupBuyingPageState();
}

class _GroupBuyingPageState extends ConsumerState<GroupBuyingPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(groupBuyingProvider.notifier).fetchDeals();
      ref.read(groupBuyingProvider.notifier).fetchMyOrders();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final isSupplier = auth.user?.role == 'Supplier';
    final isSecurity = auth.user?.role == 'Security Personnel';

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
                      'Group Buying Deals',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(width: 8),
                    SimulatedBadge(),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'Tiered bulk buying deals: unlock lower prices as society neighbors pledge units together',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  labelColor: const Color(0xFFD97706),
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: const Color(0xFFD97706),
                  tabs: const [
                    Tab(text: 'Active Community Deals'),
                    Tab(text: 'My Pledges & Door Deliveries'),
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
                _buildDealsView(isSupplier, isSecurity),
                _buildOrdersView(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealsView(bool isSupplier, bool isSecurity) {
    final state = ref.watch(groupBuyingProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'Live Bulk Deals',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              if (isSupplier) ...[
                ElevatedButton.icon(
                  onPressed: () => _showCreateDealDialog(context),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Publish New Bulk Deal'),
                ),
              ] else if (isSecurity) ...[
                ElevatedButton.icon(
                  onPressed: () => _showScanManifestDialog(context),
                  icon: const Icon(Icons.qr_code_scanner, size: 18),
                  label: const Text('Verify Gate Manifest QR'),
                ),
              ],
            ],
          ),
          const SizedBox(height: 16),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.deals.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(48),
                child: Text('No active group buying deals at the moment.'),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: state.deals.length,
              itemBuilder: (context, index) {
                final deal = state.deals[index];
                return _buildDealCard(deal, isSupplier);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildDealCard(GBDealModel deal, bool isSupplier) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return AppCard(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withAlpha(25),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.shopping_basket, color: Color(0xFFD97706), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          deal.title,
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(status: deal.status),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Supplier: ${deal.supplierName} • Category: ${deal.category}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${currency.format(deal.currentPrice)} / ${deal.unit}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFD97706),
                    ),
                  ),
                  const Text('Current Effective Price', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Live Progress Bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Pledged: ${deal.currentTotalQty} / ${deal.minTargetQty} ${deal.unit}s to activate deal',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  Text(
                    '${(deal.progressPercentage * 100).toInt()}% Target Met',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: deal.progressPercentage,
                  minHeight: 10,
                  backgroundColor: const Color(0xFFE2E8F0),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFD97706)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Tier Badges
          Row(
            children: deal.tiers.map((t) {
              final isUnlocked = deal.currentTotalQty >= t.minQty;
              return Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isUnlocked ? const Color(0xFFD97706).withAlpha(20) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isUnlocked ? const Color(0xFFD97706) : AppColors.border,
                  ),
                ),
                child: Text(
                  '${t.minQty}+ ${deal.unit}s: ₹${t.pricePerUnit.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isUnlocked ? FontWeight.bold : FontWeight.normal,
                    color: isUnlocked ? const Color(0xFFD97706) : AppColors.textSecondary,
                  ),
                ),
              );
            }).toList(),
          ),
          const Divider(height: 24),
          Row(
            children: [
              Text(
                'Deadline: ${DateFormat('dd MMM yyyy').format(deal.deadline)} • Delivery: ${DateFormat('dd MMM yyyy').format(deal.deliveryDate)}',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const Spacer(),
              if (isSupplier) ...[
                if (deal.status == 'TARGET_REACHED' || deal.status == 'OPEN')
                  ElevatedButton.icon(
                    onPressed: () => _generateManifest(deal),
                    icon: const Icon(Icons.qr_code, size: 16),
                    label: const Text('Generate Gate Manifest QR'),
                  )
                else if (deal.manifestQrToken != null)
                  OutlinedButton.icon(
                    onPressed: () => _showManifestModal(deal),
                    icon: const Icon(Icons.qr_code_2),
                    label: Text(deal.manifestQrToken!),
                  ),
              ] else ...[
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706)),
                  onPressed: () => _showJoinDealDialog(deal),
                  child: const Text('Join Deal (Pledge Units)'),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  void _showManifestModal(GBDealModel deal) {
    showDialog(
      context: context,
      builder: (context) => QrViewDialog(
        title: 'Gate Delivery Manifest: ${deal.title}',
        qrData: deal.manifestQrToken ?? '',
        tokenLabel: 'Manifest: ${deal.manifestQrToken} (Bulk Truck Delivery)',
      ),
    );
  }

  Future<void> _generateManifest(GBDealModel deal) async {
    final success = await ref.read(groupBuyingProvider.notifier).generateManifest(deal.dealId);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Delivery manifest QR generated for society security gate!')),
      );
    }
  }

  void _showJoinDealDialog(GBDealModel deal) {
    int qty = 1;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final total = qty * deal.currentPrice;
          return AlertDialog(
            title: Text('Join Bulk Deal: ${deal.title}'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Current Tier Price: ₹${deal.currentPrice.toStringAsFixed(0)} / ${deal.unit}'),
                const SizedBox(height: 6),
                const Text(
                  'Note: If higher tiers unlock before deadline, the price difference will be automatically refunded to you upon delivery!',
                  style: TextStyle(fontSize: 12, color: Color(0xFFD97706)),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Quantity to Pledge:', style: TextStyle(fontWeight: FontWeight.bold)),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: qty > 1 ? () => setDialogState(() => qty--) : null,
                    ),
                    Text('$qty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: () => setDialogState(() => qty++),
                    ),
                  ],
                ),
                const Divider(height: 20),
                Text(
                  'Total Escrow Hold: ₹${total.toStringAsFixed(0)} [SIMULATED]',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  Navigator.pop(context);
                  await ref.read(groupBuyingProvider.notifier).joinDeal(deal.dealId, qty);
                },
                child: const Text('Confirm Pledge [SIMULATED]'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildOrdersView() {
    final state = ref.watch(groupBuyingProvider);
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('My Group Buying Pledges', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (state.orders.isEmpty)
            const Text('You have not joined any group buying deals yet.')
          else
            ...state.orders.map((order) {
              return AppCard(
                margin: const EdgeInsets.only(bottom: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(order.orderId, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(width: 8),
                        StatusBadge(status: order.status),
                        const Spacer(),
                        Text(
                          'Pledged: ${currency.format(order.totalPledgedAmount)}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const Divider(height: 20),
                    Text(order.dealTitle, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Text('Quantity: ${order.quantity} units • Pledged at: ₹${order.initialPledgedPrice.toStringAsFixed(0)}/unit'),
                    if (order.refundDifference > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Retroactive Price Drop Savings Refund: ₹${order.refundDifference.toStringAsFixed(0)} [SIMULATED]',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981), fontSize: 13),
                      ),
                    ],
                    if (order.doorDeliveryToken != null && order.status == 'PLEDGED') ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (context) => QrViewDialog(
                                  title: 'Door Delivery Token',
                                  qrData: order.doorDeliveryToken!,
                                  tokenLabel: 'Token: ${order.doorDeliveryToken}',
                                ),
                              );
                            },
                            icon: const Icon(Icons.qr_code, size: 16),
                            label: Text('Door Token: ${order.doorDeliveryToken}'),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: () => ref.read(groupBuyingProvider.notifier).confirmDelivery(order.orderId, order.doorDeliveryToken!),
                            child: const Text('Confirm Received'),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  void _showScanManifestDialog(BuildContext context) {
    final tokenController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify Gate Delivery Manifest'),
        content: TextField(
          controller: tokenController,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Manifest Token (e.g. GB-MAN-...)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(groupBuyingProvider.notifier).verifyManifest(tokenController.text);
            },
            child: const Text('Verify Truck Manifest'),
          ),
        ],
      ),
    );
  }

  void _showCreateDealDialog(BuildContext context) {
    final titleController = TextEditingController();
    final catController = TextEditingController(text: 'Produce / Grocery');
    final descController = TextEditingController();
    final unitController = TextEditingController(text: 'Box (12 pcs)');
    final targetController = TextEditingController(text: '20');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Publish New Group Buying Deal'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleController, decoration: const InputDecoration(labelText: 'Product Title')),
              const SizedBox(height: 12),
              TextField(controller: catController, decoration: const InputDecoration(labelText: 'Category')),
              const SizedBox(height: 12),
              TextField(controller: unitController, decoration: const InputDecoration(labelText: 'Unit Package')),
              const SizedBox(height: 12),
              TextField(controller: targetController, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Target Minimum Units to Activate')),
              const SizedBox(height: 12),
              TextField(controller: descController, decoration: const InputDecoration(labelText: 'Description')),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(groupBuyingProvider.notifier).createDeal(
                    title: titleController.text.trim(),
                    category: catController.text.trim(),
                    description: descController.text.trim(),
                    unit: unitController.text.trim(),
                    minTargetQty: int.tryParse(targetController.text) ?? 20,
                    tiers: [
                      {'minQty': 1, 'maxQty': 19, 'pricePerUnit': 800},
                      {'minQty': 20, 'maxQty': 49, 'pricePerUnit': 700},
                      {'minQty': 50, 'pricePerUnit': 600},
                    ],
                    deadline: DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 7))),
                    deliveryDate: DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 9))),
                  );
            },
            child: const Text('Publish Deal'),
          ),
        ],
      ),
    );
  }
}
