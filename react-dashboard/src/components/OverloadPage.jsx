import React from "react";
import { IoServerOutline, IoWarningOutline } from "react-icons/io5";

/**
 * Full-screen server overload (503) page shown when super admin activates overload mode.
 * Includes a subtle hidden "Admin Login" link for super admin bypass.
 */
export default function OverloadPage() {
  return (
    <div className="overload-page">
      {/* Glitch scanlines */}
      <div className="overload-scanlines" />

      {/* Animated background particles */}
      <div className="overload-bg-particles">
        <div className="overload-particle overload-particle-1" />
        <div className="overload-particle overload-particle-2" />
        <div className="overload-particle overload-particle-3" />
        <div className="overload-particle overload-particle-4" />
      </div>

      <div className="overload-content">
        {/* Error code with glitch effect */}
        <div className="overload-error-code" data-text="503">
          503
        </div>

        {/* Server icon */}
        <div className="overload-icon-wrap">
          <IoServerOutline className="overload-icon" />
          <IoWarningOutline className="overload-warning-icon" />
        </div>

        {/* Heading */}
        <h1 className="overload-title">Server Kelebihan Beban</h1>
        <p className="overload-subtitle">Service Unavailable</p>
        <p className="overload-desc">
          Server sedang mengalami beban yang sangat tinggi dan tidak dapat memproses permintaan Anda saat ini.
          Tim kami sedang bekerja untuk memulihkan layanan.
        </p>

        {/* Server status indicators */}
        <div className="overload-status-grid">
          <div className="overload-status-item critical">
            <span className="overload-status-dot" />
            <span>CPU Usage</span>
            <span className="overload-status-val">98.7%</span>
          </div>
          <div className="overload-status-item critical">
            <span className="overload-status-dot" />
            <span>Memory</span>
            <span className="overload-status-val">96.2%</span>
          </div>
          <div className="overload-status-item warning">
            <span className="overload-status-dot" />
            <span>Network</span>
            <span className="overload-status-val">Saturated</span>
          </div>
          <div className="overload-status-item critical">
            <span className="overload-status-dot" />
            <span>Requests</span>
            <span className="overload-status-val">Timeout</span>
          </div>
        </div>

        {/* Recovery progress */}
        <div className="overload-recovery">
          <div className="overload-recovery-track">
            <div className="overload-recovery-bar" />
          </div>
          <p className="overload-recovery-label">
            ⚡ Memulihkan server... Mohon tunggu beberapa saat
          </p>
        </div>
      </div>
    </div>
  );
}
