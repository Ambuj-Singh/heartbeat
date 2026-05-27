import { useOutletContext } from "react-router-dom";
import IncidentTimeline from "../components/IncidentTimeline";
import StatusChart from "../components/StatusChart";

function OverviewPage({ dashboard }) {
  const outletContext = useOutletContext();
  const resolvedDashboard = dashboard || outletContext?.dashboard;
  const latestIncidents = resolvedDashboard.dashboard.incidents.slice(0, 5);

  return (
    <div className="page-grid">
      <section className="page-section">
        <div className="summary-grid">
          <div className="panel summary-card">
            <div className="summary-label">Health score</div>
            <div className="summary-value">{resolvedDashboard.healthScore}%</div>
            <div className="summary-helper">Current resilience score across all monitored nodes</div>
          </div>
          <div className="panel summary-card">
            <div className="summary-label">Alive</div>
            <div className="summary-value">{resolvedDashboard.aliveCount}</div>
            <div className="summary-helper">Healthy services currently online</div>
          </div>
          <div className="panel summary-card">
            <div className="summary-label">Dead</div>
            <div className="summary-value">{resolvedDashboard.deadCount}</div>
            <div className="summary-helper">Nodes requiring operator attention</div>
          </div>
          <div className="panel summary-card">
            <div className="summary-label">Alerts</div>
            <div className="summary-value">{resolvedDashboard.dashboard.alerts.length}</div>
            <div className="summary-helper">Live notifications currently on screen</div>
          </div>
        </div>
      </section>

      <section className="page-grid page-grid-overview">
        <div className="primary-column">
          <StatusChart
            data={resolvedDashboard.filteredHistory}
            yMax={Math.max(resolvedDashboard.chartCapacity, resolvedDashboard.totalNodes, 1)}
            title="Live health window"
            subtitle="Realtime short-window view of the cluster"
          />

          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title">Active alerts</h2>
                <p className="panel-subtitle">Current critical, recovery, and warning events</p>
              </div>
              <div className="panel-badge">{resolvedDashboard.dashboard.alerts.length} live</div>
            </div>

            {resolvedDashboard.dashboard.alerts.length === 0 ? (
              <div className="empty-state">No active alerts right now.</div>
            ) : (
              <div className="compact-list">
                {resolvedDashboard.dashboard.alerts.map((alert) => (
                  <div
                    className={`compact-item alert-${(alert?.type || "WARNING").toLowerCase()}`}
                    key={alert.id}
                  >
                    <div className="compact-item-title">{alert.type}</div>
                    <div className="compact-item-copy">{alert.message}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="side-column">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title">System status</h2>
                <p className="panel-subtitle">Self-monitoring and outbound integration readiness</p>
              </div>
              <div className="panel-badge">
                {resolvedDashboard.systemInfo?.database?.healthy ? "DB ready" : "DB pending"}
              </div>
            </div>

            <div className="compact-list">
              <div className="compact-item">
                <div className="compact-item-title">Runtime</div>
                <div className="compact-item-copy">
                  {resolvedDashboard.systemLoading
                    ? "Loading runtime status..."
                    : resolvedDashboard.systemError
                      ? resolvedDashboard.systemError
                      : `${Math.floor((resolvedDashboard.systemInfo?.uptime || 0) / 60)}m uptime · ${resolvedDashboard.systemInfo?.sockets?.activeConnections || 0} sockets`}
                </div>
              </div>
              <div className="compact-item">
                <div className="compact-item-title">Version</div>
                <div className="compact-item-copy">
                  {resolvedDashboard.systemInfo?.version || "Unavailable"} · {resolvedDashboard.systemInfo?.environment || "unknown"}
                </div>
              </div>
              <div className="compact-item">
                <div className="compact-item-title">Integrations</div>
                <div className="compact-item-copy">
                  {resolvedDashboard.integrationLoading
                    ? "Checking webhook status..."
                    : resolvedDashboard.integrationError
                      ? resolvedDashboard.integrationError
                      : `Slack ${resolvedDashboard.integrationStatus?.slack?.configured ? "configured" : "not configured"} · Webhook ${resolvedDashboard.integrationStatus?.webhook?.configured ? "configured" : "not configured"}`}
                </div>
              </div>
            </div>
          </section>

          <IncidentTimeline
            incidents={latestIncidents}
            title="Latest incidents"
            subtitle="Most recent failures and recoveries"
            emptyMessage="No recent incidents."
          />
        </div>
      </section>
    </div>
  );
}

export default OverviewPage;
