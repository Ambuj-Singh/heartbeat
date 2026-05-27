import { useMemo } from "react";

export function useIncidents(incidents = [], statusFilter = "ALL", nodeQuery = "") {
  return useMemo(() => {
    const safeQuery = nodeQuery.trim().toLowerCase();
    const safeIncidents = Array.isArray(incidents) ? incidents : [];

    return safeIncidents.filter((incident) => {
      const matchesStatus = statusFilter === "ALL" || incident?.status === statusFilter;
      const matchesNode = !safeQuery || (incident?.node || "").toLowerCase().includes(safeQuery);

      return matchesStatus && matchesNode;
    });
  }, [incidents, nodeQuery, statusFilter]);
}
