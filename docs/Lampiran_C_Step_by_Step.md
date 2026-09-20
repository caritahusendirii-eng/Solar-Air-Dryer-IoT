# LAMPIRAN C - LANGKAH-LANGKAH PEMBUATAN SISTEM

## Panduan Step-by-Step Pembuatan Sistem Solar Dryer IoT dari Awal hingga Akhir

---

## TAHAP 1: PERSIAPAN HARDWARE

### 1.1 Komponen yang Dibutuhkan

| No | Komponen | Jumlah | Keterangan |
|----|----------|--------|------------|
| 1 | ESP32 DevKit V1 | 1 | Mikrokontroler utama |
| 2 | Sensor DHT22 | 10 | Sensor suhu & kelembaban |
| 3 | BTS7960 Motor Driver | 1 | Driver blower PWM |
| 4 | Blower/Kipas DC | 1 | Aktuator pengeringan |
| 5 | RTC DS3231 | 1 | Modul jam real-time |
| 6 | Micro SD Card Module | 1 | Logging data offline |
| 7 | Micro SD Card | 1 | Media penyimpanan |
| 8 | Resistor 4.7kΩ | 10 | Pull-up untuk DHT22 |
| 9 | Breadboard & Kabel | Secukupnya | Koneksi komponen |

### 1.2 Wiring / Rangkaian

| Komponen | Pin ESP32 | Keterangan |
|----------|-----------|------------|
| DHT22 Sensor 1-10 | GPIO 32, 33, 25, 27, 26, 14, 17, 13, 16, 4 | Data pin masing-masing sensor |
| BTS7960 RPWM | GPIO 2 | Sinyal PWM kecepatan |
| BTS7960 R_EN & L_EN | GPIO 15 | Enable driver motor |
| BTS7960 LPWM | GND | Ground |
| SD Card CS | GPIO 5 | SPI Chip Select |
| SD Card SCK | GPIO 18 | SPI Clock |
| SD Card MISO | GPIO 19 | SPI Data Out |
| SD Card MOSI | GPIO 23 | SPI Data In |
| RTC DS3231 SDA | GPIO 21 | I2C Data |
| RTC DS3231 SCL | GPIO 22 | I2C Clock |

---

## TAHAP 2: SETUP FIREBASE

### 2.1 Membuat Project Firebase
1. Buka https://console.firebase.google.com/
2. Klik "Add Project" → beri nama "solar-air-dryer-iot"
3. Nonaktifkan Google Analytics (opsional) → klik "Create Project"

### 2.2 Mengaktifkan Firebase Authentication
1. Di console Firebase, buka menu **Authentication**
2. Klik tab **Sign-in method**
3. Aktifkan provider **Email/Password**
4. Klik **Save**

### 2.3 Membuat User Pertama (Admin)
1. Di tab **Users**, klik **Add User**
2. Masukkan email dan password untuk akun admin
3. Catat email dan password untuk digunakan di firmware ESP32

### 2.4 Setup Realtime Database
1. Buka menu **Realtime Database**
2. Klik **Create Database**
3. Pilih lokasi server: `asia-southeast1`
4. Pilih **Start in test mode** (akan diubah nanti)
5. Setelah database dibuat, klik tab **Rules** dan masukkan rules berikut:

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

### 2.5 Mendapatkan Konfigurasi Firebase
1. Di Project Settings → General → Your apps
2. Klik ikon **Web (</>)** → Register app
3. Catat konfigurasi: `apiKey`, `authDomain`, `databaseURL`, `projectId`, dll.

---

## TAHAP 3: PEMROGRAMAN FIRMWARE ESP32

### 3.1 Setup Arduino IDE
1. Install **Arduino IDE** (v2.x)
2. Tambahkan ESP32 Board Manager URL di Preferences:
   `https://dl.espressif.com/dl/package_esp32_index.json`
3. Install board **ESP32** dari Board Manager

### 3.2 Install Library yang Dibutuhkan
Melalui Library Manager Arduino IDE, install:
- `Firebase ESP Client` (by Mobizt)
- `DHT sensor library` (by Adafruit)
- `RTClib` (by Adafruit)
- `SD` (built-in)

### 3.3 Konfigurasi Firmware & Auto Mode
Buka file `smart_ac.ino` dan sesuaikan:
```cpp
#define WIFI_SSID     "NamaWiFiAnda"
#define WIFI_PASSWORD "PasswordWiFi"
#define API_KEY       "AIzaSy..."    // Dari Firebase
#define DATABASE_URL  "https://...firebasedatabase.app/"
#define USER_EMAIL    "admin@email.com"
#define USER_PASSWORD "password123"
```
Sistem ini menggunakan logika *hybrid* Otomatis dan Manual. Secara default, ESP32 mendengarkan node `/control_mode` di Firebase untuk beralih mode. Pada mode Otomatis, kecepatan blower disesuaikan otomatis (0-100%) berdasarkan hasil rata-rata suhu DHT22.

