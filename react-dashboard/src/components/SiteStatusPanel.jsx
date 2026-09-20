import React, { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { database } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { isSuperAdmin } from "../contexts/AuthContext";
import {
  IoShieldCheckmarkOutline,
  IoConstructOutline,
  IoServerOutline,
  IoCheckmarkCircle,
  IoWarningOutline,
} from "react-icons/io5";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  {
    value: "live",
    label: "Live",
    desc: "Website berjalan normal, semua user bisa mengakses.",
    icon: <IoCheckmarkCircle size={22} />,
    color: "live",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    desc: "Tampilkan halaman pemeliharaan. Semua user (kecuali super admin) tidak bisa mengakses.",
    icon: <IoConstructOutline size={22} />,
    color: "maintenance",
  },
  {
    value: "overload",
    label: "Server Overload",
    desc: "Tampilkan halaman server kelebihan beban (503). Semua user (kecuali super admin) tidak bisa mengakses.",
    icon: <IoServerOutline size={22} />,
    color: "overload",
  },
];

export default function SiteStatusPanel() {
  const { currentUser } = useAuth();
  const [currentStatus, setCurrentStatus] = useState("live");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  // Listen to /site_status
  useEffect(() => {
    const statusRef = ref(database, "/site_status");
    const unsub = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCurrentStatus(data.mode || "live");
        setUpdatedAt(data.updated_at || null);
        setUpdatedBy(data.updated_by || null);
      } else {
        setCurrentStatus("live");
      }
    });
    return () => unsub();
  }, []);

  // Only super admin can see/use this panel
  if (!currentUser || !isSuperAdmin(currentUser.email)) {
    return null;
  }

  const handleStatusChange = async (newMode) => {
    if (newMode === currentStatus) return;

    const option = STATUS_OPTIONS.find((o) => o.value === newMode);
    const confirmMsg =
      newMode === "live"
        ? "Kembali ke mode Live? Semua user akan bisa mengakses website."
        : `Aktifkan mode ${option.label}? Semua user (kecuali Anda) tidak akan bisa mengakses website.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await set(ref(database, "/site_status"), {
        mode: newMode,
        updated_at: Date.now(),
        updated_by: currentUser.email,
      });
      toast.success(`Mode berhasil diubah ke ${option.label}!`);
    } catch (err) {
      console.error("Failed to update site status:", err);
      toast.error("Gagal mengubah status website.");
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="site-status-card card">
      <h3 className="sec-title">
        <IoShieldCheckmarkOutline className="sec-icon" /> Site Status Control
      </h3>
      <p className="site-status-desc">
        Kontrol status website secara real-time. Hanya super admin yang dapat mengakses fitur ini.
      </p>

      {/* Current status banner */}
      <div className={`site-status-banner site-status-banner-${currentStatus}`}>
        <div className="site-status-banner-content">
          <span className="site-status-banner-dot" />
          <div>
            <span className="site-status-banner-label">Status Saat Ini</span>
            <span className="site-status-banner-value">
              {STATUS_OPTIONS.find((o) => o.value === currentStatus)?.label || "Live"}
            </span>
          </div>
        </div>
      </div>

      {/* Status option cards */}
      <div className="site-status-options">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`site-status-option site-status-option-${option.color} ${
              currentStatus === option.value ? "active" : ""
            }`}
            onClick={() => handleStatusChange(option.value)}
          >
            <div className="site-status-option-icon">{option.icon}</div>
            <div className="site-status-option-info">
              <span className="site-status-option-label">{option.label}</span>
              <span className="site-status-option-desc">{option.desc}</span>
            </div>
            {currentStatus === option.value && (
              <span className="site-status-option-active-badge">AKTIF</span>
            )}
          </button>
        ))}
      </div>

      {/* Warning */}
      <div className="site-status-warning">
        <IoWarningOutline size={16} />
        <span>
          Mengaktifkan mode Maintenance atau Overload akan memblokir akses semua user kecuali super admin.
          APK mobile juga akan terpengaruh karena terhubung ke URL yang sama.
        </span>
      </div>
    </div>
  );
}
