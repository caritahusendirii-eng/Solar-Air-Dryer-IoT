# Solar-Air-Dryer-IoT (Smart AC Dashboard)

An Internet of Things (IoT)-based smart solar drying system designed to monitor and optimize the drying process in real-time. This project leverages robust cloud infrastructure and database systems to ensure efficient operation.

Aplikasi monitoring suhu & kelembaban dan kontrol Blower AC menggunakan ESP32, DHT22, Relay 2 Channel, dengan dashboard **React (Web)** dan **Flutter (Mobile)**.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────┐
│                  HARDWARE                        │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐  │
│  │  DHT22   │───▶│  ESP32   │───▶│ Relay 2CH │  │
│  │ (Sensor) │    │          │    │           │  │
│  └──────────┘    └────┬─────┘    └─────┬─────┘  │
│                       │ WiFi           │         │
│                       │          ┌─────┴─────┐   │
│                       │          │ Blower AC  │   │
│                       │          │  1 & 2     │   │
│                       │          └───────────┘   │
└───────────────────────┼──────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │    Firebase      │
              │ Realtime Database│
              └────────┬────────┘
                       │
            ┌──────────┼──────────┐
            ▼                     ▼
   ┌────────────────┐   ┌────────────────┐
   │  React Web     │   │  Flutter App   │
   │  Dashboard     │   │  (Mobile)      │
   └────────────────┘   └────────────────┘
```

---

## Wiring Diagram ESP32

```
ESP32 Pin Connections:
═══════════════════════════════════════════════════

  DHT22 Sensor                ESP32
  ┌──────────┐              ┌──────────┐
  │ VCC (1)  │─────────────▶│ 3.3V     │
  │ DATA (2) │──┬──────────▶│ GPIO 4   │
  │ NC (3)   │  │           │          │
  │ GND (4)  │──┼──────────▶│ GND      │
  └──────────┘  │           │          │
                R (10kΩ)    │          │
                │           │          │
               3.3V         │          │
                            │          │
  Relay 2 Channel           │          │
  ┌──────────┐              │          │
  │ VCC      │─────────────▶│ 5V (VIN) │
  │ GND      │─────────────▶│ GND      │
  │ IN1      │─────────────▶│ GPIO 26  │  ──▶ Blower AC 1
  │ IN2      │─────────────▶│ GPIO 27  │  ──▶ Blower AC 2
  └──────────┘              └──────────┘

  Relay Output (NO - Normally Open):
  ┌──────────────────────────────────────┐
  │ Relay CH1 ──▶ Blower AC 1 (220V AC) │
  │ Relay CH2 ──▶ Blower AC 2 (220V AC) │
  └──────────────────────────────────────┘

  ⚠️ PERHATIAN: Koneksi 220V AC harus dilakukan
     oleh teknisi berpengalaman!
```

### Tabel Pin

| Komponen       | Pin Komponen | Pin ESP32 |
|----------------|-------------|-----------|
| DHT22 VCC      | Pin 1       | 3.3V      |
| DHT22 DATA     | Pin 2       | GPIO 4    |
| DHT22 GND      | Pin 4       | GND       |
| Relay VCC      | VCC         | 5V (VIN)  |
| Relay GND      | GND         | GND       |
| Relay IN1      | IN1         | GPIO 26   |
| Relay IN2      | IN2         | GPIO 27   |

> **Catatan:** Pasang resistor pull-up 10kΩ antara pin DATA DHT22 dan 3.3V.

---

## Komponen yang Dibutuhkan

| No | Komponen             | Jumlah | Keterangan              |
|----|----------------------|--------|-------------------------|
| 1  | ESP32 DevKit V1      | 1      | Board utama             |
| 2  | DHT22 Sensor         | 1      | Sensor suhu & kelembaban|
| 3  | Relay Module 2CH     | 1      | 5V Active Low           |
| 4  | Blower AC            | 2      | 220V AC                 |
| 5  | Resistor 10kΩ        | 1      | Pull-up DHT22           |
| 6  | Breadboard           | 1      | Prototyping             |
| 7  | Kabel Jumper         | ~10    | Male-Male / Male-Female |
| 8  | Power Supply 5V      | 1      | Untuk ESP32             |

---

## Alur Kerja Sistem (Flow)

```
┌──────────────────────────────────────────────────────────────────┐
│                        ALUR KERJA                                │
│                                                                  │
│  1. ESP32 membaca sensor DHT22 setiap 5 detik                   │
│     │                                                            │
│     ▼                                                            │
│  2. Data suhu & kelembaban dikirim ke Firebase Realtime DB       │
│     │                                                            │
│     ▼                                                            │
│  3. React (Web) dan Flutter (Mobile) menerima data realtime      │
│     │                                                            │
│     ▼                                                            │
│  4. User melihat dashboard: suhu, kelembaban, grafik historis    │
│     │                                                            │
│     ▼                                                            │
│  5. User menekan tombol ON/OFF blower di dashboard               │
│     │                                                            │
│     ▼                                                            │
│  6. Status blower ditulis ke Firebase                            │
│     │                                                            │
│     ▼                                                            │
│  7. ESP32 mendengarkan perubahan (stream) dari Firebase          │
│     │                                                            │
│     ▼                                                            │
│  8. ESP32 mengaktifkan/menonaktifkan relay sesuai perintah       │
│     │                                                            │
│     ▼                                                            │
│  9. Blower AC menyala/mati                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Setup Firebase

