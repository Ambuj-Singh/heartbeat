const { createAlert } = require("./alertService");
const { getDashboardSnapshot } = require("./dashboardService");
const { processTransitions } = require("./incidentService");
const { createLog, createLogs } = require("./logService");
const { createMetric, normalizeTimestamp } = require("./metricService");
const { syncNodeStates } = require("./nodeService");
const { metricsUpdateSchema } = require("../validation/schemas");

function validateMetricPayload(payload = {}) {
  const result = metricsUpdateSchema.safeParse(payload);

  if (!result.success) {
    const error = new Error("Invalid metrics:update payload.");
    error.statusCode = 400;
    error.details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    throw error;
  }

  return {
    ...result.data,
    timestamp: normalizeTimestamp(result.data?.timestamp)
  };
}

async function persistTransitionSideEffects(transitions, incidentEvents) {
  const logs = [];
  const alerts = [];

  for (const transition of transitions) {
    if (transition.changed) {
      const transitionLog = await createLog({
        level: transition.currentStatus === "DEAD" ? "ERROR" : "INFO",
        message: `${transition.node} transitioned from ${transition.previousStatus} to ${transition.currentStatus}.`,
        timestamp: transition.timestamp,
        node: transition.node,
        cluster: transition.cluster,
        service: transition.service,
        region: transition.region,
        environment: transition.environment
      });

      if (transitionLog) logs.push(transitionLog);
    }

    if (transition.currentRetries > 3 && transition.previousRetries <= 3) {
      const retryAlert = await createAlert({
        type: "WARNING",
        severity: "MEDIUM",
        message: `${transition.node} is showing high retry pressure (${transition.currentRetries}).`,
        node: transition.node,
        cluster: transition.cluster,
        service: transition.service,
        region: transition.region,
        environment: transition.environment,
        metadata: { retries: transition.currentRetries },
        timestamp: transition.timestamp
      });
      alerts.push(retryAlert);

      const retryLog = await createLog({
        level: "WARN",
        message: `${transition.node} retry count increased to ${transition.currentRetries}.`,
        timestamp: transition.timestamp,
        node: transition.node,
        cluster: transition.cluster,
        service: transition.service,
        region: transition.region,
        environment: transition.environment
      });
      if (retryLog) logs.push(retryLog);
    }
  }

  for (const event of incidentEvents) {
    const baseAlert = {
      node: event.node,
      cluster: event.incident?.cluster || null,
      service: event.incident?.service || null,
      region: event.incident?.region || null,
      environment: event.incident?.environment || null,
      metadata: { incidentId: event.incident?._id }
    };

    if (event.type === "FAILURE" && event.created) {
      alerts.push(
        await createAlert({
          ...baseAlert,
          type: "CRITICAL",
          severity: "CRITICAL",
          message: `${event.node} is down and an incident has been opened.`,
          timestamp: event.incident?.failedAt
        })
      );
    }

    if (event.type === "REOPENED") {
      alerts.push(
        await createAlert({
          ...baseAlert,
          type: "CRITICAL",
          severity: "CRITICAL",
          message: `${event.node} failed again within the cooldown window and the incident was reopened.`,
          metadata: { ...baseAlert.metadata, cooldownSeconds: event.cooldownSeconds },
          timestamp: event.timestamp
        })
      );

      const flapLog = await createLog({
        level: "ERROR",
        message: `${event.node} flapped and reopened an existing incident.`,
        timestamp: event.timestamp,
        node: event.node,
        cluster: event.incident?.cluster || null,
        service: event.incident?.service || null,
        region: event.incident?.region || null,
        environment: event.incident?.environment || null
      });
      if (flapLog) logs.push(flapLog);
    }

    if (event.type === "RECOVERY" && event.resolved) {
      alerts.push(
        await createAlert({
          ...baseAlert,
          type: "RECOVERY",
          severity: "LOW",
          message: `${event.node} recovered and the incident was resolved.`,
          timestamp: event.incident?.recoveredAt
        })
      );
    }
  }

  return { logs, alerts };
}

async function handleMetricsUpdate(rawPayload, io) {
  const metricPayload = validateMetricPayload(rawPayload);
  const metric = await createMetric(metricPayload);
  const transitions = await syncNodeStates(rawPayload?.nodes, metricPayload.timestamp);
  const incidentEvents = await processTransitions(transitions);
  const externalLogs = Array.isArray(rawPayload?.logs) ? await createLogs(rawPayload.logs) : [];
  const sideEffects = await persistTransitionSideEffects(transitions, incidentEvents);
  const snapshot = await getDashboardSnapshot();

  io.emit("metrics:broadcast", metric);
  io.emit("dashboard:update", snapshot);
  io.emit("update", snapshot);
  io.emit("ai:insight", snapshot.ai);
  io.emit("ai", { message: snapshot.ai.summary });

  for (const log of [...externalLogs, ...sideEffects.logs]) {
    io.emit("logs:stream", log);
  }

  for (const alert of sideEffects.alerts) {
    io.emit("alerts:stream", alert);
  }

  if (incidentEvents.length > 0) {
    io.emit("incidents:update", snapshot.incidents);
  }

  return {
    metric,
    transitions,
    incidentEvents,
    snapshot
  };
}

module.exports = {
  handleMetricsUpdate,
  validateMetricPayload
};
