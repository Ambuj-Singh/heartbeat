import { useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import IncidentTimeline from "../components/IncidentTimeline";
import FilterBar from "../components/FilterBar";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";
import { apiRequest, downloadExport } from "../api/client";

function formatDuration(duration) {
  if (!Number.isFinite(duration)) {
    return "In progress";
  }

  const totalSeconds = Math.floor(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function IncidentsPage({ dashboard }) {
  const outletContext = useOutletContext();
  const resolvedDashboard = dashboard || outletContext?.dashboard;
  const [statusFilter, setStatusFilter] = useQueryState("status", "ALL");
  const [nodeQuery, setNodeQuery] = useQueryState("node", "");
  const [cluster, setCluster] = useQueryState("cluster", "");
  const [service, setService] = useQueryState("service", "");
  const [region, setRegion] = useQueryState("region", "");
  const [environment, setEnvironment] = useQueryState("environment", "");
  const { data, loading, error, setData } = useApiResource(
    "/incidents",
    {
      status: statusFilter,
      node: nodeQuery,
      cluster,
      service,
      region,
      environment,
      limit: 100
    },
    { initialData: { data: [] } }
  );
  const filteredIncidents = data?.data || [];
  const activeCount = filteredIncidents.filter((incident) => incident?.status === "ACTIVE").length;
  const resolvedCount = filteredIncidents.filter((incident) => incident?.status === "RESOLVED").length;
  const mutateIncident = useCallback(async (incidentId, action, body) => {
    const updated = await apiRequest(`/incidents/${incidentId}/${action}`, {
      method: "PATCH",
      ...(body ? { body } : {})
    });
    setData((prev) => ({
      ...(prev || {}),
      data: (prev?.data || []).map((item) => (item._id === incidentId ? updated : item))
    }));
  }, [setData]);

  return (
    <div className="page-grid">
      <FilterBar title="Incident investigation" subtitle="Filter lifecycle events, acknowledge ownership, and capture operator notes">
        <label className="filter-control">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
        <label className="filter-control filter-control-wide">
          <span>Node name</span>
          <input value={nodeQuery} onChange={(event) => setNodeQuery(event.target.value)} placeholder="Search node..." />
        </label>
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

      <div className="page-actions">
        <button
          type="button"
          className="action-button secondary"
          onClick={() =>
            downloadExport(
              "/incidents/export",
              {
                status: statusFilter,
                node: nodeQuery,
                cluster,
                service,
                region,
                environment,
                format: "json"
              },
              "incidents-export"
            )
          }
        >
          Export JSON
        </button>
        <button
          type="button"
          className="action-button secondary"
          onClick={() =>
            downloadExport(
              "/incidents/export",
              {
                status: statusFilter,
                node: nodeQuery,
                cluster,
                service,
                region,
                environment,
                format: "csv"
              },
              "incidents-export"
            )
          }
        >
          Export CSV
        </button>
      </div>

      <div className="page-grid page-grid-overview">
        <div className="primary-column">
          {loading ? <LoadingState message="Loading incidents..." /> : null}
          {error ? <ErrorState message={error} /> : null}
          {!loading && !error && filteredIncidents.length === 0 ? <EmptyState message="No incidents match the current filters." /> : null}
          <IncidentTimeline
            incidents={filteredIncidents}
            title="Full incident timeline"
            subtitle="Historical and active failure lifecycle records"
          />
          {!loading && !error && filteredIncidents.length > 0 ? (
            <section className="panel detail-panel">
              <div className="data-table">
                {filteredIncidents.map((incident) => (
                  <div className="data-row" key={incident._id || `${incident.node}-${incident.failedAt}`}>
                    <div className="data-row-main">
                      <div className="data-row-title">
                        <span className={`status-chip ${incident.status === "ACTIVE" ? "severity-high" : "severity-low"}`}>
                          {incident.status}
                        </span>
                        <span>{incident.node}</span>
                      </div>
                      <div className="data-row-meta">
                        Ack: {incident.acknowledged ? `${incident.acknowledgedBy || "operator"} at ${incident.acknowledgedAt ? new Date(incident.acknowledgedAt).toLocaleString() : "--"}` : "Pending"}
                      </div>
                      {incident.notes ? <div className="data-row-meta">Notes: {incident.notes}</div> : null}
                    </div>
                    <div className="action-row">
                      <button
                        type="button"
                        className="action-button secondary"
                        disabled={incident.acknowledged}
                        onClick={() => mutateIncident(incident._id, "acknowledge")}
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        className="action-button"
                        disabled={incident.status === "RESOLVED"}
                        onClick={() => mutateIncident(incident._id, "resolve")}
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        className="action-button secondary"
                        onClick={() => {
                          const notes = window.prompt("Add incident notes", incident.notes || "");
                          if (notes !== null) {
                            mutateIncident(incident._id, "notes", { notes });
                          }
                        }}
                      >
                        Notes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="side-column">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title">Incident summary</h2>
                <p className="panel-subtitle">Quick count and recovery view</p>
              </div>
            </div>

            <div className="compact-list">
              <div className="compact-item">
                <div className="compact-item-title">Active incidents</div>
                <div className="compact-item-copy">{activeCount}</div>
              </div>
              <div className="compact-item">
                <div className="compact-item-title">Resolved incidents</div>
                <div className="compact-item-copy">{resolvedCount}</div>
              </div>
              <div className="compact-item">
                <div className="compact-item-title">Average recovery</div>
                <div className="compact-item-copy">{formatDuration(resolvedDashboard.averageRecoveryTime)}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default IncidentsPage;
