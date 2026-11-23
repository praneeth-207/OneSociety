import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../models/complaint_model.dart';
import '../providers/complaints_provider.dart';

class ComplaintDetailPage extends ConsumerStatefulWidget {
  final String complaintId;

  const ComplaintDetailPage({super.key, required this.complaintId});

  @override
  ConsumerState<ComplaintDetailPage> createState() => _ComplaintDetailPageState();
}

class _ComplaintDetailPageState extends ConsumerState<ComplaintDetailPage> {
  final _declineReasonController = TextEditingController();
  final _resolutionNoteController = TextEditingController();
  final _reopenReasonController = TextEditingController();
  final _feedbackController = TextEditingController();

  int _selectedRating = 5;

  @override
  void dispose() {
    _declineReasonController.dispose();
    _resolutionNoteController.dispose();
    _reopenReasonController.dispose();
    _feedbackController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final complaintsState = ref.watch(complaintsProvider);

    final complaint = complaintsState.complaints.firstWhere(
      (c) => c.id == widget.complaintId || c.complaintId == widget.complaintId,
      orElse: () => ComplaintModel(
        id: '',
        complaintId: widget.complaintId,
        reporterId: '',
        reporterName: '',
        reporterPhone: '',
        reporterFlatNumber: '',
        title: 'Loading...',
        description: '',
        photos: [],
        category: '',
        subcategory: '',
        block: '',
        commonArea: '',
        priority: 'LOW',
        status: 'SUBMITTED',
        scopeFlag: 'IN_SCOPE',
        isEmergency: false,
        timeline: [],
        reopenCount: 0,
        createdAt: DateTime.now(),
      ),
    );

    final isPresident = user?.role == 'President';
    final isResident = user?.role == 'Resident';
    final isProvider = user?.role == 'Service Provider';

    return Scaffold(
      appBar: AppBar(
        title: Text('${complaint.complaintId}: ${complaint.title}'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: StatusBadge(status: complaint.status, isLarge: true),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Emergency Banner
                if (complaint.isEmergency) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.error),
                    ),
                    child: Row(
                      children: const [
                        Icon(Icons.warning, color: AppColors.error),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'EMERGENCY: Immediate safety or essential service hazard. President alert dispatched.',
                            style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF991B1B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Overview Card
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  complaint.title,
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Reported by ${complaint.reporterName} (Flat ${complaint.reporterFlatNumber}) • ${DateFormat.yMMMd().add_jm().format(complaint.createdAt)}',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: complaint.priority),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        complaint.description,
                        style: const TextStyle(fontSize: 14, height: 1.4, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        children: [
                          _chip(Icons.category, '${complaint.category} › ${complaint.subcategory}'),
                          _chip(Icons.location_on, '${complaint.block} - ${complaint.commonArea}'),
                          if (complaint.reopenCount > 0)
                            _chip(Icons.replay, 'Reopened ${complaint.reopenCount}x', color: AppColors.error),
                          if (complaint.workSize != null)
                            _chip(Icons.construction, 'Work Size: ${complaint.workSize}'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // AI Triage Card (AI suggests, President decides)
                if (complaint.aiAnalysis != null) ...[
                  AppCard(
                    color: const Color(0xFFF8FAFC),
                    border: Border.all(color: AppColors.primaryLight.withAlpha(60)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: const [
                                Icon(Icons.psychology, color: AppColors.primary, size: 22),
                                SizedBox(width: 8),
                                Text(
                                  'AI Assistance & Triage',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                            if (isPresident && complaint.aiAnalysis!.confidence != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Confidence: ${(complaint.aiAnalysis!.confidence! * 100).toInt()}%',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          complaint.aiAnalysis!.summary,
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Suggested Provider: ${complaint.aiAnalysis!.suggestedProviderType}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Major Work & Expense Approval Gate (President)
                if (isPresident && complaint.status == 'UNDER_REVIEW') ...[
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'President Review & Expense Gate',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              icon: const Icon(Icons.check, size: 16),
                              label: const Text('Mark Minor Work (Direct Assign)'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: complaint.workSize == 'MINOR' ? AppColors.primary : Colors.grey.shade400,
                              ),
                              onPressed: () async {
                                await ref.read(complaintsProvider.notifier).reviewComplaint(
                                      complaint.id,
                                      workSize: 'MINOR',
                                    );
                              },
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              icon: const Icon(Icons.request_quote, size: 16),
                              label: const Text('Record Major Expense Quote'),
                              onPressed: () => _showExpenseQuoteDialog(context, complaint),
                            ),
                          ],
                        ),
                        if (complaint.expenseApproval != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: complaint.expenseApproval!.status == 'APPROVED'
                                  ? const Color(0xFFDCFCE7)
                                  : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Quote: Rs ${complaint.expenseApproval!.quotationAmount} from ${complaint.expenseApproval!.vendorName} (${complaint.expenseApproval!.status})',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ),
                                StatusBadge(status: complaint.expenseApproval!.status ?? 'PENDING'),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.person_add),
                          label: const Text('Assign Service Provider'),
                          onPressed: (complaint.workSize == 'MAJOR' && complaint.expenseApproval?.status != 'APPROVED')
                              ? null // Blocked by Expense Gate!
                              : () => _showAssignDialog(context, complaint),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Provider Actions (My Tasks)
                if (isProvider) ...[
                  if (complaint.status == 'ASSIGNED') ...[
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Respond to Assigned Task', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              ElevatedButton(
                                onPressed: () async {
                                  await ref.read(complaintsProvider.notifier).respondToTask(complaint.id, action: 'ACCEPT');
                                },
                                child: const Text('Accept & Start Work'),
                              ),
                              const SizedBox(width: 12),
                              OutlinedButton(
                                onPressed: () => _showDeclineDialog(context, complaint),
                                style: OutlinedButton.styleFrom(foregroundColor: AppColors.error),
                                child: const Text('Decline Task'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                  if (complaint.status == 'IN_PROGRESS') ...[
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Complete & Resolve Work', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _resolutionNoteController,
                            decoration: const InputDecoration(labelText: 'Resolution Summary (What was fixed?)'),
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.done_all),
                            label: const Text('Mark Resolved'),
                            onPressed: () async {
                              await ref.read(complaintsProvider.notifier).resolveTask(
                                    complaint.id,
                                    resolutionNote: _resolutionNoteController.text.trim().isEmpty
                                        ? 'Issue fixed successfully'
                                        : _resolutionNoteController.text.trim(),
                                  );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ],

                // Resident Verification Card
                if (isResident && complaint.status == 'RESOLVED') ...[
                  AppCard(
                    color: const Color(0xFFEFF6FF),
                    border: Border.all(color: AppColors.primary),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Is the issue resolved?',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'The assigned provider has marked this issue as resolved. Please inspect and confirm.',
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              icon: const Icon(Icons.thumb_up),
                              label: const Text('Yes, Resolved'),
                              onPressed: () => _showRatingDialog(context, complaint),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              icon: const Icon(Icons.replay),
                              label: const Text('Not Resolved (Reopen)'),
                              style: OutlinedButton.styleFrom(foregroundColor: AppColors.error),
                              onPressed: () => _showReopenDialog(context, complaint),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Time-stamped Visual Timeline
                const Text(
                  'Status Timeline & Audit Trail',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                AppCard(
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: complaint.timeline.length,
                    separatorBuilder: (_, __) => const Divider(height: 24),
                    itemBuilder: (context, idx) {
                      final item = complaint.timeline[idx];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withAlpha(20),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.timeline, color: AppColors.primary, size: 16),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${item.actorName} (${item.actorRole})',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      DateFormat.yMMMd().add_jm().format(item.timestamp),
                                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    StatusBadge(status: item.status),
                                    if (item.note != null) ...[
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          item.note!,
                                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _chip(IconData icon, String text, {Color? color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: (color ?? AppColors.textPrimary).withAlpha(12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color ?? AppColors.textPrimary),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color ?? AppColors.textPrimary),
          ),
        ],
      ),
    );
  }

  void _showExpenseQuoteDialog(BuildContext context, ComplaintModel complaint) {
    final vendorController = TextEditingController(text: 'Apex Plumbing Services');
    final phoneController = TextEditingController(text: '9876543290');
    final amountController = TextEditingController(text: '7500');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Record & Approve Major Expense Quote'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: vendorController, decoration: const InputDecoration(labelText: 'Vendor Name')),
            const SizedBox(height: 10),
            TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Vendor Phone')),
            const SizedBox(height: 10),
            TextField(controller: amountController, decoration: const InputDecoration(labelText: 'Quotation Amount (Rs)')),
          ],
        ),
        actions: [
          OutlinedButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await ref.read(complaintsProvider.notifier).submitExpenseQuote(
                    complaint.id,
                    vendorName: vendorController.text,
                    vendorPhone: phoneController.text,
                    quotationAmount: double.tryParse(amountController.text) ?? 5000,
                    action: 'APPROVE',
                    comment: 'Approved by President for major repair',
                  );
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Approve Quote'),
          ),
        ],
      ),
    );
  }

  void _showAssignDialog(BuildContext context, ComplaintModel complaint) {
    final nameController = TextEditingController(text: 'Ramesh Electrician');
    final phoneController = TextEditingController(text: '9876543230');
    final costController = TextEditingController(text: '1200');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Assign Service Personnel'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Provider / Vendor Name')),
            const SizedBox(height: 10),
            TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone Number')),
            const SizedBox(height: 10),
            TextField(controller: costController, decoration: const InputDecoration(labelText: 'Estimated Cost (Rs)')),
          ],
        ),
        actions: [
          OutlinedButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              await ref.read(complaintsProvider.notifier).assignComplaint(
                    complaint.id,
                    providerName: nameController.text,
                    providerPhone: phoneController.text,
                    providerType: complaint.aiAnalysis?.suggestedProviderType ?? 'Technician',
                    isExternalVendor: false,
                    estimatedCost: double.tryParse(costController.text),
                  );
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Confirm Assignment'),
          ),
        ],
      ),
    );
  }

  void _showDeclineDialog(BuildContext context, ComplaintModel complaint) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Decline Task Assignment'),
        content: TextField(
          controller: _declineReasonController,
          decoration: const InputDecoration(labelText: 'Reason for declining'),
        ),
        actions: [
          OutlinedButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              await ref.read(complaintsProvider.notifier).respondToTask(
                    complaint.id,
                    action: 'DECLINE',
                    declineReason: _declineReasonController.text,
                  );
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Decline & Return to Review'),
          ),
        ],
      ),
    );
  }

  void _showRatingDialog(BuildContext context, ComplaintModel complaint) {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Confirm Fix & Rate Service'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return IconButton(
                    icon: Icon(
                      index < _selectedRating ? Icons.star : Icons.star_border,
                      color: Colors.amber,
                      size: 32,
                    ),
                    onPressed: () => setState(() => _selectedRating = index + 1),
                  );
                }),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _feedbackController,
                decoration: const InputDecoration(labelText: 'Comments / Feedback'),
              ),
            ],
          ),
          actions: [
            OutlinedButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                await ref.read(complaintsProvider.notifier).verifyComplaint(
                      complaint.id,
                      isResolved: true,
                      rating: _selectedRating,
                      feedback: _feedbackController.text,
                    );
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              child: const Text('Close Complaint'),
            ),
          ],
        ),
      ),
    );
  }

  void _showReopenDialog(BuildContext context, ComplaintModel complaint) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reopen Complaint'),
        content: TextField(
          controller: _reopenReasonController,
          decoration: const InputDecoration(labelText: 'Reason why issue is not resolved'),
        ),
        actions: [
          OutlinedButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () async {
              await ref.read(complaintsProvider.notifier).verifyComplaint(
                    complaint.id,
                    isResolved: false,
                    reopenReason: _reopenReasonController.text,
                  );
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Reopen Issue'),
          ),
        ],
      ),
    );
  }
}
