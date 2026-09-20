import React, { useState, useEffect, useMemo } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from "./firebase";
import { useAuth, canAccessTab, canExport, isSuperAdmin } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import SensorCard, { IndividualSensorCard } from "./components/SensorCard";
import BlowerControl from "./components/BlowerControl";
import SensorChart from "./components/SensorChart";
import LoginPage from "./components/LoginPage";
import ManagementPage from "./components/ManagementPage";
import MaintenancePage from "./components/MaintenancePage";
import OverloadPage from "./components/OverloadPage";
import SiteStatusPanel from "./components/SiteStatusPanel";
import { WiDaySunny } from "react-icons/wi";
import {
  IoStatsChartOutline,
  IoSettingsOutline,
  IoDocumentTextOutline,
  IoLockClosedOutline,
  IoCloudDownloadOutline,
  IoSearchOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoLogOutOutline,
  IoPeopleOutline,
  IoTrashOutline,
} from "react-icons/io5";
import { FaFan } from "react-icons/fa";
import LiveClock from "./components/LiveClock";
import { parseDummyCsv } from "./parseCsv";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import "./App.css";

const USE_DUMMY = false;

// Sensor display names mapping (1-indexed)
const SENSOR_NAMES = {
  1: "DHT Inlet",
  2: "DHT Kanan",
  3: "DHT Outlet",
  4: "DHT Tengah",
  5: "DHT Kiri",
  6: "PCM 1",
  7: "PCM 2",
  8: "PCM 3",
  9: "PCM 4",
  10: "PCM 5",
};

const DUMMY_BLOWERS = {
  blower1: { name: "Blower 1", speed: 50 },
  blower2: { name: "Blower 2", speed: 0 },
};

// All available tabs with minimum role requirement
// Note: site-status is hidden from nav but accessible via Ctrl+Shift+S or triple-click brand title
const ALL_TABS = [
  { id: "dashboard", label: "Dashboard", icon: <IoStatsChartOutline size={22} /> },
  { id: "control", label: "Control", icon: <IoSettingsOutline size={22} /> },
  { id: "data", label: "Data", icon: <IoDocumentTextOutline size={22} /> },
  { id: "management", label: "Management", icon: <IoPeopleOutline size={22} /> },
];

