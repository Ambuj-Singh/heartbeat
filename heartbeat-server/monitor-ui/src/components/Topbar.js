function Topbar({ dashboard }) {
  const statusTone =
    dashboard.systemStatus === "Critical"
      ? "critical"
      : dashboard.systemStatus === "Warning"
        ? "warning"
        : "healthy";

  return (
    <header className="topbar">
      <div>
        <div className="topbar-eyebrow">Realtime control center</div>
        <div className="topbar-title-row">
          <h1 className="topbar-title">Infrastructure operations</h1>
          <span className={`topbar-status ${statusTone}`}>{dashboard.systemStatus}</span>
          {dashboard.isDemoMode ? <span className="topbar-status warning">Demo mode</span> : null}
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-metrics">
          <div className="topbar-metric">
            <span className="topbar-metric-label">Nodes</span>
            <strong>{dashboard.totalNodes}</strong>
          </div>
          <div className="topbar-metric">
            <span className="topbar-metric-label">Active incidents</span>
            <strong>{dashboard.activeIncidentsCount}</strong>
          </div>
          <div className="topbar-metric">
            <span className="topbar-metric-label">Last updated</span>
            <strong>
              {dashboard.lastUpdated
                ? dashboard.lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })
                : "Waiting"}
            </strong>
          </div>
        </div>

        <label className="time-range-control">
          <span>Range</span>
          <select value={dashboard.timeRange} onChange={(event) => dashboard.setTimeRange(event.target.value)}>
            <option value="1m">Last 1m</option>
            <option value="5m">Last 5m</option>
            <option value="15m">Last 15m</option>
            <option value="1h">Last 1h</option>
            <option value="24h">Last 24h</option>
          </select>
        </label>
      </div>
    </header>
  );
}

export default Topbar;
