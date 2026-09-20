const SENSOR_COUNT = 10;

export function parseDummyCsv(text) {
  const lines = text.trim().split("\n");
  const header = lines[0];
  const rows = lines.slice(1);

  const history = [];

  for (const row of rows) {
    const cols = row.split(",");
    if (cols.length < 22) continue;

    const rawDate = cols[0].trim();
    const rawTime = cols[1].trim();
    const pad = (v) => String(v).padStart(2, "0");

    let isoDate;
    if (rawDate.includes("/")) {
      const dp = rawDate.split("/");
      isoDate = `${dp[2]}-${pad(dp[0])}-${pad(dp[1])}`;
    } else {
      const dp = rawDate.split("-");
      isoDate = `${dp[0]}-${pad(dp[1])}-${pad(dp[2])}`;
    }

    const timeParts = rawTime.split(":");
    const isoTime = `${pad(timeParts[0])}:${pad(timeParts[1])}:${pad(timeParts[2] || 0)}`;

    const ts = new Date(`${isoDate}T${isoTime}`).getTime();
    if (isNaN(ts)) continue;

    let tSum = 0, hSum = 0, tCount = 0, hCount = 0;
    const sensors = [];

    for (let i = 0; i < SENSOR_COUNT; i++) {
      const tRaw = cols[2 + i * 2]?.trim().toUpperCase();
      const hRaw = cols[3 + i * 2]?.trim().toUpperCase();
      const tVal = (tRaw && tRaw !== "NAN") ? parseFloat(tRaw) : NaN;
      const hVal = (hRaw && hRaw !== "NAN") ? parseFloat(hRaw) : NaN;
      const tOk = !isNaN(tVal) && tVal > 0;
      const hOk = !isNaN(hVal) && hVal > 0;

      sensors.push({
        temperature: tOk ? tVal : null,
        humidity: hOk ? hVal : null,
      });

      if (tOk) { tSum += tVal; tCount++; }
      if (hOk) { hSum += hVal; hCount++; }
    }

    if (tCount === 0) continue;

    history.push({
      timestamp: ts,
      temperature: +(tSum / tCount).toFixed(1),
      humidity: +(hSum / hCount).toFixed(1),
      sensors,
      validSensors: tCount,
    });
  }

  return history;
}