function App() {
  const { currentUser, userRole, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sensorData, setSensorData] = useState({ avg_t: null, avg_h: null, sensor_data: [], waktu: null, tanggal: null, lastUpdatedAt: null });
  const [blowers, setBlowers] = useState(USE_DUMMY ? DUMMY_BLOWERS : {});
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [controlMode, setControlMode] = useState("auto");
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteStatus, setSiteStatus] = useState("live");
  const [siteStatusLoading, setSiteStatusLoading] = useState(true);

  // Filter tabs based on user role
  const visibleTabs = useMemo(() => {
    if (!userRole) return [];
    return ALL_TABS.filter((t) => canAccessTab(userRole, t.id));
  }, [userRole, currentUser]);

  // Reset to dashboard if current tab is not accessible
  useEffect(() => {
    if (userRole && activeTab === "site-status") {
      // site-status is hidden but accessible — only super admin can stay
      if (!currentUser || !isSuperAdmin(currentUser.email)) {
        setActiveTab("dashboard");
      }
    } else if (userRole && !canAccessTab(userRole, activeTab)) {
      setActiveTab("dashboard");
    }
  }, [userRole, activeTab, currentUser]);

  // Hidden shortcut: Ctrl+Shift+S to access Site Status panel (super admin only)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (currentUser && isSuperAdmin(currentUser.email)) {
          setActiveTab((prev) => {
            const next = prev === "site-status" ? "dashboard" : "site-status";
            toast(next === "site-status" ? "🔓 Site Status Panel" : "Kembali ke Dashboard", { duration: 1500 });
            return next;
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentUser]);

  useEffect(() => {
    if (!USE_DUMMY) return;
    fetch("/dummy_data.csv")
      .then((r) => r.text())
      .then((text) => {
        const parsed = parseDummyCsv(text);
        if (parsed.length > 0) {
          setHistory(parsed);
          const last = parsed[parsed.length - 1];
          setSensorData({ temperature: last.temperature, humidity: last.humidity, timestamp: last.timestamp });
          setConnected(true);
        }
      })
      .catch((e) => console.error("Failed to load dummy CSV:", e));
  }, []);

  useEffect(() => {
    if (USE_DUMMY) return;

    const sensorRef = ref(database, "/sensor_data");
    const unsubSensor = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setSensorData({ ...val, lastUpdatedAt: Date.now() });
        setConnected(true);
      } else {
        setConnected(false);
      }
    });

    const blowerRef = ref(database, "/blowers");
    const unsubBlower = onValue(blowerRef, (snapshot) => {
      if (snapshot.exists()) {
        setBlowers(snapshot.val());
      }
    });

    const controlRef = ref(database, "/control_mode");
    const unsubControl = onValue(controlRef, (snapshot) => {
      if (snapshot.exists()) {
        const mode = snapshot.val();
        if (mode === "auto" || mode === "manual") {
          setControlMode(mode);
        }
      }
    });

    const displayRef = ref(database, "/display_speed");
    const unsubDisplay = onValue(displayRef, (snapshot) => {
      if (snapshot.exists()) {
        setDisplaySpeed(snapshot.val());
      }
    });

    const historyRef = ref(database, "/history");
    const unsubHistory = onValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const entries = [];
        snapshot.forEach((child) => {
          entries.push(child.val());
        });
        setHistory(entries);
      } else {
        setHistory([]);
      }
    });

    return () => { unsubSensor(); unsubBlower(); unsubControl(); unsubDisplay(); unsubHistory(); };
  }, []);

  // Listen to site status from Firebase
  useEffect(() => {
    const statusRef = ref(database, "/site_status/mode");
    const unsub = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setSiteStatus(snapshot.val());
      } else {
        setSiteStatus("live");
      }
      setSiteStatusLoading(false);
    }, () => {
      // Error reading (e.g. permission denied) — default to live
      setSiteStatusLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sensorData.lastUpdatedAt) {
        const diff = Date.now() - sensorData.lastUpdatedAt;
        setConnected(diff < 120000);
      } else {
        setConnected(false);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [sensorData.lastUpdatedAt]);

  // Fungsi hitung kecepatan otomatis dari suhu rata-rata
  // (logika IDENTIK dengan autoControlBlower() di ESP32)
  const calcAutoSpeed = (avgT) => {
    if (avgT == null || avgT === 0) return 0;
    if (avgT >= 55.0) return 100;
    if (avgT >= 49.0) return 75;
    if (avgT >= 42.0) return 50;
    if (avgT >= 35.0) return 25;
    return 0;
  };

  // Kecepatan otomatis dihitung dari suhu rata-rata sensor
  const autoSpeed = useMemo(() => calcAutoSpeed(sensorData.avg_t), [sensorData.avg_t]);

  // Sinkronisasi background ke Firebase
  // PENTING: JANGAN tulis /control_mode di sini! Itu hanya boleh diubah
  // oleh handleModeChange() agar tidak menimpa mode auto dari ESP32.
  useEffect(() => {
    if (USE_DUMMY) return;

    if (controlMode === "auto") {
      // Mode auto: hitung kecepatan dari suhu, tulis ke Firebase
      // agar blower selalu sesuai parameter suhu rata-rata
      const writeAutoSpeed = async () => {
        try {
          await set(ref(database, "/blowers/blower1/speed"), autoSpeed);
          await set(ref(database, "/blowers/blower2/speed"), autoSpeed);
          await set(ref(database, "/display_speed"), autoSpeed);
        } catch (e) { /* silent */ }
      };
      writeAutoSpeed();
      return;
    }

    // Mode manual: sinkronkan displaySpeed ke Firebase setiap 3 detik
    const sync = setInterval(async () => {
      try {
        await set(ref(database, "/blowers/blower1/speed"), Number(displaySpeed));
        await set(ref(database, "/blowers/blower2/speed"), Number(displaySpeed));
        await set(ref(database, "/display_speed"), Number(displaySpeed));
      } catch (e) { /* silent */ }
    }, 3000);
    return () => clearInterval(sync);
  }, [displaySpeed, controlMode, autoSpeed]);

  const blowerEntries = useMemo(() => {
    return Array.from({ length: 2 }, (_, i) => {
      const id = `blower${i + 1}`;
      const blower = blowers[id] || { name: `Blower ${i + 1}`, speed: 0 };
      // Auto mode: gunakan kecepatan hasil perhitungan dari suhu rata-rata
      // Manual mode: gunakan displaySpeed (user yang kontrol via slider)
      const speed = controlMode === "auto" ? autoSpeed : displaySpeed;
      return [id, { ...blower, speed }];
    });
  }, [blowers, displaySpeed, controlMode, autoSpeed]);

  const activeCount = blowerEntries.filter(([, b]) => b.speed > 0).length;

  // Ensure sensor_data is always a normalized array of 10 sensors
  const sensorList = useMemo(() => {
    const raw = Array.isArray(sensorData.sensor_data) ? sensorData.sensor_data : [];
    return Array.from({ length: 10 }, (_, i) => {
      const found = raw.find((s) => s.sensor === i + 1);
      return found || { sensor: i + 1, t: "null", h: "null" };
    });
  }, [sensorData.sensor_data]);

  const handleModeChange = async (mode) => {
    setControlMode(mode);
    if (USE_DUMMY) return;
    try {
      if (mode === "auto") {
        // Auto mode: kirim "auto" ke Firebase, biarkan ESP32 kontrol blower
        await set(ref(database, "/control_mode"), "auto");
      } else {
        // Manual mode: kirim "manual" + set kedua blower ke displaySpeed
        await set(ref(database, "/control_mode"), "manual");
        await set(ref(database, "/blowers/blower1/speed"), Number(displaySpeed));
        await set(ref(database, "/blowers/blower2/speed"), Number(displaySpeed));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDummySpeed = (id, newSpeed) => {
    setBlowers((prev) => ({
      ...prev,
      [id]: { ...prev[id], speed: newSpeed },
    }));
  };

  const handleMasterSpeedChange = async (newSpeed) => {
    if (USE_DUMMY) {
      handleDummySpeed("blower1", newSpeed);
      handleDummySpeed("blower2", newSpeed);
      return;
    }
    try {
      const speed = Number(newSpeed);
      setDisplaySpeed(speed);
      await set(ref(database, "/display_speed"), speed);
      // 1:1 mapping — kirim speed langsung ke kedua blower
      await set(ref(database, "/blowers/blower1/speed"), speed);
      await set(ref(database, "/blowers/blower2/speed"), speed);
    } catch (e) {
      console.error("Failed to update master speed:", e);
    }
  };

  const filteredHistory = useMemo(() => {
    let list = history.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        (item.tanggal && item.tanggal.toLowerCase().includes(q)) ||
        (item.waktu && item.waktu.toLowerCase().includes(q))
      );
    }
    return list;
  }, [history, searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / rowsPerPage) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredHistory.slice(start, start + rowsPerPage);
  }, [filteredHistory, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowsPerPage]);

  const exportToCSV = async () => {
    if (history.length === 0) return;

    // Headers
    let csvContent = "Tanggal,Waktu,Avg T,Avg H,DHT Inlet-T,DHT Inlet-H,DHT Kanan-T,DHT Kanan-H,DHT Outlet-T,DHT Outlet-H,DHT Tengah-T,DHT Tengah-H,DHT Kiri-T,DHT Kiri-H,PCM 1-T,PCM 1-H,PCM 2-T,PCM 2-H,PCM 3-T,PCM 3-H,PCM 4-T,PCM 4-H,PCM 5-T,PCM 5-H\n";

    // Rows
    history.slice().reverse().forEach(entry => {
      const sMap = {};
      if (Array.isArray(entry.sensor_data)) {
        entry.sensor_data.forEach((s) => { sMap[s.sensor] = s; });
      }

      const row = [
        entry.tanggal || "",
        entry.waktu || "",
        entry.avg_t ?? "",
        entry.avg_h ?? ""
      ];

      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(sId => {
        const s = sMap[sId];
        row.push(s ? s.t : "");
        row.push(s ? s.h : "");
      });

      csvContent += row.join(",") + "\n";
    });

    const fileName = `history_sensor_${new Date().toISOString().split('T')[0]}.csv`;

    // Use Capacitor Filesystem + Share on native (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        // Write CSV file to app cache directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: csvContent,
          directory: Directory.Cache,
          encoding: 'utf8',
        });

        // Share the file so user can save/open it
        await Share.share({
          title: 'Export Data Sensor',
          text: 'Data riwayat sensor Solar Dryer IoT',
          url: result.uri,
          dialogTitle: 'Simpan atau bagikan file CSV',
        });

        toast.success('File CSV berhasil diekspor!');
      } catch (err) {
        console.error('Export error:', err);
        // User cancelled share dialog is not an error
        if (err.message && err.message.includes('cancel')) return;
        toast.error('Gagal mengekspor file CSV');
      }
    } else {
      // Web fallback: use Blob + anchor download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleResetHistory = async () => {
    if (USE_DUMMY) {
      toast.error("Mode Dummy aktif. Tidak bisa menghapus data.");
      return;
    }
    const password = window.prompt("Masukkan password untuk mereset riwayat:");
    if (password !== "12345678") {
      if (password !== null) {
        toast.error("Password salah! Reset dibatalkan.");
      }
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus SEMUA data history sensor?\nData yang dihapus tidak dapat dikembalikan!")) {
      try {
        await remove(ref(database, "/history"));
        toast.success("Riwayat data berhasil dihapus!");
      } catch (err) {
        console.error("Gagal menghapus riwayat:", err);
        toast.error("Gagal menghapus riwayat!");
      }
    }
  };

  // Show loading spinner
  if (loading || siteStatusLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-lg" />
        <p className="loading-text">Memuat...</p>
      </div>
    );
  }

  // Show login page if not authenticated (Everyone must log in first)
  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage />
      </>
    );
  }

  // Site status check — block non-super-admin users after login
  if (siteStatus !== "live") {
    const isBypass = currentUser && isSuperAdmin(currentUser.email);
    if (!isBypass) {
      // Show maintenance or overload page
      if (siteStatus === "maintenance") {
        return (
          <>
            <Toaster position="top-right" />
            <MaintenancePage />
          </>
        );
      }
      if (siteStatus === "overload") {
        return (
          <>
            <Toaster position="top-right" />
            <OverloadPage />
          </>
        );
      }
    }
  }

  return (
    <div className="app">
      <Toaster position="top-right" />

      <header className="header">
        <div className="brand">
          <WiDaySunny className="brand-sun" size={40} />
          <div>
            <h1
              className="brand-title"
              onClick={(e) => {
                // Triple-click brand title to toggle Site Status (super admin only)
                if (e.detail === 3 && currentUser && isSuperAdmin(currentUser.email)) {
                  setActiveTab((prev) => prev === "site-status" ? "dashboard" : "site-status");
                  toast(activeTab === "site-status" ? "Kembali ke Dashboard" : "🔓 Site Status Panel", { duration: 1500 });
                }
              }}
            >
              Solar Dryer IoT
            </h1>
          </div>
        </div>
        <div className="header-right">
          <LiveClock />
          <div className={`sys-badge ${connected ? "online" : "offline"}`}>
            <span className="sys-dot" />
            {connected ? "System Online" : "System Offline"}
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <IoLogOutOutline size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {activeTab === "dashboard" && (
        <main className="tab-content">
          {/* Real-time timestamp info */}
          <div className="rt-info-bar card">
            <div className="rt-info-col">
              <span className="rt-info-label">Tanggal</span>
              <span className="rt-info-val">{sensorData.tanggal || "--"}</span>
            </div>
            <div className="rt-info-sep" />
            <div className="rt-info-col">
              <span className="rt-info-label">Waktu</span>
              <span className="rt-info-val">{sensorData.waktu || "--"}</span>
            </div>
          </div>

          {/* Average summary cards */}
          <div className="avg-row">
            <SensorCard type="temperature" value={sensorData.avg_t} />
            <SensorCard type="humidity" value={sensorData.avg_h} />
          </div>

          {/* Individual sensor grid */}
          <div className="ind-sensors-card card">
            <h3 className="sec-title rt-sec-title">📡 Data Sensor Individual (Real-Time)</h3>
            <div className="ind-sensor-grid">
              {sensorList.map((s) => (
                <IndividualSensorCard key={s.sensor} sensor={s} name={SENSOR_NAMES[s.sensor]} />
              ))}
            </div>
          </div>

          {/* Chart */}
          <SensorChart data={history} />
        </main>
      )}

      {activeTab === "control" && canAccessTab(userRole, "control") && (
        <main className="tab-content">
          <div className="status-summary card">
            <div className="summary-col">
              <span className="summary-label">Status Sistem:</span>
              <span className={`summary-val ${connected ? "accent" : "offline-text"}`}>
                {connected ? "Online" : "Offline"}
              </span>
              <span className="summary-key">Update: {sensorData.waktu || "--"}</span>
            </div>
            <div className="summary-col right">
              <span className="summary-label">Blower Aktif:</span>
              <span className="summary-val accent">{activeCount} dari {blowerEntries.length}</span>
              <span className="summary-key">blower</span>
            </div>
          </div>

          <div className="fan-section card">
            <h3 className="sec-title">
              <FaFan className="sec-icon" /> Status Blower Individual
            </h3>
            <div className="fan-grid">
              {blowerEntries.map(([id, blower], idx) => (
                <div key={id} className={`fan-card ${blower.speed > 0 ? "on" : ""}`}>
                  <FaFan size={28} className={`fan-ic ${blower.speed > 0 ? "active" : ""}`} />
                  <span className="fan-name">{blower.name || `Blower ${idx + 1}`}</span>
                  <span className={`fan-st ${blower.speed > 0 ? "on" : "off"}`}>
                    <span className="fan-dot" />
                    {blower.speed > 0 ? `${blower.speed}%` : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ctrl-panel card">
            <h3 className="sec-title">
              <IoSettingsOutline className="sec-icon" /> System Control Panel
            </h3>
            <p className="ctrl-desc">Switch between manual and automatic control modes</p>
            <div className="mode-switch">
              <button
                className={`mode-btn ${controlMode === "auto" ? "active" : ""}`}
                onClick={() => handleModeChange("auto")}
              >
                <IoLockClosedOutline /> Kontrol Otomatis
              </button>
              <button
                className={`mode-btn ${controlMode === "manual" ? "active" : ""}`}
                onClick={() => handleModeChange("manual")}
              >
                Kontrol Manual
              </button>
            </div>

            {controlMode === "auto" && (
              <div className="auto-section">
                <div className="auto-info-card">
                  <div className="auto-info-header">
                    <span className="auto-info-icon">⚡</span>
                    <span>Mode Otomatis Aktif</span>
                  </div>
                  <p className="auto-info-desc">
                    Kecepatan blower diatur secara otomatis oleh ESP32 berdasarkan suhu rata-rata sensor.
                    Slider di bawah hanya untuk monitoring (read-only).
                  </p>
                  <table className="auto-range-table">
                    <thead>
                      <tr>
                        <th>Rentang Suhu</th>
                        <th>Kecepatan Blower</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>&lt; 35°C</td><td><span className="speed-badge off">OFF (0%)</span></td></tr>
                      <tr><td>35°C – 41.9°C</td><td><span className="speed-badge low">25%</span></td></tr>
                      <tr><td>42°C – 48.9°C</td><td><span className="speed-badge mid">50%</span></td></tr>
                      <tr><td>49°C – 54.9°C</td><td><span className="speed-badge high">75%</span></td></tr>
                      <tr><td>≥ 55°C</td><td><span className="speed-badge max">100%</span></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="auto-monitor">
                  <p className="auto-monitor-label">📊 Monitor Kecepatan Blower (Real-Time)</p>
                  <div className="auto-slider-wrapper">
                    <BlowerControl
                      id="master"
                      name="Master Blower"
                      speed={blowerEntries[0]?.[1]?.speed || 0}
                    />
                    <div className="auto-overlay">
                      <span>🔒 AUTO MODE</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {controlMode === "manual" && (
              <div className="manual-list">
                <p className="manual-info">Kontrol manual untuk blower individual</p>
                <BlowerControl
                  id="master"
                  name="Master Blower"
                  speed={displaySpeed}
                  onSpeedChange={handleMasterSpeedChange}
                />
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === "data" && canAccessTab(userRole, "data") && (
        <main className="tab-content">
          <div className="data-card card">
            <div className="tab-header-flex">
              <h3 className="sec-title">
                <IoDocumentTextOutline className="sec-icon" /> Riwayat Data Sensor
              </h3>
              <div className="tab-header-actions">
                <div className="search-box">
                  <IoSearchOutline className="search-icon" />
                  <input
                    type="text"
                    placeholder="Cari tanggal/waktu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {canExport(userRole) && (
                  <>
                    <button className="export-btn" onClick={exportToCSV} disabled={history.length === 0}>
                      <IoCloudDownloadOutline size={18} /> Export
                    </button>
                    <button 
                      className="reset-btn" 
                      onClick={handleResetHistory} 
                      disabled={history.length === 0}
                      style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '9px 16px', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                        fontWeight: '600', cursor: 'pointer', boxShadow: '0 3px 10px rgba(239,68,68,0.3)',
                        opacity: history.length === 0 ? 0.5 : 1
                      }}
                    >
                      <IoTrashOutline size={18} /> Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="table-controls">
              <div className="row-selector">
                <span>Tampilkan</span>
                <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={999999}>Semua</option>
                </select>
                <span>data</span>
              </div>
              <div className="pagination-info">
                <b>{filteredHistory.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</b>-<b>{Math.min(currentPage * rowsPerPage, filteredHistory.length)}</b> dari <b>{filteredHistory.length}</b> result
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="th-time">Waktu</th>
                    <th className="th-avg">Avg Suhu (°C)</th>
                    <th className="th-avg">Avg Hum (%)</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <th key={n} colSpan={2} className="th-sensor-group">{SENSOR_NAMES[n]}</th>
                    ))}
                  </tr>
                  <tr>
                    <th className="th-sub th-avg-sub">T(°C)</th>
                    <th className="th-sub th-avg-sub">H(%)</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <React.Fragment key={n}>
                        <th className="th-sub">T(°C)</th><th className="th-sub">H(%)</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length === 0 && (
                    <tr>
                      <td colSpan={23} className="no-data">Data tidak ditemukan...</td>
                    </tr>
                  )}
                  {paginatedHistory.map((entry, i) => {
                    // Build a sensor map: sensor_id -> {t, h}
                    const sMap = {};
                    if (Array.isArray(entry.sensor_data)) {
                      entry.sensor_data.forEach((s) => { sMap[s.sensor] = s; });
                    }
                    const getSensorVal = (sId, field) => {
                      const s = sMap[sId];
                      if (!s) return "--";
                      const v = s[field];
                      if (v === "null" || v === null || v === undefined) return "--";
                      return typeof v === "number" ? v.toFixed(1) : v;
                    };
                    const isActive = (sId) => {
                      const s = sMap[sId];
                      return s && s.t !== "null" && s.t !== null && s.h !== "null" && s.h !== null;
                    };

                    return (
                      <tr key={i}>
                        <td>
                          <div className="dt-waktu">{entry.tanggal || ""}</div>
                          <div className="dt-jam">{entry.waktu || "--"}</div>
                        </td>
                        <td className="dt-val-t">{typeof entry.avg_t === "number" ? entry.avg_t.toFixed(1) : "--"}</td>
                        <td className="dt-val-h">{typeof entry.avg_h === "number" ? entry.avg_h.toFixed(1) : "--"}</td>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((sId) => (
                          <React.Fragment key={sId}>
                            <td className={`dt-cell ${isActive(sId) ? "dt-val-t" : "dt-null"}`}>
                              {getSensorVal(sId, "t")}
                            </td>
                            <td className={`dt-cell ${isActive(sId) ? "dt-val-h" : "dt-null"}`}>
                              {getSensorVal(sId, "h")}
                            </td>
                          </React.Fragment>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-footer">
                <button
                  className="p-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <IoChevronBackOutline /> Prev
                </button>
                <div className="p-numbers">
                  Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
                </div>
                <button
                  className="p-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next <IoChevronForwardOutline />
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === "management" && canAccessTab(userRole, "management") && (
        <main className="tab-content">
          <ManagementPage />
        </main>
      )}

      {activeTab === "site-status" && currentUser && isSuperAdmin(currentUser.email) && (
        <main className="tab-content">
          <SiteStatusPanel />
        </main>
      )}
    </div>
  );
}

export default App;
