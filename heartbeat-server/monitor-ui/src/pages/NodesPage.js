import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import NodeCard from "../components/NodeCard";
import { useNodes } from "../hooks/useNodes";
import FilterBar from "../components/FilterBar";
import { useQueryState } from "../hooks/useQueryState";
import { EmptyState } from "../components/AsyncState";

function NodesPage({ dashboard }) {
  const outletContext = useOutletContext();
  const resolvedDashboard = dashboard || outletContext?.dashboard;
  const [statusFilter, setStatusFilter] = useQueryState("status", "ALL");
  const [nodeQuery, setNodeQuery] = useQueryState("node", "");
  const [cluster, setCluster] = useQueryState("cluster", "");
  const [service, setService] = useQueryState("service", "");
  const [region, setRegion] = useQueryState("region", "");
  const [environment, setEnvironment] = useQueryState("environment", "");
  const [sortBy, setSortBy] = useState("name");

  const availableFilters = useMemo(() => {
    const values = Object.values(resolvedDashboard.dashboard.nodes || {});
    const unique = (key) => [...new Set(values.map((item) => item?.[key]).filter(Boolean))];

    return {
      clusters: unique("cluster"),
      services: unique("service"),
      regions: unique("region"),
      environments: unique("environment")
    };
  }, [resolvedDashboard.dashboard.nodes]);

  useEffect(() => {
    if (cluster && !availableFilters.clusters.includes(cluster)) {
      setCluster("");
    }
    if (service && !availableFilters.services.includes(service)) {
      setService("");
    }
    if (region && !availableFilters.regions.includes(region)) {
      setRegion("");
    }
    if (environment && !availableFilters.environments.includes(environment)) {
      setEnvironment("");
    }
  }, [
    availableFilters.clusters,
    availableFilters.environments,
    availableFilters.regions,
    availableFilters.services,
    cluster,
    environment,
    region,
    service,
    setCluster,
    setEnvironment,
    setRegion,
    setService
  ]);

  const filteredNodes = useNodes(
    resolvedDashboard.dashboard.nodes,
    {
      status: statusFilter,
      node: nodeQuery,
      cluster,
      service,
      region,
      environment
    },
    sortBy
  );
  const totalVisibleNodes = Object.keys(resolvedDashboard.dashboard.nodes || {}).length;
  const hasActiveFilters = Boolean(
    statusFilter !== "ALL" || nodeQuery || cluster || service || region || environment
  );

  return (
    <div className="page-grid">
      <FilterBar
        title="Node inventory"
        subtitle="Filter unhealthy services by environment, cluster, and retry pressure"
        badge={`${filteredNodes.length} nodes`}
      >
        <label className="filter-control">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All</option>
            <option value="ALIVE">Alive</option>
            <option value="DEAD">Dead</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </label>
        <label className="filter-control filter-control-wide">
          <span>Node</span>
          <input value={nodeQuery} onChange={(event) => setNodeQuery(event.target.value)} placeholder="Search node..." />
        </label>
        <label className="filter-control">
          <span>Cluster</span>
          <select value={cluster} onChange={(event) => setCluster(event.target.value)}>
            <option value="">All</option>
            {availableFilters.clusters.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Service</span>
          <select value={service} onChange={(event) => setService(event.target.value)}>
            <option value="">All</option>
            {availableFilters.services.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Region</span>
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option value="">All</option>
            {availableFilters.regions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Environment</span>
          <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
            <option value="">All</option>
            {availableFilters.environments.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="filter-control">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="name">Name</option>
            <option value="retries">Retries</option>
          </select>
        </label>
        <button
          type="button"
          className="action-button secondary filter-reset-button"
          onClick={() => {
            setStatusFilter("ALL");
            setNodeQuery("");
            setCluster("");
            setService("");
            setRegion("");
            setEnvironment("");
            setSortBy("name");
          }}
        >
          Clear filters
        </button>
      </FilterBar>

      <section className="status-grid">
        {filteredNodes.length === 0 ? (
          <EmptyState
            message={
              totalVisibleNodes > 0 && hasActiveFilters
                ? `No nodes match the current filters. ${totalVisibleNodes} monitored nodes are available overall.`
                : "No monitored nodes are available yet."
            }
          />
        ) : null}
        {filteredNodes.map(([node, data]) => (
          <div key={node}>
            <NodeCard node={node} data={data} />
            <Link className="inline-detail-link" to={`/incidents?node=${encodeURIComponent(node)}`}>
              View incidents
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}

export default NodesPage;
