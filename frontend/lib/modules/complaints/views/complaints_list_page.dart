import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../models/complaint_model.dart';
import '../providers/complaints_provider.dart';
import 'raise_complaint_sheet.dart';
import 'complaints_analytics_dialog.dart';

class ComplaintsListPage extends ConsumerStatefulWidget {
  const ComplaintsListPage({super.key});

  @override
  ConsumerState<ComplaintsListPage> createState() => _ComplaintsListPageState();
}

class _ComplaintsListPageState extends ConsumerState<ComplaintsListPage> with SingleTickerProviderStateMixin {
  final _searchController = TextEditingController();
  String _selectedStatus = 'ALL';
  String _selectedPriority = 'ALL';
  int _currentTab = 0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _refresh() {
    final user = ref.read(authProvider).user;
    String? filter;
    if (user?.role == 'Resident' && _currentTab == 0) {
      filter = 'my';
    }

    ref.read(complaintsProvider.notifier).loadComplaints(
          filter: filter,
          status: _selectedStatus,
          priority: _selectedPriority,
          search: _searchController.text.trim(),
        );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final complaintsState = ref.watch(complaintsProvider);

    final isPresident = user?.role == 'President';
    final isResident = user?.role == 'Resident';
    final isProvider = user?.role == 'Service Provider';

    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Smart Complaint Handling',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Track, assign, resolve and verify common-area society issues.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Row(
                  children: [
                    if (isPresident)
                      OutlinedButton.icon(
                        icon: const Icon(Icons.bar_chart),
                        label: const Text('Analytics & SLA'),
                        onPressed: () => ComplaintsAnalyticsDialog.show(context),
                      ),
                    const SizedBox(width: 12),
                    if (isResident || isPresident)
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('Report Problem'),
                        onPressed: () => RaiseComplaintDialog.show(context),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Tabs based on role
            if (isResident) ...[
              SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 0, label: Text('My Complaints'), icon: Icon(Icons.person)),
                  ButtonSegment(value: 1, label: Text('Society Feed'), icon: Icon(Icons.public)),
                ],
                selected: {_currentTab},
                onSelectionChanged: (val) {
                  setState(() => _currentTab = val.first);
                  _refresh();
                },
              ),
              const SizedBox(height: 16),
            ] else if (isPresident) ...[
              SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 0, label: Text('All Complaints'), icon: Icon(Icons.list)),
                  ButtonSegment(value: 1, label: Text('Review Queue'), icon: Icon(Icons.rate_review)),
                ],
                selected: {_currentTab},
                onSelectionChanged: (val) {
                  setState(() {
                    _currentTab = val.first;
                    _selectedStatus = _currentTab == 1 ? 'UNDER_REVIEW' : 'ALL';
                  });
                  _refresh();
                },
              ),
              const SizedBox(height: 16),
            ] else if (isProvider) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.handyman, color: AppColors.primary, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Showing tasks assigned to you',
                      style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Search and Filters Bar
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search by ID (#C1024) or headline...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                _refresh();
                              },
                            )
                          : null,
                    ),
                    onSubmitted: (_) => _refresh(),
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 160,
                  child: DropdownButtonFormField<String>(
                    value: _selectedStatus,
                    decoration: const InputDecoration(labelText: 'Status'),
                    items: const [
                      DropdownMenuItem(value: 'ALL', child: Text('All Statuses')),
                      DropdownMenuItem(value: 'SUBMITTED', child: Text('Submitted')),
                      DropdownMenuItem(value: 'UNDER_REVIEW', child: Text('Under Review')),
                      DropdownMenuItem(value: 'ASSIGNED', child: Text('Assigned')),
                      DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                      DropdownMenuItem(value: 'RESOLVED', child: Text('Resolved')),
                      DropdownMenuItem(value: 'CLOSED', child: Text('Closed')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedStatus = val);
                        _refresh();
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  width: 140,
                  child: DropdownButtonFormField<String>(
                    value: _selectedPriority,
                    decoration: const InputDecoration(labelText: 'Priority'),
                    items: const [
                      DropdownMenuItem(value: 'ALL', child: Text('All Priorities')),
                      DropdownMenuItem(value: 'HIGH', child: Text('High')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                      DropdownMenuItem(value: 'LOW', child: Text('Low')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedPriority = val);
                        _refresh();
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Complaints List
            if (complaintsState.isLoading)
              const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
            else if (complaintsState.complaints.isEmpty)
              AppCard(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.assignment_turned_in, size: 54, color: Colors.grey.shade400),
                        const SizedBox(height: 12),
                        const Text(
                          'No complaints found matching this filter',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'All common areas in Shantiniketan Society are operating smoothly.',
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: complaintsState.complaints.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, idx) {
                  final complaint = complaintsState.complaints[idx];
                  return _complaintCard(context, complaint, isPresident);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _complaintCard(BuildContext context, ComplaintModel complaint, bool isPresident) {
    return AppCard(
      onTap: () => context.go('/complaints/${complaint.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(20),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  complaint.complaintId,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                ),
              ),
              const SizedBox(width: 10),
              StatusBadge(status: complaint.priority),
              const SizedBox(width: 8),
              if (complaint.isEmergency)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(4)),
                  child: const Text('EMERGENCY', style: TextStyle(color: Color(0xFF991B1B), fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              const Spacer(),
              StatusBadge(status: complaint.status),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            complaint.title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 4),
          Text(
            complaint.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${complaint.block} - ${complaint.commonArea} • ${DateFormat.yMMMd().format(complaint.createdAt)}',
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              if (complaint.assignment?.providerName != null)
                Text(
                  'Assigned: ${complaint.assignment!.providerName}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
