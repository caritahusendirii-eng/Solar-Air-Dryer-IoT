import React from "react";
import { WiDaySunny } from "react-icons/wi";
import { IoConstructOutline } from "react-icons/io5";

/**
 * Full-screen maintenance page shown when super admin activates maintenance mode.
 * Includes a subtle hidden "Admin Login" link for super admin bypass.
 */
export default function MaintenancePage() {
  return (
    <div className="maint-page">
      {/* Animated background elements */}
      <div className="maint-bg-shapes">
        <div className="maint-shape maint-shape-1" />
        <div className="maint-shape maint-shape-2" />
        <div className="maint-shape maint-shape-3" />
      </div>

      <div className="maint-content">
        {/* Brand */}
        <div className="maint-brand">
          <WiDaySunny size={36} className="maint-brand-icon" />
          <span className="maint-brand-text">Solar Dryer IoT</span>
        </div>

        {/* Animated gear icon */}
        <div className="maint-icon-wrap">
          <IoConstructOutline className="maint-icon" />
        </div>

        {/* Heading */}
        <h1 className="maint-title">Sedang Dalam Pemeliharaan</h1>
        <p className="maint-desc">
          Kami sedang melakukan pemeliharaan sistem untuk meningkatkan layanan kami.
          <br />Silakan coba beberapa saat lagi.
        </p>

        {/* Info cards */}
        <div className="maint-info-cards">
          <div className="maint-info-card">
            <span className="maint-info-icon">🔧</span>
            <span className="maint-info-text">Pemeliharaan Rutin</span>
          </div>
          <div className="maint-info-card">
            <span className="maint-info-icon">⏱️</span>
            <span className="maint-info-text">Segera Kembali</span>
          </div>
          <div className="maint-info-card">
            <span className="maint-info-icon">📊</span>
            <span className="maint-info-text">Data Tetap Aman</span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="maint-progress">
          <div className="maint-progress-track">
            <div className="maint-progress-bar" />
          </div>
          <p className="maint-progress-label">Sedang memproses pemeliharaan...</p>
        </div>
      </div>
    </div>
  );
}
