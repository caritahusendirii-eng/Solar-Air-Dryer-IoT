# LAMPIRAN A - DOKUMENTASI KODE SUMBER (BAGIAN 3)

## Komponen React (Lanjutan) & Flutter Mobile App

---

### File: `react-dashboard/src/components/ManagementPage.jsx`
**Deskripsi**: Halaman manajemen user (khusus Admin) untuk mengubah role, melihat status online, dan menghapus akses user.

```jsx
import React, { useState, useEffect, useMemo } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { IoPeopleOutline, IoTrashOutline, IoShieldCheckmarkOutline, IoEllipseSharp } from "react-icons/io5";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  { value: "guess", label: "Guess", desc: "Dashboard only" },
  { value: "view_data", label: "View Data", desc: "Dashboard + Data" },
  { value: "eksekusi_data", label: "Eksekusi Data", desc: "Dashboard + Control + Data" },
  { value: "report_data", label: "Report Data", desc: "Dashboard + Data + Export" },
  { value: "admin", label: "Admin", desc: "Full Access" },
];

export default function ManagementPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState({});
  const [userAkses, setUserAkses] = useState({});
  const [presence, setPresence] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = onValue(ref(database, "/users"), (snap) => setUsers(snap.exists() ? snap.val() : {}));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(database, "/user_akses"), (snap) => setUserAkses(snap.exists() ? snap.val() : {}));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(database, "/presence"), (snap) => setPresence(snap.exists() ? snap.val() : {}));
    return () => unsub();
  }, []);

  const userList = useMemo(() => {
    const list = [];
    Object.entries(users).forEach(([uid, userData]) => {
      const akses = userAkses[uid] || {};
      list.push({
        uid, email: userData.email || "N/A",
        displayName: userData.displayName || "-",
        role: akses.role || "guess",
        lastLogin: userData.lastLogin || null,
        isSelf: uid === currentUser?.uid,
      });
    });
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return list.filter((u) => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
    }
    return list;
  }, [users, userAkses, currentUser, searchQuery]);

  const handleRoleChange = async (uid, newRole) => {
    try {
      await set(ref(database, `user_akses/${uid}`), { role: newRole, updatedAt: Date.now() });
      toast.success("Role berhasil diperbarui!");
    } catch (err) { toast.error("Gagal memperbarui role."); }
  };

  const handleDeleteAccess = async (uid, email) => {
    if (!window.confirm(`Hapus akses untuk ${email}?`)) return;
    try {
      await remove(ref(database, `user_akses/${uid}`));
      toast.success("Akses berhasil dihapus.");
    } catch (err) { toast.error("Gagal menghapus akses."); }
  };

  // ... render table with user list, role select, delete button
}
```

---

### File: `react-dashboard/src/App.jsx` (Komponen Utama)
**Deskripsi**: Komponen utama yang mengelola state global, tab navigation, listener Firebase, dan rendering semua halaman (Dashboard, Control, Data, Management).

**Fitur Utama dalam App.jsx:**
- Listener real-time ke 4 node Firebase: `/sensor_data`, `/blowers`, `/control_mode`, `/history`
- Tab navigation dengan filter RBAC berdasarkan role user
- Status koneksi (online/offline) berdasarkan timestamp terakhir (threshold 120 detik)
- Normalisasi data 10 sensor ke array tetap
- Master blower control (mengatur semua blower sekaligus)
- Tabel data historis dengan search, pagination, dan sorting
- Export CSV dengan dukungan native (Capacitor) dan web (Blob download)

```jsx
// Kode lengkap App.jsx terdapat di file asli:
// react-dashboard/src/App.jsx (596 baris)
// Lihat Lampiran A1 untuk referensi kode ESP32
```

---

### File: `react-dashboard/capacitor.config.ts`
**Deskripsi**: Konfigurasi Capacitor untuk build APK Android dari React web app.

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solardryer.iot',
  appName: 'Solar Dryer IoT',
  webDir: 'build',
  android: {
    backgroundColor: '#fffcf2',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    url: 'https://solardryeriot.netlify.app',
    cleartext: true,
  },
};

export default config;
```

---

### File: `react-dashboard/database.rules.json`
**Deskripsi**: Aturan keamanan Firebase Realtime Database.

```json
{
  "rules": {
    "sensor_data": { ".read": true, ".write": true },
    "blowers": { ".read": true, ".write": true },
    "control_mode": { ".read": true, ".write": true },
    "history": { ".read": true, ".write": true },
    "users": {
      ".read": "auth != null && root.child('user_akses').child(auth.uid).child('role').val() === 'admin'",
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "user_akses": {
      ".read": "auth != null && root.child('user_akses').child(auth.uid).child('role').val() === 'admin'",
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && (root.child('user_akses').child(auth.uid).child('role').val() === 'admin' || !data.exists())"
      }
    }
  }
}
```

---

## 3. FLUTTER MOBILE APP

### File: `flutter_dashboard/lib/main.dart`
**Deskripsi**: Entry point aplikasi Flutter dengan tema dark mode Material3.

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const SmartACApp());
}

class SmartACApp extends StatelessWidget {
  const SmartACApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart AC Dashboard',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF3B82F6), brightness: Brightness.dark),
      ),
      home: const DashboardScreen(),
    );
  }
}
```

