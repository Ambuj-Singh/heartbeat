import { useMemo } from "react";

export function useNodes(nodes = {}, filters = {}, sortBy = "name") {
  return useMemo(() => {
    const entries = Object.entries(nodes || {});
    const {
      status = "ALL",
      node = "",
      cluster = "",
      service = "",
      region = "",
      environment = ""
    } = filters;
    const safeNode = node.trim().toLowerCase();

    const filtered = entries.filter(([nodeName, data]) => {
      const matchesStatus = status === "ALL" || (data?.status || "UNKNOWN") === status;
      const matchesNode = !safeNode || (nodeName || "").toLowerCase().includes(safeNode);
      const matchesCluster = !cluster || data?.cluster === cluster;
      const matchesService = !service || data?.service === service;
      const matchesRegion = !region || data?.region === region;
      const matchesEnvironment = !environment || data?.environment === environment;

      return (
        matchesStatus &&
        matchesNode &&
        matchesCluster &&
        matchesService &&
        matchesRegion &&
        matchesEnvironment
      );
    });

    return filtered.sort(([leftName, leftData], [rightName, rightData]) => {
      if (sortBy === "retries") {
        return (rightData?.retries || 0) - (leftData?.retries || 0) || leftName.localeCompare(rightName);
      }

      return leftName.localeCompare(rightName);
    });
  }, [filters, nodes, sortBy]);
}
