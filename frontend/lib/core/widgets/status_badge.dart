import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool isLarge;

  const StatusBadge({
    super.key,
    required this.status,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg = const Color(0xFFF1F5F9);
    Color fg = const Color(0xFF475569);

    final normalized = status.toUpperCase().replaceAll('_', ' ');

    if (normalized.contains('RESOLVED') ||
        normalized.contains('APPROVED') ||
        normalized.contains('ACTIVE') ||
        normalized.contains('COMPLETED') ||
        normalized.contains('PAID') ||
        normalized.contains('SUCCESS')) {
      bg = const Color(0xFFDCFCE7);
      fg = const Color(0xFF166534);
    } else if (normalized.contains('PROGRESS') ||
        normalized.contains('REVIEW') ||
        normalized.contains('HOLD') ||
        normalized.contains('AWAITING') ||
        normalized.contains('DISCUSSION')) {
      bg = const Color(0xFFFEF3C7);
      fg = const Color(0xFF92400E);
    } else if (normalized.contains('HIGH') ||
        normalized.contains('REJECTED') ||
        normalized.contains('OVERDUE') ||
        normalized.contains('EXPIRED') ||
        normalized.contains('FAILED') ||
        normalized.contains('CANCELLED')) {
      bg = const Color(0xFFFEE2E2);
      fg = const Color(0xFF991B1B);
    } else if (normalized.contains('SUBMITTED') ||
        normalized.contains('PENDING') ||
        normalized.contains('ASSIGNED')) {
      bg = const Color(0xFFE0E7FF);
      fg = const Color(0xFF3730A3);
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isLarge ? 12 : 8,
        vertical: isLarge ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: fg.withAlpha(50), width: 0.8),
      ),
      child: Text(
        normalized,
        style: TextStyle(
          color: fg,
          fontSize: isLarge ? 13 : 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
