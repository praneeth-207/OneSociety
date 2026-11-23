import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_card.dart';
import '../providers/complaints_provider.dart';

class ComplaintsAnalyticsDialog extends ConsumerStatefulWidget {
  const ComplaintsAnalyticsDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (ctx) => const ComplaintsAnalyticsDialog(),
    );
  }

  @override
  ConsumerState<ComplaintsAnalyticsDialog> createState() => _ComplaintsAnalyticsDialogState();
}

class _ComplaintsAnalyticsDialogState extends ConsumerState<ComplaintsAnalyticsDialog> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(complaintsProvider.notifier).loadAnalytics());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(complaintsProvider);
    final a = state.analytics;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 680),
        padding: const EdgeInsets.all(24),
        child: a == null
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Complaints & SLA Analytics',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _metricCard('Total Complaints', '${a['total'] ?? 0}', Icons.list_alt, AppColors.primary),
                        const SizedBox(width: 12),
                        _metricCard('Open Active', '${a['openComplaints'] ?? 0}', Icons.pending_actions, AppColors.warning),
                        const SizedBox(width: 12),
                        _metricCard('Avg Resolution', '${a['avgTimeToResolveHours'] ?? 0}h', Icons.timer, AppColors.info),
                        const SizedBox(width: 12),
                        _metricCard('Reopen Rate', '${a['reopenRate'] ?? 0}%', Icons.replay, AppColors.error),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text('By Priority', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    _breakdownRow(a['byPriority'] as Map<String, dynamic>? ?? {}),
                    const SizedBox(height: 16),
                    const Text('By Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    _breakdownRow(a['byStatus'] as Map<String, dynamic>? ?? {}),
                    const SizedBox(height: 16),
                    const Text('By Block', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    _breakdownRow(a['byBlock'] as Map<String, dynamic>? ?? {}),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _metricCard(String title, String val, IconData icon, Color color) {
    return Expanded(
      child: AppCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 8),
            Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _breakdownRow(Map<String, dynamic> map) {
    if (map.isEmpty) return const Text('No records', style: TextStyle(fontSize: 12, color: AppColors.textMuted));

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: map.entries.map((e) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: AppColors.border),
          ),
          child: Text(
            '${e.key}: ${e.value}',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          ),
        );
      }).toList(),
    );
  }
}
