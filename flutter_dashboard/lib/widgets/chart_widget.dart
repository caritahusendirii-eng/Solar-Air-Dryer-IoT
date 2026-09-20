import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class SensorChartWidget extends StatelessWidget {
  final List<Map<String, dynamic>> data;

  const SensorChartWidget({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1E293B), Color(0xFF162032)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Grafik Sensor (1 Jam Terakhir)',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFFCBD5E1),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildLegend(Colors.orange, 'Suhu (°C)'),
              const SizedBox(width: 20),
              _buildLegend(Colors.blue, 'Kelembaban (%)'),
            ],
          ),
          const SizedBox(height: 20),
          data.isEmpty
              ? const SizedBox(
                  height: 200,
                  child: Center(
                    child: Text(
                      'Belum ada data historis...',
                      style: TextStyle(color: Color(0xFF64748B)),
                    ),
                  ),
                )
              : SizedBox(
                  height: 220,
                  child: LineChart(_buildChart()),
                ),
        ],
      ),
    );
  }

  Widget _buildLegend(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
        ),
      ],
    );
  }

  LineChartData _buildChart() {
    final tempSpots = <FlSpot>[];
    final humSpots = <FlSpot>[];

    for (int i = 0; i < data.length; i++) {
      final entry = data[i];
      final temp = (entry['temperature'] as num?)?.toDouble() ?? 0;
      final hum = (entry['humidity'] as num?)?.toDouble() ?? 0;
      tempSpots.add(FlSpot(i.toDouble(), temp));
      humSpots.add(FlSpot(i.toDouble(), hum));
    }

    return LineChartData(
      gridData: FlGridData(
        show: true,
        drawVerticalLine: false,
        horizontalInterval: 10,
        getDrawingHorizontalLine: (value) => FlLine(
          color: const Color(0xFF334155),
          strokeWidth: 0.5,
        ),
      ),
      titlesData: FlTitlesData(
        leftTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            reservedSize: 36,
            getTitlesWidget: (value, meta) => Text(
              value.toInt().toString(),
              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
            ),
          ),
        ),
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            interval: (data.length / 5).ceilToDouble().clamp(1, double.infinity),
            getTitlesWidget: (value, meta) {
              final idx = value.toInt();
              if (idx < 0 || idx >= data.length) return const SizedBox.shrink();
              final ts = data[idx]['timestamp'];
              if (ts == null) return const SizedBox.shrink();
              final dt = DateTime.fromMillisecondsSinceEpoch(ts);
              return Text(
                '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}',
                style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
              );
            },
          ),
        ),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [
        LineChartBarData(
          spots: tempSpots,
          isCurved: true,
          color: Colors.orange,
          barWidth: 2.5,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(
            show: true,
            color: Colors.orange.withValues(alpha: 0.1),
          ),
        ),
        LineChartBarData(
          spots: humSpots,
          isCurved: true,
          color: Colors.blue,
          barWidth: 2.5,
          dotData: const FlDotData(show: false),
          belowBarData: BarAreaData(
            show: true,
            color: Colors.blue.withValues(alpha: 0.1),
          ),
        ),
      ],
      lineTouchData: LineTouchData(
        touchTooltipData: LineTouchTooltipData(
          getTooltipColor: (_) => const Color(0xFF1E293B),
          getTooltipItems: (touchedSpots) {
            return touchedSpots.map((spot) {
              final isTemp = spot.barIndex == 0;
              return LineTooltipItem(
                '${isTemp ? "Suhu" : "Kelembaban"}: ${spot.y.toStringAsFixed(1)}${isTemp ? "°C" : "%"}',
                TextStyle(
                  color: isTemp ? Colors.orange : Colors.blue,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              );
            }).toList();
          },
        ),
      ),
    );
  }
}
