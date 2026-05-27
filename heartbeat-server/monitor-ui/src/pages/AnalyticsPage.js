import { useOutletContext } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";
import StatusChart from "../components/StatusChart";

function formatDuration(duration) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "N/A";
  }

  const totalSeconds = Math.floor(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function AnalyticsPage({ dashboard }) {
  const outletContext = useOutletContext();
  const resolvedDashboard = dashboard || outletContext?.dashboard;
  const [cluster, setCluster] = useQueryState("cluster", "");
  const [service, setService] = useQueryState("service", "");
  const [region, setRegion] = useQueryState("region", "");
  const [environment, setEnvironment] = useQueryState("environment", "");
  const { data } = useApiResource(
    "/analytics/summary",
    {
      range: resolvedDashboard.timeRange,
      cluster,
      service,
      region,
      environment
    },
    { initialData: resolvedDashboard.analyticsSummary || {} }
  );
  const summary = data || resolvedDashboard.analyticsSummary || {};

  return (
    <div className="page-grid">
      <FilterBar title="Historical analytics" subtitle="Track degradation, recovery, and health posture across longer windows">
        <label className="filter-control">
          <span>Cluster</span>
          <input value={cluster} onChange={(event) => setCluster(event.target.value)} placeholder="cluster" />
        </label>
        <label className="filter-control">
          <span>Service</span>
          <input value={service} onChange={(event) => setService(event.target.value)} placeholder="service" />
        </label>
        <label className="filter-control">
          <span>Region</span>
          <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="region" />
        </label>
        <label className="filter-control">
          <span>Environment</span>
          <input value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="environment" />
        </label>
      </FilterBar>
      <section className="summary-grid">
        <div className="panel summary-card">
          <div className="summary-label">Failure rate</div>
          <div className="summary-value">{summary.failureRate ?? resolvedDashboard.failureRate}%</div>
          <div className="summary-helper">Share of sampled windows with one or more dead nodes</div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Avg recovery</div>
          <div className="summary-value">{formatDuration(summary.avgRecoveryTime ?? resolvedDashboard.averageRecoveryTime)}</div>
          <div className="summary-helper">Average time to resolve recorded incidents</div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Retry pressure</div>
          <div className="summary-value">{summary.retryTrend ?? resolvedDashboard.retryCount}</div>
          <div className="summary-helper">Total retries across current node inventory</div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Active incidents</div>
          <div className="summary-value">{summary.activeIncidents ?? resolvedDashboard.activeIncidentsCount}</div>
          <div className="summary-helper">Currently unresolved failures</div>
        </div>
      </section>

      <StatusChart
        data={resolvedDashboard.filteredHistory}
        yMax={Math.max(resolvedDashboard.chartCapacity, resolvedDashboard.totalNodes, 1)}
        title="Degradation trend"
        subtitle="Short-term failure rate, recovery pressure, and unknown-state movement"
      />
    </div>
  );
}

export default AnalyticsPage;
