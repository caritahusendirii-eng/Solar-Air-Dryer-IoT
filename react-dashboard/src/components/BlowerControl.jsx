import React, { useState, useEffect } from "react";
import { ref, set } from "firebase/database";
import { database } from "../firebase";
import toast from "react-hot-toast";

export default function BlowerControl({ id, name, speed, onDummyChange, onSpeedChange }) {
  const [localSpeed, setLocalSpeed] = useState(speed || 0);
  const MAX_RPM = 6000; // Estimated max RPM

  useEffect(() => {
    setLocalSpeed(speed || 0);
  }, [speed]);

  const rpm = Math.round((localSpeed / 100) * MAX_RPM);

  const handleSliderChange = (e) => {
    setLocalSpeed(parseInt(e.target.value, 10));
  };

  const handleSliderRelease = async (e) => {
    const finalSpeed = parseInt(e.target.value, 10);
    
    // Use manual callback if provided (for Master Control)
    if (onSpeedChange) {
      onSpeedChange(finalSpeed);
      return;
    }

    if (onDummyChange) {
      onDummyChange(finalSpeed);
      return;
    }
    try {
      await set(ref(database, `/blowers/${id}/speed`), finalSpeed);
      toast.success(`${name} speed set to ${finalSpeed}%`);
    } catch (err) {
      toast.error("Failed to update blower speed!");
      console.error(err);
      setLocalSpeed(speed); // Revert on failure
    }
  };

  return (
    <div className="blower-control-card">
      <div className="bc-header">
        <span className="bc-subtitle">AIRFLOW MANAGEMENT</span>
        <div className="bc-title-row">
          <div className="bc-title-col">
            <h2>{name}</h2>
            <h2>Control</h2>
          </div>
          <div className="bc-rpm-col">
            <span className="bc-rpm-value">{rpm.toLocaleString()}</span>
            <span className="bc-rpm-label">RPM</span>
          </div>
        </div>
      </div>

      <div className="bc-slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={localSpeed}
          onChange={handleSliderChange}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="bc-slider"
          style={{
            background: `linear-gradient(to right, #d97706 0%, #d97706 ${localSpeed}%, #e5e7eb ${localSpeed}%, #e5e7eb 100%)`
          }}
        />
        <div className="bc-slider-labels">
          <span>OFF</span>
          <span>50%</span>
          <span>MAX</span>
        </div>
      </div>
    </div>
  );
}
