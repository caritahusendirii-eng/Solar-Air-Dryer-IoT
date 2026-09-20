import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../services/firebase_service.dart';

class BlowerControl extends StatefulWidget {
  final String id;
  final String name;
  final int speed;
  final bool isDisabled;

  const BlowerControl({
    super.key,
    required this.id,
    required this.name,
    required this.speed,
    this.isDisabled = false,
  });

  @override
  State<BlowerControl> createState() => _BlowerControlState();
}

class _BlowerControlState extends State<BlowerControl> {
  final _firebase = FirebaseService();
  double _localSpeed = 0;
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _localSpeed = widget.speed.toDouble();
  }

  @override
  void didUpdateWidget(BlowerControl oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_isDragging && oldWidget.speed != widget.speed) {
      _localSpeed = widget.speed.toDouble();
    }
  }

  Future<void> _updateSpeed(double val) async {
    final int finalSpeed = val.round();
    try {
      await _firebase.setBlowerSpeed(widget.id, finalSpeed);
      Fluttertoast.showToast(
        msg: '${widget.name} speed set to $finalSpeed%',
        backgroundColor: Colors.amber[800],
        textColor: Colors.white,
      );
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Gagal mengatur kecepatan!',
        backgroundColor: Colors.red,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    int rpm = ((_localSpeed / 100) * 2480).round();
    final bool disabled = widget.isDisabled;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1E293B),
            Color(0xFF162032),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'AIRFLOW MANAGEMENT',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Colors.grey[500],
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.name,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE2E8F0),
                      height: 1.1,
                    ),
                  ),
                  const Text(
                    'Control',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFE2E8F0),
                      height: 1.1,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (disabled)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'AUTO',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFD97706),
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  Text(
                    rpm.toString(),
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w500,
                      color: Colors.amber[600],
                      height: 1,
                    ),
                  ),
                  Text(
                    'RPM',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: Colors.amber[600],
              inactiveTrackColor: const Color(0xFF334155),
              thumbColor: Colors.amber[400],
              overlayColor: Colors.amber.withOpacity(0.2),
              trackHeight: 18,
              thumbShape: const RoundSliderThumbShape(
                enabledThumbRadius: 16,
                elevation: 4,
                pressedElevation: 6,
              ),
            ),
            child: Slider(
              value: _localSpeed,
              min: 0,
              max: 100,
              onChangeStart: disabled ? null : (_) => setState(() => _isDragging = true),
              onChanged: disabled ? null : (val) {
                setState(() {
                  _localSpeed = val;
                });
              },
              onChangeEnd: disabled ? null : (val) {
                setState(() => _isDragging = false);
                _updateSpeed(val);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Text('OFF',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey)),
                Text('50%',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey)),
                Text('MAX',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
