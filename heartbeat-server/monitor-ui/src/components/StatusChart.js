import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function renderDeadDot(props = {}) {
  const { payload, cx, cy } = props;

  if (!payload || payload.dead <= 0 || typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  return <circle cx={cx} cy={cy} r={6} fill="#ff4d4f" stroke="#ffd3d7" strokeWidth={2} />;
}

export default function StatusChart({
  data = [],
  yMax = 1,
  title = "System health trend",
  subtitle = "Recent polling snapshots for alive, dead, and unknown nodes"
}) {
  const safeData = Array.isArray(data) ? data : [];
  const safeYMax = Number.isFinite(yMax) && yMax > 0 ? yMax : 1;

  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-subtitle">{subtitle}</p>
        </div>

        <div className="panel-badge">{safeData.length} samples</div>
      </div>

      <div className="chart-wrapper">
        {safeData.length === 0 ? (
          <div className="chart-empty">Waiting for data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="rgba(142, 165, 191, 0.16)" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#8ea5bf"
                tick={{ fill: "#8ea5bf", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                allowDecimals={false}
                domain={[0, safeYMax]}
                stroke="#8ea5bf"
                tick={{ fill: "#8ea5bf", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(8, 19, 31, 0.92)",
                  border: "1px solid rgba(142, 165, 191, 0.2)",
                  borderRadius: "16px",
                  color: "#f5f7fb"
                }}
                labelStyle={{ color: "#b9cce4" }}
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="alive"
                name="Alive"
                stroke="#39d98a"
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />

              <Line
                type="monotone"
                dataKey="dead"
                name="Dead"
                stroke="#ff6b7d"
                strokeWidth={3}
                dot={renderDeadDot}
                isAnimationActive={true}
                animationDuration={400}
              />

              <Line
                type="monotone"
                dataKey="unknown"
                name="Unknown"
                stroke="#f9c74f"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