---

### File: `flutter_dashboard/lib/services/firebase_service.dart`
**Deskripsi**: Layanan akses Firebase Realtime Database untuk Flutter.

```dart\nimport 'package:firebase_database/firebase_database.dart';

class FirebaseService {
  final DatabaseReference _db = FirebaseDatabase.instance.ref();

  Stream<DatabaseEvent> get sensorDataStream =>
      _db.child('sensor_data').onValue;

  Stream<DatabaseEvent> get blowersStream =>
      _db.child('blowers').onValue;

  Stream<DatabaseEvent> get historyStream =>
      _db.child('history').orderByChild('timestamp').limitToLast(1000).onValue;

  Stream<DatabaseEvent> get controlModeStream =>
      _db.child('control_mode').onValue;

  Future<void> setBlowerSpeed(String blowerId, int speed) async {
    await _db.child('blowers/$blowerId/speed').set(speed);
  }

  Future<void> setControlMode(String mode) async {
    await _db.child('control_mode').set(mode);
  }
}
\n```

---

### File: `flutter_dashboard/lib/widgets/sensor_card.dart`
**Deskripsi**: Widget kartu sensor dengan indikator warna status dinamis.

```dart
import 'package:flutter/material.dart';

class SensorCard extends StatelessWidget {
  final String type;
  final double? value;
  final String unit;

  const SensorCard({super.key, required this.type, required this.value, required this.unit});

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

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF162032)]),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(children: [
        Icon(isTemp ? Icons.thermostat_rounded : Icons.water_drop_rounded, size: 48, color: statusColor),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(isTemp ? 'SUHU' : 'KELEMBABAN', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
          Text(value != null ? value!.toStringAsFixed(1) : '--',
            style: TextStyle(fontSize: 36, fontWeight: FontWeight.w800, color: statusColor)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(50)),
            child: Text(statusText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor)),
          ),
        ])),
      ]),
    );
  }
}
```

---

### File: `flutter_dashboard/lib/widgets/blower_control.dart`
**Deskripsi**: Widget slider untuk mengontrol kecepatan blower via Firebase.

```dart\nimport 'package:flutter/material.dart';
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
\n```

---

### File: `flutter_dashboard/lib/widgets/chart_widget.dart`
**Deskripsi**: Widget grafik garis menggunakan fl_chart untuk visualisasi data historis sensor.

```dart
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
        gradient: const LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF162032)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Grafik Sensor (1 Jam Terakhir)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 20),
        data.isEmpty
          ? const SizedBox(height: 200, child: Center(child: Text('Belum ada data historis...')))
          : SizedBox(height: 220, child: LineChart(_buildChart())),
      ]),
    );
  }

  LineChartData _buildChart() {
    final tempSpots = <FlSpot>[];
    final humSpots = <FlSpot>[];
    for (int i = 0; i < data.length; i++) {
      tempSpots.add(FlSpot(i.toDouble(), (data[i]['temperature'] as num?)?.toDouble() ?? 0));
      humSpots.add(FlSpot(i.toDouble(), (data[i]['humidity'] as num?)?.toDouble() ?? 0));
    }
    return LineChartData(
      lineBarsData: [
        LineChartBarData(spots: tempSpots, isCurved: true, color: Colors.orange, barWidth: 2.5),
        LineChartBarData(spots: humSpots, isCurved: true, color: Colors.blue, barWidth: 2.5),
      ],
    );
  }
}
```

---

### File: `flutter_dashboard/lib/screens/dashboard_screen.dart`
**Deskripsi**: Layar utama dashboard Flutter yang menampilkan sensor, blower control, dan grafik.

```dart
// Kode lengkap: 269 baris
// Mendengarkan stream: sensor_data, blowers, history
// Heartbeat timer: cek koneksi setiap 5 detik (threshold 120 detik)
// Layout: SliverAppBar + SliverList dengan SensorCard, BlowerControl, SensorChartWidget
```

---

## 4. KONFIGURASI PROJECT

### File: `react-dashboard/package.json`

```json
{
  "name": "smart-ac-dashboard",
  "version": "1.0.0",
  "dependencies": {
    "@capacitor/android": "^8.2.0",
    "@capacitor/core": "^8.2.0",
    "@capacitor/filesystem": "^8.1.2",
    "@capacitor/share": "^8.0.1",
    "firebase": "^10.14.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "react-icons": "^5.3.0",
    "react-scripts": "5.0.1",
    "recharts": "^2.13.3"
  }
}
```

### File: `flutter_dashboard/pubspec.yaml`

```yaml
name: smart_ac_dashboard
description: Solar Dryer IoT - Flutter Mobile App
version: 1.0.0+1
environment:
  sdk: ">=3.0.0 <4.0.0"
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.8.1
  firebase_database: ^11.2.1
  fl_chart: ^0.69.2
  google_fonts: ^6.2.1
  fluttertoast: ^8.2.8
```
