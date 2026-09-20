import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { IoTrendingUp } from "react-icons/io5";

export default function SensorChart({ data }) {
  // Map history entries (avg_t, avg_h, waktu) to chart-friendly format
  const chartData = data.map((entry) => ({
    waktu: entry.waktu || "",
    avg_t: typeof entry.avg_t === "number" ? entry.avg_t : null,
    avg_h: typeof entry.avg_h === "number" ? entry.avg_h : null,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="ct-tooltip">
        <p className="ct-time">{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color }}>
            {e.name === "avg_t" ? "Suhu" : "Kelembaban"}:{" "}
            <strong>
              {e.value?.toFixed(1)}{e.name === "avg_t" ? "°C" : "%"}
            </strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="chart-card card">
      <div className="chart-header">
        <IoTrendingUp size={22} className="chart-icon" />
        <div>
          <h3 className="chart-title">Tren Suhu & Kelembaban</h3>
          <p className="chart-sub">Pemantauan real-time rata-rata sensor</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="chart-empty">Belum ada data historis...</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="waktu" stroke="#999" fontSize={11} interval="preserveStartEnd" />
            <YAxis stroke="#999" fontSize={11} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => value === "avg_t" ? "Suhu (°C)" : "Kelembaban (%)"}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="avg_t"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: "#f97316", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#f97316" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="avg_h"
              stroke="#0077b6"
              strokeWidth={2}
              dot={{ fill: "#0077b6", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#0077b6" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
