const { getMetricsByRange } = require("./metricService");
const { getIncidents } = require("./incidentService");

function average(values = []) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function getAnalyticsSummary(filters = {}) {
  const [metrics, incidents] = await Promise.all([
    getMetricsByRange(filters.range || "1m"),
    getIncidents({ ...filters, limit: 500 })
  ]);

  const failureRate = metrics.length
    ? Math.round((metrics.filter((metric) => (metric.dead || 0) > 0).length / metrics.length) * 100)
    : 0;
  const resolved = incidents.filter(
    (incident) => incident.status === "RESOLVED" && Number.isFinite(incident.duration)
  );
  const avgRecoveryTime = average(resolved.map((incident) => incident.duration));
  const activeIncidents = incidents.filter((incident) => incident.status === "ACTIVE").length;
  const retryTrend = average(metrics.map((metric) => metric.dead * 2 + metric.unknown));
  const healthTrend = metrics.map((metric) => ({
    timestamp: metric.timestamp,
    value: Math.max(0, 100 - metric.dead * 30 - metric.unknown * 10)
  }));

  return {
    range: filters.range || "1m",
    failureRate,
    avgRecoveryTime,
    totalIncidents: incidents.length,
    activeIncidents,
    retryTrend,
    healthTrend
  };
}

module.exports = {
  getAnalyticsSummary
};
