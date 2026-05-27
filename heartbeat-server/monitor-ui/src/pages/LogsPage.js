import FilterBar from "../components/FilterBar";
import PaginationControls from "../components/PaginationControls";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import LogsPanel from "../components/LogsPanel";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";
import { downloadExport } from "../api/client";

function LogsPage() {
  const [search, setSearch] = useQueryState("search", "");
  const [keyword, setKeyword] = useQueryState("level", "ALL");
  const [cluster, setCluster] = useQueryState("cluster", "");
  const [service, setService] = useQueryState("service", "");
  const [page, setPage] = useQueryState("page", "1");
  const { data, loading, error } = useApiResource(
    "/logs",
    {
      search,
      level: keyword,
      cluster,
      service,
      page,
      limit: 40
    },
    { initialData: { data: [], page: 1, totalPages: 1, total: 0 } }
  );
  const filteredLogs = data?.data || [];

  return (
    <div className="page-grid">
      <FilterBar title="Log explorer" subtitle="Search the persisted log stream with operator-grade filters" badge={`${data?.total || 0} logs`}>
        <label className="filter-control filter-control-wide">
          <span>Search</span>
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search log message..." />
        </label>
        <label className="filter-control">
          <span>Level</span>
          <select value={keyword} onChange={(event) => setKeyword(event.target.value)}>
            <option value="ALL">All</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Warn</option>
            <option value="INFO">Info</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Cluster</span>
          <input value={cluster} onChange={(event) => setCluster(event.target.value)} placeholder="cluster" />
        </label>
        <label className="filter-control">
          <span>Service</span>
          <input value={service} onChange={(event) => setService(event.target.value)} placeholder="service" />
        </label>
      </FilterBar>

      <div className="page-actions">
        <button
          type="button"
          className="action-button secondary"
          onClick={() =>
            downloadExport(
              "/logs/export",
              { search, level: keyword, cluster, service, format: "json" },
              "logs-export"
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
              "/logs/export",
              { search, level: keyword, cluster, service, format: "csv" },
              "logs-export"
            )
          }
        >
          Export CSV
        </button>
      </div>

      {loading ? <LoadingState message="Loading logs..." /> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error && filteredLogs.length === 0 ? <EmptyState message="No logs match the current filters." /> : null}
      {!loading && !error && filteredLogs.length > 0 ? (
        <LogsPanel logs={filteredLogs} title="Filtered console feed" subtitle="Search results from the persisted event stream" />
      ) : null}
      <PaginationControls
        page={Number(data?.page || 1)}
        totalPages={Number(data?.totalPages || 1)}
        onPageChange={(nextPage) => setPage(String(nextPage))}
      />
    </div>
  );
}

export default LogsPage;