### 3.4 Upload Firmware
1. Hubungkan ESP32 ke komputer via USB
2. Pilih board: **ESP32 Dev Module**
3. Pilih port COM yang sesuai
4. Klik **Upload**
5. Buka Serial Monitor (115200 baud) untuk memverifikasi

### 3.5 Verifikasi
Di Serial Monitor, pastikan muncul:
- `[1/5] Init 10 sensor DHT22... OK`
- `[2/5] Init kipas (BTS7960 + LEDC PWM)... OK`
- `[3/5] Init RTC DS3231... OK`
- `[4/5] Init SD Card... OK`
- `[5/5] Koneksi WiFi & Firebase...`
- `✅ Sistem siap!`

---

## TAHAP 4: PEMBUATAN WEB DASHBOARD (React.js)

### 4.1 Persiapan Environment (Software Tools)
Sebelum memulai pembuatan aplikasi web, pastikan Anda telah menginstal:
1. **Node.js**: Unduh dan install Node.js (disarankan versi 18 LTS ke atas) dari situs resminya. Instalasi Node.js sudah otomatis menyertakan NPM (Node Package Manager).
2. **Code Editor**: Visual Studio Code (VS Code) direkomendasikan untuk mempermudah penulisan kode React.
3. **Git**: (Opsional) untuk mengelola *version control* project Anda.

### 4.2 Inisialisasi Project
```bash
npx create-react-app react-dashboard
cd react-dashboard
```

### 4.3 Install Dependencies
```bash
npm install firebase react-hot-toast react-icons recharts
npm install @capacitor/core @capacitor/cli @capacitor/filesystem @capacitor/share
```

### 4.4 Struktur Folder
```
react-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── BlowerControl.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ManagementPage.jsx
│   │   ├── SensorCard.jsx
│   │   └── SensorChart.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── firebase.js
│   ├── index.js
│   └── parseCsv.js
├── capacitor.config.ts
└── package.json
```

### 4.5 Langkah Pembuatan File (Urutan)

**Step 1**: Buat `src/firebase.js` - Konfigurasi koneksi Firebase
**Step 2**: Buat `src/contexts/AuthContext.jsx` - Autentikasi, session, RBAC
**Step 3**: Buat `src/components/SensorCard.jsx` - Kartu sensor rata-rata & individual
**Step 4**: Buat `src/components/SensorChart.jsx` - Grafik tren Recharts
**Step 5**: Buat `src/components/BlowerControl.jsx` - Slider kontrol PWM
**Step 6**: Buat `src/components/LoginPage.jsx` - Halaman login
**Step 7**: Buat `src/components/ManagementPage.jsx` - Manajemen user & role
**Step 8**: Buat `src/parseCsv.js` - Parser CSV untuk data dummy
**Step 9**: Buat `src/App.jsx` - Komponen utama dengan tab navigation
**Step 10**: Buat `src/App.css` - Styling lengkap (1675 baris)
**Step 11**: Buat `src/index.js` - Entry point React dengan AuthProvider

### 4.6 Menjalankan Development Server
```bash
npm start
```
Buka browser di `http://localhost:3000`

### 4.7 Build untuk Production
```bash
npm run build
```

### 4.8 Deploy ke Netlify
1. Buat akun di https://app.netlify.com/
2. Drag & drop folder `build/` ke Netlify
3. Atau hubungkan repository GitHub untuk auto-deploy
4. URL deploy: `https://solardryeriot.netlify.app/`

---

## TAHAP 5: PEMBUATAN MOBILE APP (Flutter)

### 5.1 Persiapan Environment (Software Tools)
Pembuatan aplikasi Android native dengan Flutter membutuhkan instalasi *environment* khusus:
1. **Flutter SDK**: Unduh Flutter SDK terbaru dari situs resminya. Ekstrak, lalu tambahkan folder `flutter/bin` ke System Environment Variables (Path) di Windows Anda.
2. **Android Studio**: Install Android Studio. Buka pengaturan SDK Manager dan pastikan **Android SDK Platform** (versi terbaru) dan **Android SDK Command-line Tools** telah dicentang dan terinstall.
3. **VS Code Extensions**: Di VS Code Anda, cari dan install ekstensi "Flutter" dan "Dart".
4. Jalankan perintah `flutter doctor` di terminal/command prompt. Pastikan semuanya tercentang hijau (tidak ada error).

