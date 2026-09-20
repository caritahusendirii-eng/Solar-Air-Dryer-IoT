import 'dart:async';
import 'package:flutter/material.dart';
import '../services/firebase_service.dart';
import '../widgets/sensor_card.dart';
import '../widgets/blower_control.dart';
import '../widgets/chart_widget.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _firebase = FirebaseService();

  double? _temperature;
  double? _humidity;
  int? _lastTimestamp;
  Map<String, dynamic> _blowers = {};
  List<Map<String, dynamic>> _history = [];
  bool _connected = false;
  String _controlMode = 'auto';
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    _listenToSensor();
    _listenToBlowers();
    _listenToHistory();
    _listenToControlMode();
    _startHeartbeatTimer();
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  void _startHeartbeatTimer() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_lastTimestamp != null) {
        final now = DateTime.now().millisecondsSinceEpoch;
        final diff = now - _lastTimestamp!;
        setState(() {
          _connected =
              diff < 120000; // Online if updated in last 120s (2 minutes)
        });
      } else {
        setState(() {
          _connected = false;
        });
      }
    });
  }

  void _listenToSensor() {
    _firebase.sensorDataStream.listen((event) {
      if (event.snapshot.exists) {
        final data = Map<String, dynamic>.from(event.snapshot.value as Map);
        setState(() {
          _temperature = (data['temperature'] as num?)?.toDouble();
          _humidity = (data['humidity'] as num?)?.toDouble();
          _lastTimestamp = data['timestamp'] as int?;
          _connected = true;
        });
      }
    });
  }

  void _listenToBlowers() {
    _firebase.blowersStream.listen((event) {
      if (event.snapshot.exists) {
        setState(() {
          _blowers = Map<String, dynamic>.from(event.snapshot.value as Map);
        });
      }
    });
  }

  void _listenToHistory() {
    _firebase.historyStream.listen((event) {
      if (event.snapshot.exists) {
        final map = Map<String, dynamic>.from(event.snapshot.value as Map);
        final entries =
            map.values.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        entries.sort((a, b) => (a['timestamp'] as int? ?? 0)
            .compareTo(b['timestamp'] as int? ?? 0));
        setState(() {
          _history = entries;
        });
      }
    });
  }

  void _listenToControlMode() {
    _firebase.controlModeStream.listen((event) {
      if (event.snapshot.exists) {
        setState(() {
          _controlMode = event.snapshot.value as String? ?? 'auto';
        });
      }
    });
  }

  void _toggleControlMode(String mode) async {
    setState(() => _controlMode = mode);
    try {
      await _firebase.setControlMode(mode);
    } catch (e) {
      debugPrint('Failed to set control mode: $e');
    }
  }

  String get _lastUpdateText {
    if (_lastTimestamp == null) return '--';
    final dt = DateTime.fromMillisecondsSinceEpoch(_lastTimestamp!);
    return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              backgroundColor: const Color(0xFF0F172A),
              title: Row(
                children: [
                  const Icon(Icons.wb_sunny_rounded, color: Color(0xFFFBBF24)),
                  const SizedBox(width: 12),
                  const Text(
                    'Solar Dryer IoT',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFFF1F5F9),
                    ),
                  ),
                ],
              ),
              actions: [
                Container(
                  margin: const EdgeInsets.only(right: 16),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _connected
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _connected ? Colors.green : Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _connected ? 'Online' : 'Offline',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: _connected ? Colors.green : Colors.red,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  SensorCard(
                      type: 'temperature', value: _temperature, unit: '°C'),
                  const SizedBox(height: 12),
                  SensorCard(type: 'humidity', value: _humidity, unit: '%'),
                  const SizedBox(height: 24),
                  const Text(
                    'Kontrol Blower AC',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFCBD5E1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: _connected
                          ? Colors.green.withValues(alpha: 0.1)
                          : Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _connected
                            ? Colors.green.withValues(alpha: 0.3)
                            : Colors.red.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _connected ? Icons.cloud_done : Icons.cloud_off,
                          size: 16,
                          color: _connected ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _connected ? 'Sistem Online' : 'Sistem Terputus',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: _connected ? Colors.green : Colors.red,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          _lastTimestamp != null
                              ? 'Terakhir: ${DateTime.fromMillisecondsSinceEpoch(_lastTimestamp!).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(_lastTimestamp!).minute.toString().padLeft(2, '0')}'
                              : '--:--',
                          style: TextStyle(
                            fontSize: 11,
                            color: _connected
                                ? Colors.green[300]
                                : Colors.red[300],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // === Mode Toggle: Auto / Manual ===
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => _toggleControlMode('auto'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: _controlMode == 'auto'
                                    ? const Color(0xFFF97316)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.lock_outline,
                                    size: 16,
                                    color: _controlMode == 'auto'
                                        ? Colors.white
                                        : Colors.grey[500],
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Otomatis',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: _controlMode == 'auto'
                                          ? Colors.white
                                          : Colors.grey[500],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => _toggleControlMode('manual'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: _controlMode == 'manual'
                                    ? const Color(0xFFF97316)
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  'Manual',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: _controlMode == 'manual'
                                        ? Colors.white
                                        : Colors.grey[500],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // === Auto Mode Info Card ===
                  if (_controlMode == 'auto') ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFFEF3C7), Color(0xFFFDE68A)],
                        ),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFF59E0B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Text('⚡', style: TextStyle(fontSize: 16)),
                              SizedBox(width: 6),
                              Text(
                                'Mode Otomatis Aktif',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF92400E),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Kecepatan blower diatur otomatis oleh ESP32 berdasarkan suhu rata-rata.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF78350F),
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildRangeRow('< 35°C', 'OFF (0%)', Colors.grey),
                          _buildRangeRow('35°C – 41.9°C', '25%', Colors.blue),
                          _buildRangeRow('42°C – 48.9°C', '50%', Colors.amber),
                          _buildRangeRow('49°C – 54.9°C', '75%', Colors.orange),
                          _buildRangeRow('≥ 55°C', '100%', Colors.red),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // === Blower Controls ===
                  ..._blowers.entries.map((entry) {
                    final blowerData =
                        Map<String, dynamic>.from(entry.value as Map);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: BlowerControl(
                        id: entry.key,
                        name: blowerData['name'] ?? entry.key,
                        speed: (blowerData['speed'] ?? 0) as int,
                        isDisabled: _controlMode == 'auto',
                      ),
                    );
                  }),
                  const SizedBox(height: 12),
                  SensorChartWidget(data: _history),
                  const SizedBox(height: 24),
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'Update terakhir: $_lastUpdateText',
                          style:
                              TextStyle(fontSize: 12, color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ESP32 + DHT22 + BTS7960',
                          style:
                              TextStyle(fontSize: 11, color: Colors.grey[700]),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRangeRow(String range, String speed, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            range,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF92400E),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              speed,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: color.withValues(alpha: 0.8),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
