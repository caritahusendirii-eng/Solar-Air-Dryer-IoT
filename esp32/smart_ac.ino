/*
 * SOLAR DRYER IOT - ESP32 FIRMWARE (AUTO + MANUAL VERSION + NTP RTC
 * CALIBRATION)
 * ================================
 * This system monitors 5 DHT22 sensors & 5 DS18B20 sensors, logs data to SD
 * card, and syncs with Firebase RTDB. Blower supports AUTO and MANUAL mode
 * control. RTC automatically calibrates via Internet (NTP) on startup.
 * * HARDWARE WIRING:
 * -------------------------------------------------------------
 * Component         | ESP32 Pin | Details
 * ------------------|-----------|------------------------------
 * DHT22 (1-5)       | 32, 33, 25, 27, 26
 * DS18B20 (6-10)    | 14, 17, 13, 16, 4  <-- PASTIKAN PAKAI RESISTOR
 * PULL-UP 4.7K Blower 1 (RPWM)   |  2        | Connect to RPWM on BTS7960
 * Blower 1 (Enable) | 15        | R_EN & L_EN on BTS7960
 * Blower 1 (LPWM)   | GND       | Connect to ESP32 GND
 * SD Card CS        | 5         | SPI CS
 * SD Card SCK       | 18        | SPI SCK
 * SD Card MISO      | 19        | SPI MISO
 * SD Card MOSI      | 23        | SPI MOSI
 * RTC SDA           | 21        | I2C SDA
 * RTC SCL           | 22        | I2C SCL
 * -------------------------------------------------------------
 */

#include "time.h" // LIBRARY TAMBAHAN UNTUK NTP WAKTU INTERNET
#include <DHT.h>
#include <DallasTemperature.h>
#include <Firebase_ESP_Client.h>
#include <OneWire.h>
#include <RTClib.h>
#include <SD.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>
#include <addons/RTDBHelper.h>
#include <addons/TokenHelper.h>

// ======================== KONFIGURASI ========================

// WiFi Credentials
// ⚠️ GANTI DENGAN KREDENSIAL ANDA SEBELUM UPLOAD KE ESP32
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Define Firebase credentials
// ⚠️ GANTI DENGAN KREDENSIAL FIREBASE ANDA
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL                                                           \
  "https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase."     \
  "app/"
#define USER_EMAIL "YOUR_EMAIL@example.com"
#define USER_PASSWORD "YOUR_PASSWORD"

// === DHT22 Sensor (5 unit pertama) ===
#define DHTTYPE DHT22
#define JUMLAH_DHT 5
int dhtPins[JUMLAH_DHT] = {32, 33, 25, 27, 26};
DHT dhtSensors[JUMLAH_DHT] = {DHT(32, DHTTYPE), DHT(33, DHTTYPE),
                              DHT(25, DHTTYPE), DHT(27, DHTTYPE),
                              DHT(26, DHTTYPE)};

// === DS18B20 Sensor (5 unit terakhir) ===
#define JUMLAH_DS 5
int dsPins[JUMLAH_DS] = {14, 17, 13, 16, 4};
OneWire oneWire[JUMLAH_DS] = {OneWire(14), OneWire(17), OneWire(13),
                              OneWire(16), OneWire(4)};
DallasTemperature ds18b20[JUMLAH_DS] = {
    DallasTemperature(&oneWire[0]), DallasTemperature(&oneWire[1]),
    DallasTemperature(&oneWire[2]), DallasTemperature(&oneWire[3]),
    DallasTemperature(&oneWire[4])};

// === Total Sensor ===
#define JUMLAH_SENSOR (JUMLAH_DHT + JUMLAH_DS)

// === Kipas / Blower (BTS7960) ===
#define JUMLAH_KIPAS 1
int relayPins[JUMLAH_KIPAS] = {2};   // Pin RPWM (Sinyal PWM Speed)
int enablePins[JUMLAH_KIPAS] = {15}; // Pin R_EN & L_EN (Enable)

