import { useCallback } from "react";
import FilterBar from "../components/FilterBar";
import PaginationControls from "../components/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";
import { apiRequest } from "../api/client";

function AlertsPage() {
  const [severity, setSeverity] = useQueryState("severity", "ALL");
  const [type, setType] = useQueryState("type", "ALL");
  const [status, setStatus] = useQueryState("status", "ALL");
  const [page, setPage] = useQueryState("page", "1");

  const { data, loading, error, setData } = useApiResource(
    `/alerts`,
    {
      severity,
      type,
      status,
      page,
      limit: 10
    },
    { initialData: { data: [], page: 1, totalPages: 1, total: 0 } }
  );

  const mutateAlert = useCallback(async (id, action) => {
    const updated = await apiRequest(`/alerts/${id}/${action}`, { method: "PATCH" });
    setData((prev) => ({
      ...(prev || {}),
      data: (prev?.data || []).map((item) => (item._id === id ? updated : item))
    }));
  }, [setData]);

  const alerts = data?.data || [];

  return (
    <div className="page-grid">
      <FilterBar title="Alert center" subtitle="Track, acknowledge, and resolve persistent alert records" badge={`${data?.total || 0} total`}>
        <label className="filter-control">
          <span>Severity</span>
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ALL">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="RECOVERY">Recovery</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">All</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </label>
      </FilterBar>

      <section className="panel detail-panel">
        {loading ? <LoadingState message="Loading alerts..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && alerts.length === 0 ? <EmptyState message="No alerts match the current filters." /> : null}
        {!loading && !error && alerts.length > 0 ? (
          <div className="data-table">
            {alerts.map((alert) => (
              <div key={alert._id} className="data-row">
                <div className="data-row-main">
                  <div className="data-row-title">
                    <span className={`status-chip severity-${(alert?.severity || "medium").toLowerCase()}`}>{alert?.severity}</span>
                    <span>{alert?.message}</span>
                  </div>
                  <div className="data-row-meta">
                    {alert?.node || "system"} · {alert?.type} · {alert?.resolved ? "Resolved" : alert?.acknowledged ? "Acknowledged" : "Open"}
                  </div>
                </div>
                <div className="action-row">
                  <button
                    type="button"
                    className="action-button secondary"
                    disabled={alert?.acknowledged}
                    onClick={() => mutateAlert(alert._id, "acknowledge")}
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    disabled={alert?.resolved}
                    onClick={() => mutateAlert(alert._id, "resolve")}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <PaginationControls
          page={Number(data?.page || 1)}
          totalPages={Number(data?.totalPages || 1)}
          onPageChange={(nextPage) => setPage(String(nextPage))}
        />
      </section>
    </div>
  );
}

export default AlertsPage;