### 5.2 Inisialisasi Project Flutter
```bash
flutter create --org com.solardryer flutter_dashboard
cd flutter_dashboard
```

### 5.3 Install Dependencies
Edit `pubspec.yaml` dan tambahkan:
```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.8.1
  firebase_database: ^11.2.1
  fl_chart: ^0.69.2
  google_fonts: ^6.2.1
  fluttertoast: ^8.2.8
```
Jalankan: `flutter pub get`

### 5.4 Konfigurasi Firebase untuk Android
1. Di Firebase Console → Project Settings → Add app → Android
2. Package name: `com.solardryer.iot`
3. Download `google-services.json`
4. Letakkan di `android/app/google-services.json`
5. Edit `android/build.gradle` dan `android/app/build.gradle` sesuai petunjuk Firebase

### 5.5 Struktur Folder Flutter
```
flutter_dashboard/lib/
├── main.dart
├── screens/
│   └── dashboard_screen.dart
├── services/
│   └── firebase_service.dart
└── widgets/
    ├── blower_control.dart
    ├── chart_widget.dart
    └── sensor_card.dart
```

### 5.6 Langkah Pembuatan File (Urutan)

**Step 1**: Buat `lib/services/firebase_service.dart` - Layanan akses Firebase
**Step 2**: Buat `lib/widgets/sensor_card.dart` - Widget kartu sensor
**Step 3**: Buat `lib/widgets/blower_control.dart` - Widget kontrol blower
**Step 4**: Buat `lib/widgets/chart_widget.dart` - Widget grafik fl_chart
**Step 5**: Buat `lib/screens/dashboard_screen.dart` - Layar utama dashboard
**Step 6**: Buat `lib/main.dart` - Entry point aplikasi

### 5.7 Build APK
```bash
flutter build apk --debug
```
File APK tersedia di: `build/app/outputs/flutter-apk/app-debug.apk`

---

## TAHAP 6: KONVERSI WEB KE ANDROID (Capacitor)

### 6.1 Inisialisasi Capacitor
```bash
cd react-dashboard
npx cap init "Solar Dryer IoT" com.solardryer.iot
npx cap add android
```

### 6.2 Konfigurasi Capacitor (`capacitor.config.ts`)
```typescript
const config: CapacitorConfig = {
  appId: 'com.solardryer.iot',
  appName: 'Solar Dryer IoT',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    url: 'https://solardryeriot.netlify.app',
  },
};
```

### 6.3 Build & Sync
```bash
npm run build
npx cap sync android
```

### 6.4 Build APK via Gradle
```bash
cd android
./gradlew assembleDebug
```

---

## TAHAP 7: PENGUJIAN SISTEM

### 7.1 Pengujian Hardware
1. Verifikasi pembacaan 10 sensor DHT22 di Serial Monitor
2. Verifikasi kontrol blower PWM (0%, 50%, 100%)
3. Verifikasi logging SD Card (cek file data.csv)
4. Verifikasi koneksi WiFi dan Firebase

### 7.2 Pengujian Web Dashboard
1. Login dengan akun admin
2. Verifikasi data real-time muncul di Dashboard
3. Verifikasi kontrol blower melalui tab Control
4. Verifikasi tabel data historis di tab Data
5. Verifikasi export CSV berfungsi
6. Verifikasi management user (ubah role, hapus akses)

### 7.3 Pengujian Mobile App
1. Install APK di perangkat Android
2. Verifikasi data sensor muncul real-time
3. Verifikasi kontrol blower via slider
4. Verifikasi grafik historis

### 7.4 Pengujian RBAC
1. Login dengan akun role "guess" → hanya bisa melihat Dashboard
2. Login dengan role "view_data" → Dashboard + Data
3. Login dengan role "eksekusi_data" → Dashboard + Control + Data
4. Login dengan role "report_data" → Dashboard + Data + Export
5. Login dengan role "admin" → Semua fitur

---

## TAHAP 8: DEPLOYMENT FINAL

### 8.1 Checklist Deployment
- [ ] Firebase Authentication aktif
- [ ] Firebase RTDB rules sudah benar
- [ ] Web dashboard di-deploy ke Netlify
- [ ] APK React (Capacitor) dibangun
- [ ] APK Flutter dibangun
- [ ] ESP32 firmware ter-upload dan berjalan
- [ ] Semua sensor terbaca dengan benar
- [ ] Blower merespons perintah dari dashboard
- [ ] Data historis tersimpan di Firebase dan SD Card
