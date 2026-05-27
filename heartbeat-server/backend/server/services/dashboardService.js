const { getRecentMetrics } = require("./metricService");
const { getLogs } = require("./logService");
const { getIncidents } = require("./incidentService");
const { getRecentAlerts } = require("./alertService");
const { getNodeMap } = require("./nodeService");
const { buildInsight } = require("./insightService");

function metricToHistoryPoint(metric) {
  const timestamp = metric?.timestamp ? new Date(metric.timestamp) : new Date();

  return {
    time: timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    alive: metric?.alive || 0,
    dead: metric?.dead || 0,
    unknown: metric?.unknown || 0,
    timestamp
  };
}

async function getDashboardSnapshot() {
  const [nodes, logs, metrics, incidents, alerts] = await Promise.all([
    getNodeMap(),
    getLogs({ limit: 100, page: 1 }),
    getRecentMetrics(20),
    getIncidents({ limit: 20 }),
    getRecentAlerts({ limit: 20, page: 1 })
  ]);

  const snapshot = {
    nodes,
    logs: [...logs.data].reverse(),
    history: metrics.map(metricToHistoryPoint),
    incidents,
    alerts: alerts.data
  };

  return {
    ...snapshot,
    ai: buildInsight(snapshot)
  };
}

module.exports = {
  getDashboardSnapshot,
  metricToHistoryPoint
};
