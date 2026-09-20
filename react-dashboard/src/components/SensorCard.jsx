import React from "react";
import { WiThermometer, WiHumidity } from "react-icons/wi";

const configs = {
  temperature: {
    icon: (s) => <WiThermometer size={s} />,
    label: "Temperature",
    color: "#e85d04",
    bg: "#fff3e0",
    unit: "°C",
    barColor: "#e85d04",
  },
  humidity: {
    icon: (s) => <WiHumidity size={s} />,
    label: "Humidity",
    color: "#0077b6",
    bg: "#e8f4f8",
    unit: "%",
    barColor: "#0077b6",
  },
};

// Card for average values (existing usage)
export default function SensorCard({ type, value }) {
  const c = configs[type];
  const maxVal = type === "temperature" ? 60 : 100;
  const pct = value !== null && value !== undefined ? Math.min((value / maxVal) * 100, 100) : 0;

  return (
    <div className="sensor-card card">
      <div className="sc-top">
        <div className="sc-icon" style={{ color: c.color, background: c.bg }}>
          {c.icon(28)}
        </div>
        <span className="live-badge">Live</span>
      </div>
      <h3 className="sc-label">{c.label}</h3>
      <p className="sc-value" style={{ color: c.color }}>
        {value !== null && value !== undefined ? value.toFixed(1) : "--"}{c.unit}
      </p>
      <div className="sc-bar-track">
        <div className="sc-bar-fill" style={{ width: `${pct}%`, background: c.color }} />
      </div>
    </div>
  );
}

// Card for individual sensor readings
export function IndividualSensorCard({ sensor, name }) {
  const isNull = (v) => v === "null" || v === null || v === undefined;
  const hasTemp = !isNull(sensor.t);
  const hasHum = !isNull(sensor.h);
  const active = hasTemp || hasHum; // aktif jika punya suhu ATAU kelembaban

  const tVal = hasTemp ? Number(sensor.t) : null;
  const hVal = hasHum ? Number(sensor.h) : null;

  return (
    <div className={`ind-sensor-card ${active ? "active" : "inactive"}`}>
      <div className="isc-header">
        <span className="isc-label">{name || `Sensor ${sensor.sensor}`}</span>
        <span className={`isc-dot ${active ? "on" : "off"}`} />
      </div>
      <div className="isc-readings">
        <div className="isc-metric">
          <WiThermometer size={20} style={{ color: "#e85d04" }} />
          <span className="isc-val" style={{ color: hasTemp ? "#e85d04" : "#bbb" }}>
            {tVal !== null ? tVal.toFixed(1) : "--"}
          </span>
          <span className="isc-unit">°C</span>
        </div>
        <div className="isc-metric">
          <WiHumidity size={20} style={{ color: "#0077b6" }} />
          <span className="isc-val" style={{ color: hasHum ? "#0077b6" : "#bbb" }}>
            {hVal !== null ? hVal.toFixed(1) : "N/A"}
          </span>
          <span className="isc-unit">{hasHum ? "%" : ""}</span>
        </div>
      </div>
      {!active && <div className="isc-offline">Tidak Aktif</div>}
    </div>
  );
}
