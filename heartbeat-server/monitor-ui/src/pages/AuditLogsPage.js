import FilterBar from "../components/FilterBar";
import PaginationControls from "../components/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";

function AuditLogsPage() {
  const [actor, setActor] = useQueryState("actor", "");
  const [action, setAction] = useQueryState("action", "");
  const [page, setPage] = useQueryState("page", "1");

  const { data, loading, error } = useApiResource(
    "/audit-logs",
    { actor, action, page, limit: 12 },
    { initialData: { data: [], page: 1, totalPages: 1, total: 0 } }
  );

  const items = data?.data || [];

  return (
    <div className="page-grid">
      <FilterBar title="Audit trail" subtitle="Operator traceability for acknowledgements, resolutions, and notes" badge={`${data?.total || 0} events`}>
        <label className="filter-control filter-control-wide">
          <span>Actor</span>
          <input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Search operator..." />
        </label>
        <label className="filter-control filter-control-wide">
          <span>Action</span>
          <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="LOGIN / INCIDENT_RESOLVED ..." />
        </label>
      </FilterBar>

      <section className="panel detail-panel">
        {loading ? <LoadingState message="Loading audit events..." /> : null}
        {error ? <ErrorState message={error} /> : null}
        {!loading && !error && items.length === 0 ? <EmptyState message="No audit entries match the current filters." /> : null}
        {!loading && !error && items.length > 0 ? (
          <div className="data-table">
            {items.map((item) => (
              <div key={item._id} className="data-row">
                <div className="data-row-main">
                  <div className="data-row-title">{item?.action}</div>
                  <div className="data-row-meta">
                    {item?.actor} ({item?.actorRole}) · {item?.resourceType} ·{" "}
                    {item?.timestamp ? new Date(item.timestamp).toLocaleString() : "--"}
                  </div>
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

export default AuditLogsPage;