// PWM Config for ESP32 (LEDC) - v3.x API (no channel needed)
#define PWM_FREQ 25000   // 25kHz - optimal untuk BTS7960
#define PWM_RESOLUTION 8 // 8-bit (0-255)

// === SD Card ===
#define SD_CS_PIN 5

// === Interval (ms) ===
#define SENSOR_INTERVAL 60000
#define HISTORY_INTERVAL 60000

// ======================== VARIABEL GLOBAL ========================

RTC_DS3231 rtc;
bool sdReady = false;

FirebaseData fbdo;
FirebaseData streamFans;
FirebaseData streamMode;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

float sensorTemp[JUMLAH_SENSOR];
float sensorHum[JUMLAH_SENSOR];
float avgTemp = 0;
float avgHum = 0;

int kipasSpeed[JUMLAH_KIPAS] = {0};
String controlMode = "auto"; // Mode kontrol: "auto" atau "manual"

unsigned long lastSensorRead = 0;
unsigned long lastHistoryPush = 0;
unsigned long lastWiFiCheck = 0;
int lastLoggedMinute = -1;

// ======================== HELPER ========================

String getHumidityCategory(float h) {
  if (h < 30)
    return "Rendah";
  else if (h <= 60)
    return "Sedang";
  return "Tinggi";
}

void setBlowerSpeed(int idx, int speedPct) {
  if (idx < 0 || idx >= JUMLAH_KIPAS)
    return;
  if (speedPct < 0)
    speedPct = 0;
  if (speedPct > 100)
    speedPct = 100;

  kipasSpeed[idx] = speedPct;
  if (relayPins[idx] >= 0) {
    int pwmValue = map(speedPct, 0, 100, 0, 255);

    // Logika khusus BTS7960: Nyalakan Enable pin saat kecepatan > 0
    if (speedPct > 0) {
      digitalWrite(enablePins[idx], HIGH); // Aktifkan driver
      ledcWrite(relayPins[idx], pwmValue); // Kirim sinyal PWM (v3.x: pakai PIN)
    } else {
      ledcWrite(relayPins[idx], 0);       // Hentikan PWM (v3.x: pakai PIN)
      digitalWrite(enablePins[idx], LOW); // Matikan driver (hemat daya)
    }
  }
  Serial.printf("  Kipas %d → %d%% (%s)\n", idx + 1, speedPct,
                controlMode.c_str());
}

// ======================== MANUAL SYNC ========================

void syncManualSpeed() {
  if (!Firebase.ready())
    return;
  for (int i = 0; i < JUMLAH_KIPAS; i++) {
    String key = "/blowers/blower" + String(i + 1) + "/speed";
    if (Firebase.RTDB.getInt(&fbdo, key)) {
      int speed = fbdo.intData();
      Serial.printf("  [MANUAL] Sync Blower %d → %d%%\n", i + 1, speed);
      setBlowerSpeed(i, speed);
    }
  }
}

// ======================== AUTO CONTROL ========================

void autoControlBlower() {
  // Pastikan ada sensor yang valid sebelum menjalankan mode otomatis
  if (avgTemp == 0 && avgHum == 0)
    return;

  int targetSpeed = 0;

  // Logika penentuan kecepatan dari suhu yang paling tinggi ke rendah
  if (avgTemp >= 55.0) {
    targetSpeed = 100;
  } else if (avgTemp >= 49.0) {
    targetSpeed = 75;
  } else if (avgTemp >= 42.0) {
    targetSpeed = 50;
  } else if (avgTemp >= 35.0) {
    targetSpeed = 25;
  } else {
    targetSpeed = 0;
  }

  Serial.printf("  [AUTO] Avg Temp: %.1f°C → Speed: %d%%\n", avgTemp,
                targetSpeed);
  setBlowerSpeed(0, targetSpeed);

  // Sinkronkan speed ke Firebase agar dashboard selalu up-to-date
  // Update KEDUA blower agar dashboard konsisten (blower2 juga ikut auto)
  if (Firebase.ready()) {
    Firebase.RTDB.setInt(&fbdo, "/blowers/blower1/speed", targetSpeed);
    Firebase.RTDB.setInt(&fbdo, "/blowers/blower2/speed", targetSpeed);
  }
}

