import 'package:flutter/material.dart';

class SensorCard extends StatelessWidget {
  final String type;
  final double? value;
  final String unit;

  const SensorCard({
    super.key,
    required this.type,
    required this.value,
    required this.unit,
  });

  bool get isTemp => type == 'temperature';

  Color get statusColor {
    if (value == null) return Colors.grey;
    if (isTemp) {
      if (value! > 35) return Colors.red;
      if (value! > 28) return Colors.orange;
      return Colors.green;
    }
    if (value! > 80) return Colors.red;
    if (value! > 60) return Colors.orange;
    return Colors.green;
  }

  String get statusText {
    if (value == null) return '--';
    if (isTemp) {
      if (value! > 35) return 'Panas!';
      if (value! > 28) return 'Hangat';
      return 'Normal';
    }
    if (value! > 80) return 'Lembab!';
    if (value! > 60) return 'Sedang';
    return 'Normal';
  }

  IconData get icon =>
      isTemp ? Icons.thermostat_rounded : Icons.water_drop_rounded;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF1E293B),
            const Color(0xFF162032),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 48, color: statusColor),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isTemp ? 'SUHU' : 'KELEMBABAN',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[500],
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      value != null ? value!.toStringAsFixed(1) : '--',
                      style: TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: statusColor,
                        height: 1,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4, left: 2),
                      child: Text(
                        unit,
                        style: TextStyle(
                          fontSize: 18,
                          color: statusColor.withValues(alpha: 0.7),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
