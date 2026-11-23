import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/complaints_provider.dart';

class RaiseComplaintDialog extends ConsumerStatefulWidget {
  const RaiseComplaintDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (ctx) => const RaiseComplaintDialog(),
    );
  }

  @override
  ConsumerState<RaiseComplaintDialog> createState() => _RaiseComplaintDialogState();
}

class _RaiseComplaintDialogState extends ConsumerState<RaiseComplaintDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  String _selectedBlock = 'Block A';
  String _selectedCommonArea = 'Staircase Area';
  String _selectedCategory = 'Water & Drainage';
  String _selectedSubcategory = 'Pipe Leakage';

  final List<String> _blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
  final List<String> _commonAreas = [
    'Lift Lobby',
    'Staircase Area',
    'Basement Parking',
    'Ground Floor Entrance',
    'Terrace / Roof',
    'Clubhouse',
    'Swimming Pool Area',
    'Garden / Children Park',
    'Security Gate',
    'Pump Room / Water Tank',
    'Electrical Meter Room',
  ];

  final Map<String, List<String>> _categoryMap = {
    'Water & Drainage': ['Pipe Leakage', 'Drainage Blockage', 'Water Tank', 'Motor'],
    'Electrical': ['Common Area Lighting', 'Wiring Issue', 'Meter Room', 'Generator'],
    'Lifts & Elevators': ['Lift Maintenance', 'Lift Stuck', 'Door Issue'],
    'Security & Fire Safety': ['Gate Security', 'Fire Extinguisher', 'CCTV', 'Alarm'],
    'Housekeeping': ['Lobby Cleaning', 'Garbage & Waste', 'Staircase Sweeping'],
    'Civil & Painting': ['Wall Seepage', 'Plaster Cracks', 'Terrace Leakage'],
  };

  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final complaint = await ref.read(complaintsProvider.notifier).raiseComplaint(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          block: _selectedBlock,
          commonArea: _selectedCommonArea,
          category: _selectedCategory,
          subcategory: _selectedSubcategory,
        );

    setState(() => _isSubmitting = false);

    if (complaint != null && mounted) {
      Navigator.of(context).pop();
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.check_circle, color: AppColors.success, size: 28),
              SizedBox(width: 10),
              Text('Complaint Logged'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Complaint registered successfully with sequential tracking ID:',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primaryLight.withAlpha(50)),
                ),
                child: Text(
                  complaint.complaintId,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    letterSpacing: 1,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'AI Triage is analyzing this issue in the background to assign priority and recommend appropriate service personnel.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 580),
        padding: const EdgeInsets.all(24),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Report Common-Area Problem',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Emergency Call Notice Banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF59E0B)),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.warning_amber_rounded, color: Color(0xFFB45309), size: 24),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'For urgent fire or safety emergencies, phone the security desk immediately, then log it here.',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Reporter details (read-only auto-fill)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Text(
                          'Reporter: ${user?.name ?? 'Resident'} (${user?.flatNumber ?? 'N/A'})',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Category & Subcategory
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: const InputDecoration(labelText: 'Category'),
                        items: _categoryMap.keys
                            .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedCategory = val;
                              _selectedSubcategory = _categoryMap[val]!.first;
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedSubcategory,
                        decoration: const InputDecoration(labelText: 'Subcategory'),
                        items: (_categoryMap[_selectedCategory] ?? [])
                            .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedSubcategory = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Location: Block & Common Area
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedBlock,
                        decoration: const InputDecoration(labelText: 'Block'),
                        items: _blocks
                            .map((b) => DropdownMenuItem(value: b, child: Text(b, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedBlock = val);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedCommonArea,
                        decoration: const InputDecoration(labelText: 'Common Area'),
                        items: _commonAreas
                            .map((a) => DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedCommonArea = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Problem Title
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Problem Headline / Summary',
                    hintText: 'e.g. Water leakage near 2nd floor staircase',
                  ),
                  validator: (val) => val == null || val.length < 3 ? 'Title required' : null,
                ),
                const SizedBox(height: 16),

                // Description
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Detailed Description',
                    hintText: 'Describe what happened, exact location, and urgency...',
                  ),
                  validator: (val) => val == null || val.length < 5 ? 'Detailed description required' : null,
                ),
                const SizedBox(height: 24),

                // Action buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submit,
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Submit Complaint'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