### 1. Buat Project Firebase
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Klik **Add Project** → beri nama, misal: `smart-ac-dashboard`
3. Aktifkan **Realtime Database** → pilih region → Start in **Test Mode**
4. Aktifkan **Authentication** → Email/Password

### 2. Buat User untuk ESP32
Di Firebase Console → Authentication → Add User:
- Email: `esp32@smartac.com`
- Password: `esp32password123`

### 3. Struktur Database

```json
{
  "sensor_data": {
    "temperature": 28.5,
    "humidity": 65.2,
    "timestamp": 1711234567890
  },
  "blowers": {
    "blower1": {
      "name": "Blower AC 1",
      "status": false
    },
    "blower2": {
      "name": "Blower AC 2",
      "status": false
    }
  },
  "history": {
    "-NxABC123": {
      "temperature": 28.5,
      "humidity": 65.2,
      "timestamp": 1711234567890
    }
  }
}
```

### 4. Security Rules (Production)

```json
{
  "rules": {
    "sensor_data": {
      ".read": true,
      ".write": "auth != null"
    },
    "blowers": {
      ".read": true,
      ".write": true
    },
    "history": {
      ".read": true,
      ".write": "auth != null",
      ".indexOn": ["timestamp"]
    }
  }
}
```

---

## Setup ESP32

### 1. Install Arduino IDE Libraries
Buka Arduino IDE → Library Manager, install:
- **Firebase ESP Client** by Mobizt
- **DHT sensor library** by Adafruit
- **Adafruit Unified Sensor**

### 2. Konfigurasi Board
- Board: **ESP32 Dev Module**
- Upload Speed: **115200**
- Flash Size: **4MB**

### 3. Edit Konfigurasi
Buka file `esp32/smart_ac.ino`, ubah bagian ini:

```cpp
#define WIFI_SSID     "NamaWiFiAnda"
#define WIFI_PASSWORD "PasswordWiFiAnda"

#define API_KEY       "AIzaSy..."           // dari Firebase Console
#define DATABASE_URL  "https://xxx.firebaseio.com"
#define USER_EMAIL    "esp32@smartac.com"
#define USER_PASSWORD "esp32password123"
```

### 4. Upload ke ESP32
1. Hubungkan ESP32 via USB
2. Pilih port COM yang sesuai
3. Klik **Upload**
4. Buka **Serial Monitor** (115200 baud) untuk melihat log

---

## Setup React Web Dashboard

### 1. Install Dependencies
```bash
cd react-dashboard
npm install
```

### 2. Konfigurasi Firebase
Edit file `src/firebase.js` dengan data dari Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "smart-ac-dashboard.firebaseapp.com",
  databaseURL: "https://smart-ac-dashboard-default-rtdb.firebaseio.com",
  projectId: "smart-ac-dashboard",
  storageBucket: "smart-ac-dashboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

> Data ini bisa didapat di: Firebase Console → Project Settings → General → Your apps → Web app (</>) → Config

### 3. Jalankan
```bash
npm start
```
Buka browser di `http://localhost:3000`

---

## Setup Flutter Mobile App

### 1. Buat Project Flutter
```bash
flutter create --org com.smartac smart_ac_dashboard
```
Kemudian timpa folder `lib/` dengan file dari `flutter_dashboard/lib/`.

### 2. Install Dependencies
```bash
cd smart_ac_dashboard
flutter pub get
```

### 3. Konfigurasi Firebase
Gunakan **FlutterFire CLI**:
```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=smart-ac-dashboard
```

Ini akan otomatis membuat file `firebase_options.dart`.

Update `lib/main.dart`:
```dart
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const SmartACApp());
}
```

### 4. Android: Minimum SDK
Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    minSdkVersion 21
}
```

### 5. Jalankan
```bash
flutter run
```

---

## Cara Mendapatkan Firebase Config

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project Anda
3. Klik gear icon ⚙️ → **Project Settings**
4. Scroll ke bawah → **Your apps**
5. **Untuk Web (React):** Klik icon `</>` → Register app → Copy config
6. **Untuk Android (Flutter):** Klik icon Android → Download `google-services.json`
7. **Untuk ESP32:** Copy `apiKey` dan `databaseURL` dari config

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| ESP32 tidak konek WiFi | Periksa SSID & password, pastikan 2.4GHz |
| Data tidak muncul di dashboard | Periksa Firebase URL dan API key |
| Relay tidak bekerja | Periksa wiring IN1/IN2, pastikan relay active LOW |
| DHT22 read failed | Periksa wiring, tambahkan resistor pull-up 10kΩ |
| Firebase permission denied | Periksa security rules, pastikan auth aktif |

---

## Struktur Project

```
smart-ac-dashboard/
├── esp32/
│   └── smart_ac.ino              # Firmware ESP32
├── react-dashboard/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.jsx               # Main React component
│       ├── App.css               # Styles
│       ├── index.js              # Entry point
│       ├── firebase.js           # Firebase config
│       └── components/
│           ├── SensorCard.jsx    # Kartu sensor
│           ├── BlowerControl.jsx # Kontrol blower
│           └── SensorChart.jsx   # Grafik historis
├── flutter_dashboard/
│   ├── pubspec.yaml
│   └── lib/
│       ├── main.dart             # Entry point Flutter
│       ├── screens/
│       │   └── dashboard_screen.dart
│       ├── widgets/
│       │   ├── sensor_card.dart
│       │   ├── blower_control.dart
│       │   └── chart_widget.dart
│       └── services/
│           └── firebase_service.dart
└── README.md
```
