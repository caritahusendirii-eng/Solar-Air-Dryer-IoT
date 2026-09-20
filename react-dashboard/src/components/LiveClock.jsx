import React, { useState, useEffect } from "react";
import { IoTimeOutline } from "react-icons/io5";

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const dayName = DAYS_ID[now.getDay()];
  const date = `${now.getDate()} ${MONTHS_ID[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="live-clock" id="live-clock">
      <IoTimeOutline className="live-clock-icon" />
      <div className="live-clock-content">
        <span className="live-clock-time">{h}:{m}:{s}</span>
        <span className="live-clock-date">{dayName}, {date}</span>
      </div>
    </div>
  );
}

export default LiveClock;
