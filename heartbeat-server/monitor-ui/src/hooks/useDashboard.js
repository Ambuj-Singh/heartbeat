import { useEffect, useMemo, useRef, useState } from "react";
import socket from "../api/socket";
import { apiRequest, buildQuery } from "../api/client";
import { DEMO_MODE, getDemoDashboardSnapshot } from "../demo/mockApi";

const INITIAL_DASHBOARD_STATE = {
  nodes: {},
  logs: [],
  history: [],
  incidents: [],
  alerts: []
};

function buildHistoryPoint(snapshot = {}) {
  const safeSnapshot = snapshot ?? {};
  const nodeValues = Object.values(safeSnapshot);
  const timestamp = Date.now();

  return {
    timestamp,
    time: new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    alive: nodeValues.filter((node) => node?.status === "ALIVE").length,
    dead: nodeValues.filter((node) => node?.status === "DEAD").length,
    unknown: nodeValues.filter((node) => node?.status === "UNKNOWN").length
  };
}

function createAlert(type, message) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    time: new Date().toISOString()
  };
}

const TIME_RANGE_SECONDS = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "24h": 86400
};

function readInitialTimeRange() {
  const params = new URLSearchParams(window.location.search);
  const range = params.get("range");
  return TIME_RANGE_SECONDS[range] ? range : "1m";
}