// ======================== WIFI ========================

void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    Serial.print(".");
    delay(500);
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(
        "\n❌ Connection Failed! System will continue and retry in loop.");
  } else {
    Serial.printf("\n✅ Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
  }
}

// ======================== NTP SYNC WAKTU ========================

void syncNTPtoRTC() {
  const char *ntpServer = "pool.ntp.org";
  const long gmtOffset_sec = 25200; // Offset WIB = 7 jam * 3600
  const int daylightOffset_sec = 0;

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Mengambil waktu dari NTP Server...");

  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 10000)) { // Tunggu maksimal 10 detik
    // Update RTC dengan waktu dari Internet
    rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1,
                        timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min,
                        timeinfo.tm_sec));
    Serial.println("✅ RTC berhasil dikalibrasi via Internet (NTP)!");
  } else {
    Serial.println(
        "❌ Gagal sinkronisasi NTP, menggunakan waktu RTC yang ada.");
  }
}

// ======================== FIREBASE ========================

void fanStreamCallback(FirebaseStream data) {
  if (controlMode != "manual")
    return;

  String path = data.dataPath();
  String type = data.dataType();

  // Case 1: Direct integer update (e.g. path = "/blower1/speed", type = "int")
  if (type == "int" || type == "double" || type == "float") {
    for (int i = 0; i < JUMLAH_KIPAS; i++) {
      if (path == "/blower" + String(i + 1) + "/speed") {
        Serial.printf("  [MANUAL] Stream: Blower %d → %d%%\n", i + 1,
                      data.intData());
        setBlowerSpeed(i, data.intData());
        break;
      }
    }
    return;
  }

  // Case 2: JSON update (Firebase batched multiple changes)
  if (type == "json") {
    FirebaseJson json;
    json.setJsonData(data.payload());

    if (path == "/") {
      // Full object: {"blower1":{"speed":50},"blower2":{"speed":75}}
      for (int i = 0; i < JUMLAH_KIPAS; i++) {
        FirebaseJsonData result;
        if (json.get(result, "blower" + String(i + 1) + "/speed")) {
          int speed = result.intValue;
          Serial.printf("  [MANUAL] JSON root: Blower %d → %d%%\n", i + 1,
                        speed);
          setBlowerSpeed(i, speed);
        }
      }
    } else {
      // Sub-object: path = "/blower1", data = {"speed":50}
      for (int i = 0; i < JUMLAH_KIPAS; i++) {
        if (path == "/blower" + String(i + 1)) {
          FirebaseJsonData result;
          if (json.get(result, "speed")) {
            int speed = result.intValue;
            Serial.printf("  [MANUAL] JSON sub: Blower %d → %d%%\n", i + 1,
                          speed);
            setBlowerSpeed(i, speed);
          }
          break;
        }
      }
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout)
    Serial.println("Stream timeout, resuming...");
}

void controlModeCallback(FirebaseStream data) {
  if (data.dataType() != "string")
    return;
  String newMode = data.stringData();
  if (newMode == "auto" || newMode == "manual") {
    controlMode = newMode;
    Serial.printf("  [MODE] Kontrol diubah ke: %s\n", controlMode.c_str());

    if (controlMode == "auto") {
      autoControlBlower();
    } else {
      // Mode manual: baca speed terakhir dari Firebase
      syncManualSpeed();
    }
  }
}

void controlModeTimeoutCallback(bool timeout) {
  if (timeout)
    Serial.println("Control mode stream timeout, resuming...");
}

void initFirebase() {
  fbConfig.api_key = API_KEY;
  fbConfig.database_url = DATABASE_URL;
  fbAuth.user.email = USER_EMAIL;
  fbAuth.user.password = USER_PASSWORD;
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectNetwork(true);

  Serial.println("Menunggu autentikasi Firebase...");
  int timeout = 0;
  while (!Firebase.ready() && timeout < 50) {
    delay(100);
    timeout++;
  }

  if (Firebase.ready()) {
    Serial.println("Firebase terhubung!");
  } else {
    Serial.println(
        "Firebase Auth Timeout (menunggu WiFi terhubung di background...)");
  }

  // Baca speed terakhir dari Firebase (jangan reset ke 0!)
  for (int i = 0; i < JUMLAH_KIPAS; i++) {
    String key = "/blowers/blower" + String(i + 1);
    if (Firebase.RTDB.getInt(&fbdo, key + "/speed")) {
      int savedSpeed = fbdo.intData();
      setBlowerSpeed(i, savedSpeed);
      Serial.printf("  Blower %d: speed dari Firebase = %d%%\n", i + 1,
                    savedSpeed);
    } else {
      // Pertama kali: set default
      Firebase.RTDB.setInt(&fbdo, key + "/speed", 0);
      Firebase.RTDB.setString(&fbdo, key + "/name", "Blower " + String(i + 1));
      Serial.printf("  Blower %d: default 0%% (pertama kali)\n", i + 1);
    }
  }

  // Baca mode terakhir dari Firebase (jangan overwrite!)
  if (Firebase.RTDB.getString(&fbdo, "/control_mode")) {
    controlMode = fbdo.stringData();
    if (controlMode != "auto" && controlMode != "manual") {
      controlMode = "auto"; // Fallback jika nilai tidak valid
    }
    Serial.printf("  Mode dari Firebase: %s\n", controlMode.c_str());
  } else {
    // Pertama kali: belum ada data, set default "auto"
    Firebase.RTDB.setString(&fbdo, "/control_mode", "auto");
    controlMode = "auto";
    Serial.println("  Mode default: auto (pertama kali)");
  }

  // Stream listener untuk blower speed (mode manual)
  Firebase.RTDB.beginStream(&streamFans, "/blowers");
  Firebase.RTDB.setStreamCallback(&streamFans, fanStreamCallback,
                                  streamTimeoutCallback);

  // Stream listener untuk control mode (auto/manual switch)
  Firebase.RTDB.beginStream(&streamMode, "/control_mode");
  Firebase.RTDB.setStreamCallback(&streamMode, controlModeCallback,
                                  controlModeTimeoutCallback);
}

// ======================== HELPER JSON ========================

void buildDetailedJson(FirebaseJson &json, DateTime now) {
  FirebaseJsonArray sensors;

  char dateBuf[11];
  sprintf(dateBuf, "%04d-%02d-%02d", now.year(), now.month(), now.day());
  char timeBuf[9];
  sprintf(timeBuf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());

  json.set("avg_t", avgTemp);
  json.set("avg_h", avgHum);
  json.set("tanggal", dateBuf);
  json.set("waktu", timeBuf);

  for (int i = 0; i < JUMLAH_SENSOR; i++) {
    FirebaseJson s;
    s.set("sensor", i + 1);

    if (isnan(sensorTemp[i])) {
      s.set("t", "null");
    } else {
      s.set("t", sensorTemp[i]);
    }

    if (isnan(sensorHum[i])) {
      s.set("h", "null");
    } else {
      s.set("h", sensorHum[i]);
    }

    sensors.add(s);
  }
  json.set("sensor_data", sensors);
}

// ======================== BACA SENSOR ========================

void readAllSensors() {
  float totalT = 0, totalH = 0;
  int validCountT = 0, validCountH = 0;

  DateTime now = rtc.now();
  Serial.printf("\n=== %04d-%02d-%02d %02d:%02d:%02d ===\n", now.year(),
                now.month(), now.day(), now.hour(), now.minute(), now.second());

  // === Baca DHT22 (Sensor 1-5) ===
  for (int i = 0; i < JUMLAH_DHT; i++) {
    sensorTemp[i] = dhtSensors[i].readTemperature();
    sensorHum[i] = dhtSensors[i].readHumidity();

    if (!isnan(sensorTemp[i]) && !isnan(sensorHum[i])) {
      totalT += sensorTemp[i];
      totalH += sensorHum[i];
      validCountT++;
      validCountH++;
      Serial.printf("  DHT  %2d: %.1f°C | %.1f%% (%s)\n", i + 1, sensorTemp[i],
                    sensorHum[i], getHumidityCategory(sensorHum[i]).c_str());
    } else {
      Serial.printf("  DHT  %2d: GAGAL\n", i + 1);
    }
  }

  // === Baca DS18B20 (Sensor 6-10) ===
  for (int i = 0; i < JUMLAH_DS; i++) {
    ds18b20[i].requestTemperatures();
    float t = ds18b20[i].getTempCByIndex(0);
    int sensorIdx = JUMLAH_DHT + i;

    if (t != DEVICE_DISCONNECTED_C && t > -50 && t < 125) {
      sensorTemp[sensorIdx] = t;
      sensorHum[sensorIdx] = NAN; // DS18B20 tidak punya humidity
      totalT += t;
      validCountT++;
      Serial.printf("  DS18 %2d: %.1f°C\n", sensorIdx + 1, t);
    } else {
      sensorTemp[sensorIdx] = NAN;
      sensorHum[sensorIdx] = NAN;
      Serial.printf("  DS18 %2d: GAGAL\n", sensorIdx + 1);
    }
  }

  if (validCountT > 0 || validCountH > 0) {
    avgTemp = (validCountT > 0) ? totalT / validCountT : 0;
    avgHum = (validCountH > 0) ? totalH / validCountH : 0;
    Serial.printf("  Rata-rata : %.1f°C | %.1f%% (%d+%d sensor valid)\n",
                  avgTemp, avgHum, validCountT, validCountH);

    // Jalankan auto control jika mode otomatis
    if (controlMode == "auto") {
      autoControlBlower();
    }
  }

  if (Firebase.ready()) {
    FirebaseJson detailedData;
    buildDetailedJson(detailedData, now);
    Firebase.RTDB.setJSON(&fbdo, "/sensor_data", &detailedData);
  }

  if (sdReady && now.minute() != lastLoggedMinute) {
    lastLoggedMinute = now.minute();
    logToSD(now);
  }
}

// ======================== SD CARD LOGGING ========================

void logToSD(DateTime now) {
  String logLine = String(now.year()) + "-" + (now.month() < 10 ? "0" : "") +
                   String(now.month()) + "-" + (now.day() < 10 ? "0" : "") +
                   String(now.day()) + "," + (now.hour() < 10 ? "0" : "") +
                   String(now.hour()) + ":" + (now.minute() < 10 ? "0" : "") +
                   String(now.minute()) + ":" + (now.second() < 10 ? "0" : "") +
                   String(now.second());

  for (int i = 0; i < JUMLAH_SENSOR; i++) {
    if (!isnan(sensorTemp[i])) {
      logLine += "," + String(sensorTemp[i], 1);
    } else {
      logLine += ",NAN";
    }
    if (!isnan(sensorHum[i])) {
      logLine += "," + String(sensorHum[i], 1);
    } else {
      logLine += ",NAN";
    }
  }

  File dataFile = SD.open("/data.csv", FILE_APPEND);
  if (dataFile) {
    dataFile.println(logLine);
    dataFile.close();
    Serial.println("  SD: Data disimpan");
  } else {
    Serial.println("  SD: Gagal menyimpan!");
  }
}

// ======================== FIREBASE HISTORY ========================

void pushHistory() {
  if (avgTemp == 0 && avgHum == 0)
    return;
  if (!Firebase.ready())
    return;

  DateTime now = rtc.now();
  FirebaseJson entry;
  buildDetailedJson(entry, now);
  entry.set("timestamp/.sv", "timestamp");

  if (Firebase.RTDB.pushJSON(&fbdo, "/history", &entry)) {
    Serial.println("  Firebase: History pushed (detailed)");
  }
}

// ======================== SETUP ========================

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n=============================");
  Serial.println("  Solar Dryer IoT - AUTO + MANUAL");
  Serial.println("=============================\n");

  // --- Init DHT22 Sensor ---
  Serial.println("[1/6] Init sensor DHT22...");
  for (int i = 0; i < JUMLAH_DHT; i++) {
    dhtSensors[i].begin();
  }
  Serial.println("      OK");

  // --- Init DS18B20 Sensor ---
  Serial.println("[2/6] Init sensor DS18B20...");
  for (int i = 0; i < JUMLAH_DS; i++) {
    ds18b20[i].begin();
    Serial.printf("      DS18B20 %d → GPIO %d\n", i + 1, dsPins[i]);
  }

  // --- Init Kipas (BTS7960 via LEDC PWM) ---
  Serial.println("[3/6] Init kipas (BTS7960 + LEDC PWM)...");
  for (int i = 0; i < JUMLAH_KIPAS; i++) {
    if (relayPins[i] >= 0) {
      // Setup LEDC PWM — ESP32 Core v3.x API (no channel needed)
      ledcAttach(relayPins[i], PWM_FREQ, PWM_RESOLUTION);

      pinMode(enablePins[i], OUTPUT);   // Set pin enable sebagai output
      digitalWrite(enablePins[i], LOW); // Matikan driver saat boot
      ledcWrite(relayPins[i], 0);       // Set kecepatan 0 (v3.x: pakai PIN)

      Serial.printf(
          "      Kipas %d → PWM: GPIO %d (%dHz, %d-bit), EN: GPIO %d\n", i + 1,
          relayPins[i], PWM_FREQ, PWM_RESOLUTION, enablePins[i]);
    }
  }

  // --- Init RTC DS3231 ---
  Serial.println("[4/6] Init RTC DS3231...");
  Wire.begin(21, 22);
  if (!rtc.begin()) {
    Serial.println("      GAGAL! RTC tidak terdeteksi.");
    while (1)
      ;
  }

  if (rtc.lostPower()) {
    Serial.println(
        "      RTC kehilangan daya, waktu tidak valid sampai NTP sinkron.");
  }

  DateTime now = rtc.now();
  Serial.printf("      Waktu Awal RTC → %04d-%02d-%02d %02d:%02d:%02d\n",
                now.year(), now.month(), now.day(), now.hour(), now.minute(),
                now.second());

  // --- Init SD Card ---
  Serial.println("[5/6] Init SD Card...");
  if (SD.begin(SD_CS_PIN)) {
    sdReady = true;
    if (!SD.exists("/data.csv")) {
      File f = SD.open("/data.csv", FILE_WRITE);
      if (f) {
        String header = "Tanggal,Waktu";
        for (int i = 1; i <= JUMLAH_SENSOR; i++) {
          header += ",T" + String(i) + ",H" + String(i);
        }
        f.println(header);
        f.close();
        Serial.println("      Header CSV dibuat");
      }
    }
    Serial.println("      OK");
  } else {
    Serial.println("      GAGAL! Lanjut tanpa SD logging.");
  }

  // --- WiFi + NTP + Firebase ---
  Serial.println("[6/6] Koneksi WiFi, NTP & Firebase...");
  connectWiFi();

  // Sinkronisasi waktu otomatis setelah WiFi terhubung
  if (WiFi.status() == WL_CONNECTED) {
    syncNTPtoRTC();
  }

  initFirebase();

  Serial.println("\n✅ Sistem siap! Mode: " + controlMode + "\n");
}

// ======================== LOOP ========================

void loop() {
  unsigned long now = millis();

  // Baca sensor setiap 1 menit
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    readAllSensors();
  }

  // Push history ke Firebase setiap 1 menit
  if (now - lastHistoryPush >= HISTORY_INTERVAL) {
    lastHistoryPush = now;
    pushHistory();
  }

  // Reconnect WiFi otomatis jika terputus
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWiFiCheck >= 15000) {
      lastWiFiCheck = now;
      Serial.println(
          "⏳ WiFi terputus, mencoba memanggil ulang WiFi.reconnect()...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}
