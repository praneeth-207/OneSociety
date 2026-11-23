import 'package:flutter/material.dart';

class SimulatedBadge extends StatelessWidget {
  final String label;

  const SimulatedBadge({
    super.key,
    this.label = 'SIMULATED',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: const Color(0xFFD97706), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.bolt, size: 12, color: Color(0xFFB45309)),
          const SizedBox(width: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Color(0xFF92400E),
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
