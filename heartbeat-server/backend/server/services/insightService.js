function buildInsight(snapshot = {}) {
  const nodes = snapshot.nodes || {};
  const incidents = snapshot.incidents || [];
  const alerts = snapshot.alerts || [];
  const nodeValues = Object.values(nodes);
  const alive = nodeValues.filter((node) => node?.status === "ALIVE").length;
  const dead = nodeValues.filter((node) => node?.status === "DEAD").length;
  const unknown = nodeValues.filter((node) => node?.status === "UNKNOWN").length;
  const retries = nodeValues.reduce((sum, node) => sum + (node?.retries || 0), 0);
  const activeIncidents = incidents.filter((incident) => incident.status === "ACTIVE");
  const riskLevel = dead > 0 ? "HIGH" : retries > 3 || unknown > 0 ? "MEDIUM" : "LOW";

  const recommendations = [];

  if (dead > 0) {
    recommendations.push("Investigate dead nodes immediately and check restart or dependency failures.");
  }

  if (retries > 3) {
    recommendations.push("Retry volume is elevated. Review network stability and upstream dependencies.");
  }

  if (unknown > 0) {
    recommendations.push("Unknown nodes are present. Verify telemetry connectivity and node registration.");
  }

  if (recommendations.length === 0) {
    recommendations.push("System posture is stable. Continue monitoring for anomalies.");
  }

  return {
    riskLevel,
    summary:
      dead > 0
        ? `${dead} node(s) are currently dead and require operator attention.`
        : activeIncidents.length > 0
          ? `${activeIncidents.length} unresolved incident(s) are still active.`
          : `System is stable with ${alive} alive node(s) and ${alerts.length} recent alert(s).`,
    anomalies: [
      dead > 0 ? `${dead} dead node(s) detected.` : null,
      unknown > 0 ? `${unknown} node(s) reporting unknown status.` : null,
      retries > 3 ? `Retry pressure elevated at ${retries} total retries.` : null
    ].filter(Boolean),
    recommendations
  };
}

module.exports = {
  buildInsight
};