export function useDashboard() {
  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD_STATE);
  const [ai, setAi] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartCapacity, setChartCapacity] = useState(0);
  const [timeRange, setTimeRange] = useState(readInitialTimeRange);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [remoteHistory, setRemoteHistory] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationError, setIntegrationError] = useState("");
  const previousNodesRef = useRef({});
  const latestNodesRef = useRef({});
  const chartStartedRef = useRef(false);
  const alertTimersRef = useRef(new Map());

  useEffect(() => {
    if (DEMO_MODE) {
      let step = 0;

      const applySnapshot = () => {
        const snapshot = getDemoDashboardSnapshot(step);
        latestNodesRef.current = snapshot.dashboard.nodes;
        previousNodesRef.current = snapshot.dashboard.nodes;
        chartStartedRef.current = true;
        setDashboard(snapshot.dashboard);
        setAi(snapshot.ai);
        setLastUpdated(new Date(snapshot.lastUpdated));
        setChartCapacity(Object.keys(snapshot.dashboard.nodes || {}).length);
        setAnalyticsSummary(snapshot.analyticsSummary);
      };

      applySnapshot();

      const intervalId = window.setInterval(() => {
        step += 1;
        applySnapshot();
      }, 4000);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    const alertTimers = alertTimersRef.current;

    const handleInit = (data = {}) => {
      const nextNodes = data?.nodes || {};

      latestNodesRef.current = nextNodes;
      previousNodesRef.current = nextNodes;
      setLastUpdated(new Date());
      setChartCapacity((prev) => Math.max(prev, Object.keys(nextNodes).length));

      setDashboard((prev) => {
        const nextHistory = chartStartedRef.current
          ? prev.history
          : [buildHistoryPoint(nextNodes)];

        chartStartedRef.current = true;

        return {
          ...prev,
          nodes: nextNodes,
          logs: Array.isArray(data?.logs) ? data.logs : [],
          history: nextHistory
        };
      });
    };

    const handleUpdate = (data = {}) => {
      const nextNodes = data?.nodes || {};
      const previousNodes = previousNodesRef.current || {};

      latestNodesRef.current = nextNodes;
      previousNodesRef.current = nextNodes;
      setLastUpdated(new Date());
      setChartCapacity((prev) => Math.max(prev, Object.keys(nextNodes).length));

      setDashboard((prev) => {
        const nextAlerts = [...prev.alerts];
        const nextIncidents = [...prev.incidents];

        Object.entries(nextNodes).forEach(([nodeName, nodeData]) => {
          const currentStatus = nodeData?.status || "UNKNOWN";
          const currentRetries = nodeData?.retries || 0;
          const previousStatus = previousNodes[nodeName]?.status || "UNKNOWN";
          const previousRetries = previousNodes[nodeName]?.retries || 0;

          if (currentStatus === "DEAD" && previousStatus !== "DEAD") {
            const hasActiveIncident = nextIncidents.some(
              (incident) => incident.node === nodeName && incident.status === "ACTIVE"
            );

            if (!hasActiveIncident) {
              nextIncidents.unshift({
                node: nodeName,
                failedAt: new Date().toISOString(),
                recoveredAt: null,
                duration: null,
                status: "ACTIVE"
              });
            }

            nextAlerts.unshift(
              createAlert("CRITICAL", `${nodeName} is down and needs immediate attention.`)
            );
          }

          if (previousStatus === "DEAD" && currentStatus === "ALIVE") {
            const activeIndex = nextIncidents.findIndex(
              (incident) => incident.node === nodeName && incident.status === "ACTIVE"
            );

            if (activeIndex >= 0) {
              const recoveredAt = new Date().toISOString();
              const failedAt = nextIncidents[activeIndex].failedAt;
              const duration = failedAt
                ? Math.max(0, Date.parse(recoveredAt) - Date.parse(failedAt))
                : null;

              nextIncidents[activeIndex] = {
                ...nextIncidents[activeIndex],
                recoveredAt,
                duration,
                status: "RESOLVED"
              };
            }

            nextAlerts.unshift(
              createAlert("RECOVERY", `${nodeName} recovered and is back online.`)
            );
          }

          if (currentRetries > 3 && previousRetries <= 3) {
            nextAlerts.unshift(
              createAlert("WARNING", `${nodeName} has high retry pressure (${currentRetries}).`)
            );
          }
        });

        return {
          ...prev,
          nodes: nextNodes,
          logs: Array.isArray(data?.logs) ? data.logs : prev.logs,
          incidents: nextIncidents
            .sort((left, right) => Date.parse(right.failedAt || 0) - Date.parse(left.failedAt || 0))
            .slice(0, 20),
          alerts: nextAlerts.slice(0, 8)
        };
      });
    };

    const handleAi = (data = {}) => {
      setAi(data?.message || "");
    };

    socket.on("init", handleInit);
    socket.on("update", handleUpdate);
    socket.on("ai", handleAi);

    const historyInterval = window.setInterval(() => {
      setDashboard((prev) => ({
        ...prev,
        history: [...prev.history.slice(-899), buildHistoryPoint(latestNodesRef.current)]
      }));
      chartStartedRef.current = true;
    }, 1000);

    return () => {
      socket.off("init", handleInit);
      socket.off("update", handleUpdate);
      socket.off("ai", handleAi);
      window.clearInterval(historyInterval);
      alertTimers.forEach((timerId) => window.clearTimeout(timerId));
      alertTimers.clear();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("range", timeRange);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
  }, [timeRange]);

  useEffect(() => {
    let cancelled = false;

    setAnalyticsLoading(true);
    setAnalyticsError("");

    Promise.all([
      apiRequest(`/metrics${buildQuery({ range: timeRange })}`),
      apiRequest(`/analytics/summary${buildQuery({ range: timeRange })}`)
    ])
      .then(([metricsResponse, summaryResponse]) => {
        if (cancelled) {
          return;
        }

        setRemoteHistory(
          Array.isArray(metricsResponse?.data)
            ? metricsResponse.data.map((metric) => {
                const timestamp = new Date(metric.timestamp);

                return {
                  timestamp: timestamp.getTime(),
                  time: timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  }),
                  alive: metric.alive || 0,
                  dead: metric.dead || 0,
                  unknown: metric.unknown || 0
                };
              })
            : []
        );
        setAnalyticsSummary(summaryResponse || null);
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalyticsError(error.message || "Unable to load analytics.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeStatus() {
      setSystemLoading(true);
      setSystemError("");
      setIntegrationLoading(true);
      setIntegrationError("");

      try {
        const [systemPayload, integrationPayload] = await Promise.all([
          apiRequest("/system"),
          apiRequest("/integrations/status")
        ]);

        if (!cancelled) {
          setSystemInfo(systemPayload || null);
          setIntegrationStatus(integrationPayload || null);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error.message || "Unable to load runtime status.";
          setSystemError(message);
          setIntegrationError(message);
        }
      } finally {
        if (!cancelled) {
          setSystemLoading(false);
          setIntegrationLoading(false);
        }
      }
    }

    loadRuntimeStatus();
    const intervalId = window.setInterval(loadRuntimeStatus, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const alertTimers = alertTimersRef.current;

    dashboard.alerts.forEach((alert) => {
      if (alertTimers.has(alert.id)) {
        return;
      }

      const timerId = window.setTimeout(() => {
        setDashboard((prev) => ({
          ...prev,
          alerts: prev.alerts.filter((item) => item.id !== alert.id)
        }));
        alertTimers.delete(alert.id);
      }, 5000);

      alertTimers.set(alert.id, timerId);
    });

    const activeAlertIds = new Set(dashboard.alerts.map((alert) => alert.id));

    alertTimers.forEach((timerId, alertId) => {
      if (activeAlertIds.has(alertId)) {
        return;
      }

      window.clearTimeout(timerId);
      alertTimers.delete(alertId);
    });
  }, [dashboard.alerts]);

  const entries = useMemo(() => Object.entries(dashboard.nodes || {}), [dashboard.nodes]);
  const totalNodes = entries.length;
  const aliveCount = entries.filter(([, data]) => data?.status === "ALIVE").length;
  const deadCount = entries.filter(([, data]) => data?.status === "DEAD").length;
  const unknownCount = entries.filter(([, data]) => data?.status === "UNKNOWN").length;
  const retryCount = entries.reduce((sum, [, data]) => sum + (data?.retries || 0), 0);
  const activeIncidentsCount = dashboard.incidents.filter(
    (incident) => incident?.status === "ACTIVE"
  ).length;
  const healthScore = Math.max(0, 100 - deadCount * 30 - retryCount * 5);
  const systemLabel =
    deadCount > 0 ? "Needs attention" : unknownCount > 0 ? "Warming up" : "Fully operational";
  const systemStatus = deadCount > 0 ? "Critical" : retryCount > 3 || unknownCount > 0 ? "Warning" : "Healthy";

  const filteredHistory = useMemo(() => {
    const seconds = TIME_RANGE_SECONDS[timeRange] || TIME_RANGE_SECONDS["1m"];
    const cutoff = Date.now() - seconds * 1000;
    const history = Array.isArray(dashboard.history) ? dashboard.history : [];
    const nextHistory = history.filter((item) => (item?.timestamp || 0) >= cutoff);
    const localHistory = nextHistory.length > 0 ? nextHistory : history.slice(-20);
    return remoteHistory.length > 0 ? remoteHistory : localHistory;
  }, [dashboard.history, remoteHistory, timeRange]);

  const averageRecoveryTime = useMemo(() => {
    if (Number.isFinite(analyticsSummary?.avgRecoveryTime)) {
      return analyticsSummary.avgRecoveryTime;
    }

    const resolved = dashboard.incidents.filter(
      (incident) => incident?.status === "RESOLVED" && Number.isFinite(incident?.duration)
    );

    if (resolved.length === 0) {
      return 0;
    }

    const total = resolved.reduce((sum, incident) => sum + incident.duration, 0);
    return Math.round(total / resolved.length);
  }, [analyticsSummary, dashboard.incidents]);

  const failureRate = useMemo(() => {
    if (Number.isFinite(analyticsSummary?.failureRate)) {
      return analyticsSummary.failureRate;
    }

    if (!filteredHistory.length) {
      return 0;
    }

    const failedSamples = filteredHistory.filter((point) => (point?.dead || 0) > 0).length;
    return Math.round((failedSamples / filteredHistory.length) * 100);
  }, [analyticsSummary, filteredHistory]);

  const dismissAlert = (alertId) => {
    const timerId = alertTimersRef.current.get(alertId);
    if (timerId) {
      window.clearTimeout(timerId);
      alertTimersRef.current.delete(alertId);
    }

    setDashboard((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((alert) => alert.id !== alertId)
    }));
  };

  return {
    dashboard,
    ai,
    isDemoMode: DEMO_MODE,
    lastUpdated,
    chartCapacity,
    timeRange,
    setTimeRange,
    entries,
    totalNodes,
    aliveCount,
    deadCount,
    unknownCount,
    retryCount,
    activeIncidentsCount,
    averageRecoveryTime,
    failureRate,
    healthScore,
    systemLabel,
    systemStatus,
    systemInfo,
    systemLoading,
    systemError,
    integrationStatus,
    integrationLoading,
    integrationError,
    filteredHistory,
    analyticsSummary,
    analyticsLoading,
    analyticsError,
    dismissAlert
  };
}
