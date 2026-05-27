import { useOutletContext } from "react-router-dom";
import AiPanel from "../components/AiPanel";

function AiPage({ dashboard }) {
  const outletContext = useOutletContext();
  const resolvedDashboard = dashboard || outletContext?.dashboard;
  const anomalies = [
    resolvedDashboard.deadCount > 0
      ? `${resolvedDashboard.deadCount} node${resolvedDashboard.deadCount === 1 ? "" : "s"} currently marked dead.`
      : null,
    resolvedDashboard.retryCount > 3
      ? `Retry pressure is elevated at ${resolvedDashboard.retryCount} attempts.`
      : null,
    resolvedDashboard.failureRate > 20
      ? `Failure rate has reached ${resolvedDashboard.failureRate}% in the selected window.`
      : null,
    resolvedDashboard.activeIncidentsCount > 0
      ? `${resolvedDashboard.activeIncidentsCount} incident${resolvedDashboard.activeIncidentsCount === 1 ? "" : "s"} still unresolved.`
      : null
  ].filter(Boolean);

  return (
    <div className="page-grid page-grid-overview">
      <div className="primary-column">
        <AiPanel
          ai={resolvedDashboard.ai}
          nodes={resolvedDashboard.dashboard.nodes}
          unknownCount={resolvedDashboard.unknownCount}
          incidents={resolvedDashboard.dashboard.incidents}
        />
      </div>

      <div className="side-column">
        <section className="panel detail-panel">
          <div className="panel-heading">
            <div>
              <h2 className="panel-title">Anomaly insights</h2>
              <p className="panel-subtitle">Rule-based checks supporting the AI summary</p>
            </div>
          </div>

          {anomalies.length === 0 ? (
            <div className="empty-state">No obvious anomalies detected in the current window.</div>
          ) : (
            <div className="compact-list">
              {anomalies.map((item) => (
                <div className="compact-item" key={item}>
                  <div className="compact-item-copy">{item}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AiPage;
