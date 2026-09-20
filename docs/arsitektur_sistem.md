# Arsitektur Sistem Pengering Surya IoT (Solar Dryer)

Berikut adalah diagram yang mengilustrasikan bagaimana sistem perangkat keras (ESP32), database (Firebase), dan antarmuka pengguna (React Web & Flutter App) Anda bekerja dan saling terhubung.

```mermaid
graph TD
    %% Styling
    classDef hardware fill:#f9d0c4,stroke:#333,stroke-width:2px;
    classDef cloud fill:#bce4ff,stroke:#333,stroke-width:2px;
    classDef frontend fill:#c4f9d0,stroke:#333,stroke-width:2px;
    classDef user fill:#fff3c4,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;

    %% Nodes
    subgraph "Hardware (Perangkat Keras)"
        ESP32["ESP32 Microcontroller<br/>(Otak Sistem)"]:::hardware
        SensorDHT["Sensor Suhu & Kelembaban"]:::hardware
        Blower["Blower / Kipas<br/>(Aktuator)"]:::hardware
    end

    subgraph "Cloud & Backend"
        Firebase["Firebase Realtime Database<br/>(Penyimpanan Data)"]:::cloud
    end

    subgraph "User Interfaces (Antarmuka Pengguna)"
        ReactWeb["React Web Dashboard<br/>(Akses via Browser)"]:::frontend
        FlutterApp["Flutter Mobile App<br/>(Akses via Smartphone)"]:::frontend
    end
    
    Users["Pengguna (User / Admin)"]:::user

    %% Connections
    SensorDHT -- "Membaca Kondisi" --> ESP32
    ESP32 -- "Kirim Data Sensor" --> Firebase
    Firebase -- "Kirim Perintah" --> ESP32
    ESP32 -- "Hidup/Mati" --> Blower

    ReactWeb -- "Ambil Data Historis & Real-time" --> Firebase
    ReactWeb -- "Kirim Perintah Kontrol" --> Firebase
    
    FlutterApp -- "Ambil Data Historis & Real-time" --> Firebase
    FlutterApp -- "Kirim Perintah Kontrol" --> Firebase

    Users -- "Memantau & Mengontrol" --> ReactWeb
    Users -- "Memantau & Mengontrol" --> FlutterApp
```

### Penjelasan Alur Kerja Sistem:

1. **Pengumpulan Data (Hardware):** Sensor (seperti sensor suhu DHT) membaca kondisi di dalam alat pengering surya. Otak dari perangkat keras, yaitu **ESP32**, mengambil data ini.
2. **Pengiriman ke Cloud:** ESP32 terkoneksi ke internet melalui Wi-Fi dan mengirimkan data sensor tersebut ke **Firebase Realtime Database**.
3. **Pemantauan (Monitoring):** Aplikasi yang Anda buat, baik **React Web Dashboard** maupun **Flutter Mobile App**, terhubung langsung ke Firebase. Ketika ada data baru dari ESP32, aplikasi akan otomatis memperbarui tampilan grafik dan angka di layar secara *real-time*.
4. **Pengendalian (Controlling):** Pengguna dapat menekan tombol kontrol (misalnya untuk menyalakan kipas/blower secara manual atau mengatur mode auto) melalui Web atau Aplikasi. Perintah ini dikirim ke Firebase.
5. **Eksekusi Fisik:** ESP32 selalu memantau (mendengarkan) perubahan data di Firebase. Ketika melihat ada perintah baru, ESP32 akan langsung mengalirkan listrik ke **Blower/Kipas** untuk menyalakannya sesuai instruksi.
