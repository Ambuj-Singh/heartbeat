import { useMemo } from "react";

export function useLogs(logs = [], search = "", keyword = "ALL") {
  return useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    const safeSearch = search.trim().toLowerCase();

    return safeLogs.filter((log) => {
      const message = `${log?.message || ""}`.toLowerCase();
      const matchesSearch = !safeSearch || message.includes(safeSearch);

      if (keyword === "ALL") {
        return matchesSearch;
      }

      return matchesSearch && message.includes(keyword.toLowerCase());
    });
  }, [keyword, logs, search]);
}
