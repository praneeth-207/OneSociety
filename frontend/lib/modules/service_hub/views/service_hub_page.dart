import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/simulated_badge.dart';
import '../providers/service_hub_provider.dart';
import '../models/service_hub_model.dart';

class ServiceHubPage extends ConsumerStatefulWidget {
  const ServiceHubPage({super.key});

  @override
  ConsumerState<ServiceHubPage> createState() => _ServiceHubPageState();
}

class _ServiceHubPageState extends ConsumerState<ServiceHubPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedCategory = 'HOUSEMAID';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(serviceHubProvider.notifier).fetchProviders(_selectedCategory);
      ref.read(serviceHubProvider.notifier).fetchMyBookings();
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
    final isProvider = auth.user?.role == 'Service Provider';

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
                      'Service Hub',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(width: 8),
                    SimulatedBadge(),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'Dedicated housemaid time slots, verified resident & external professionals',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 8),
                TabBar(
                  controller: _tabController,
                  isScrollable: true,
                  labelColor: AppColors.primary,
                  unselectedLabelColor: AppColors.textSecondary,
                  indicatorColor: AppColors.primary,
                  tabs: [
                    Tab(text: isProvider ? 'Available Services' : 'Browse Services & Maids'),
                    Tab(text: isProvider ? 'My Assigned Tasks' : 'My Bookings'),
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
                _buildBrowseProvidersView(),
                _buildBookingsView(isProvider),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrowseProvidersView() {
    final state = ref.watch(serviceHubProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category Selector Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _categoryChip('HOUSEMAID', 'Housemaid & Cleaning', Icons.cleaning_services),
                const SizedBox(width: 10),
                _categoryChip('ELECTRICAL', 'Electrical & Wiring', Icons.bolt),
                const SizedBox(width: 10),
                _categoryChip('PLUMBING', 'Plumbing & Pipes', Icons.plumbing),
                const SizedBox(width: 10),
                _categoryChip('FITNESS', 'Yoga & Fitness', Icons.fitness_center),
                const SizedBox(width: 10),
                _categoryChip('TUTOR', 'Home Tuition', Icons.school),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Provider Cards
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.providers.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(48),
                child: Column(
                  children: [
                    const Icon(Icons.handyman_outlined, size: 64, color: AppColors.textMuted),
                    const SizedBox(height: 16),
                    Text('No providers listed for $_selectedCategory yet.'),
                  ],
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: state.providers.length,
              itemBuilder: (context, index) {
                final provider = state.providers[index];
                return _buildProviderCard(provider);
              },
            ),
        ],
      ),
    );
  }

  Widget _categoryChip(String category, String label, IconData icon) {
    final isSelected = _selectedCategory == category;
    return ChoiceChip(
      selected: isSelected,
      selectedColor: AppColors.primary,
      backgroundColor: Colors.white,
      side: const BorderSide(color: AppColors.border),
      avatar: Icon(icon, size: 18, color: isSelected ? Colors.white : AppColors.primary),
      label: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : AppColors.textPrimary,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      onSelected: (_) {
        setState(() => _selectedCategory = category);
        ref.read(serviceHubProvider.notifier).fetchProviders(category);
      },
    );
  }

  Widget _buildProviderCard(ProviderProfileModel provider) {
    final currency = NumberFormat.currency(symbol: '₹', decimalDigits: 0);

    return AppCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.primary.withAlpha(20),
                child: Text(
                  provider.providerName.substring(0, 1),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          provider.providerName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        StatusBadge(status: provider.providerType),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      provider.bio.isNotEmpty ? provider.bio : 'Verified Society Service Professional',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Color(0xFFF59E0B), size: 16),
                        const SizedBox(width: 4),
                        Text(
                          '${provider.ratingAverage.toStringAsFixed(1)} (${provider.totalReviews} reviews)',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: [
              Text(
                '${currency.format(provider.ratePerSlot)} / slot',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
              ),
              ElevatedButton(
                onPressed: () => _openSlotBookingModal(provider),
                child: const Text('Book Time Slot'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _openSlotBookingModal(ProviderProfileModel provider) {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    ref.read(serviceHubProvider.notifier).fetchSlots(provider.userId, today, _selectedCategory);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => _SlotBookingSheet(provider: provider, date: today),
    );
  }

  Widget _buildBookingsView(bool isProvider) {
    final state = ref.watch(serviceHubProvider);

    if (state.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (state.bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.calendar_today_outlined, size: 64, color: AppColors.textMuted),
            const SizedBox(height: 16),
            Text(isProvider ? 'No service tasks assigned yet' : 'You have no active bookings'),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: state.bookings.length,
      itemBuilder: (context, index) {
        final booking = state.bookings[index];
        return _buildBookingCard(booking, isProvider);
      },
    );
  }

  Widget _buildBookingCard(ServiceBookingModel booking, bool isProvider) {
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
                    booking.bookingId,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  StatusBadge(status: booking.status),
                ],
              ),
              Text(
                'Escrow: ${currency.format(booking.escrowAmount)} [SIMULATED]',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF10B981)),
              ),
            ],
          ),
          const Divider(height: 20),
          Text(
            '${booking.serviceCategory} • Slot: ${booking.timeSlot} (${booking.scheduledDate})',
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            isProvider
                ? 'Client: ${booking.residentName} (Flat ${booking.flatNumber})'
                : 'Assigned Professional: ${booking.providerName}',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          if (booking.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Notes: ${booking.description}', style: const TextStyle(fontSize: 12)),
          ],
          const SizedBox(height: 16),
          // Action Buttons
          if (isProvider) ...[
            if (booking.status == 'REQUESTED')
              ElevatedButton(
                onPressed: () => ref.read(serviceHubProvider.notifier).updateStatus(booking.bookingId, 'ACCEPTED'),
                child: const Text('Accept Service Appointment'),
              )
            else if (booking.status == 'ACCEPTED')
              ElevatedButton(
                onPressed: () => ref.read(serviceHubProvider.notifier).updateStatus(booking.bookingId, 'IN_PROGRESS'),
                child: const Text('Start Work (In Progress)'),
              )
            else if (booking.status == 'IN_PROGRESS')
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                onPressed: () => ref.read(serviceHubProvider.notifier).updateStatus(booking.bookingId, 'COMPLETED'),
                child: const Text('Mark Completed'),
              ),
          ] else ...[
            if (booking.status == 'COMPLETED')
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                onPressed: () => _showSettleRatingDialog(booking),
                icon: const Icon(Icons.star, size: 18),
                label: const Text('Verify, Release Escrow & Rate'),
              ),
          ],
        ],
      ),
    );
  }

  void _showSettleRatingDialog(ServiceBookingModel booking) {
    int selectedRating = 5;
    final reviewController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Release Escrow & Rate Service'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('How was the service provided by the professional?'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  final star = index + 1;
                  return IconButton(
                    icon: Icon(
                      star <= selectedRating ? Icons.star : Icons.star_border,
                      color: const Color(0xFFF59E0B),
                      size: 32,
                    ),
                    onPressed: () => setDialogState(() => selectedRating = star),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reviewController,
                decoration: const InputDecoration(labelText: 'Review Feedback (Optional)'),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await ref.read(serviceHubProvider.notifier).settleAndRate(
                      booking.bookingId,
                      selectedRating,
                      reviewController.text.trim(),
                    );
              },
              child: const Text('Release Escrow Payout'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SlotBookingSheet extends ConsumerWidget {
  final ProviderProfileModel provider;
  final String date;

  const _SlotBookingSheet({required this.provider, required this.date});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(serviceHubProvider);

    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Book Time Slot: ${provider.providerName}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SimulatedBadge(),
            ],
          ),
          const SizedBox(height: 4),
          Text('Date: $date • Rate: ₹${provider.ratePerSlot.toStringAsFixed(0)} in Escrow'),
          const Divider(height: 24),
          const Text('Available Time Slots:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (state.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (state.availableSlots.isEmpty)
            const Text('No slots generated yet')
          else
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: state.availableSlots.map((slot) {
                return OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    backgroundColor: slot.isBooked ? const Color(0xFFF1F5F9) : Colors.white,
                    side: BorderSide(
                      color: slot.isBooked ? Colors.transparent : AppColors.primary,
                    ),
                  ),
                  onPressed: slot.isBooked
                      ? null
                      : () async {
                          Navigator.pop(context);
                          await ref.read(serviceHubProvider.notifier).bookSlot(
                                slot.id,
                                'Appointment with ${provider.providerName}',
                              );
                        },
                  child: Text(
                    slot.isBooked ? '${slot.timeSlot} (Booked)' : slot.timeSlot,
                    style: TextStyle(
                      color: slot.isBooked ? AppColors.textMuted : AppColors.primary,
                      fontWeight: slot.isBooked ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
