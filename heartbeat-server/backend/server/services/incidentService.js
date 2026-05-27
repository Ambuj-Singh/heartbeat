const Incident = require("../models/Incident");
const config = require("../config/env");
const { createAuditLog } = require("./auditLogService");
const {
  notifyIncidentCreated,
  notifyIncidentResolved
} = require("./integrationService");

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function withinCooldownWindow(recoveredAt, nextFailedAt) {
  if (!recoveredAt) {
    return false;
  }

  const recoveredTime = toDate(recoveredAt).getTime();
  const failedTime = toDate(nextFailedAt).getTime();
  return failedTime - recoveredTime <= config.incidentCooldownSeconds * 1000;
}

async function createIncidentIfNeeded(node, failedAt, tags = {}) {
  const existing = await Incident.findOne({ node, status: "ACTIVE" }).lean();

  if (existing) {
    return { incident: existing, created: false, reopened: false };
  }

  const recentResolvedIncident = await Incident.findOne({
    node,
    status: "RESOLVED"
  }).sort({ recoveredAt: -1, failedAt: -1 });

  if (recentResolvedIncident && withinCooldownWindow(recentResolvedIncident.recoveredAt, failedAt)) {
    recentResolvedIncident.status = "ACTIVE";
    recentResolvedIncident.recoveredAt = null;
    recentResolvedIncident.duration = null;
    recentResolvedIncident.cluster = tags.cluster || recentResolvedIncident.cluster;
    recentResolvedIncident.service = tags.service || recentResolvedIncident.service;
    recentResolvedIncident.region = tags.region || recentResolvedIncident.region;
    recentResolvedIncident.environment = tags.environment || recentResolvedIncident.environment;
    await recentResolvedIncident.save();

    const incidentObject = recentResolvedIncident.toObject();
    void notifyIncidentCreated(incidentObject);

    return {
      incident: incidentObject,
      created: false,
      reopened: true
    };
  }

  try {
    const incident = await Incident.create({
      node,
      cluster: tags.cluster || null,
      service: tags.service || null,
      region: tags.region || null,
      environment: tags.environment || null,
      status: "ACTIVE",
      failedAt,
      recoveredAt: null,
      duration: null
    });

    const incidentObject = incident.toObject();
    void notifyIncidentCreated(incidentObject);

    return { incident: incidentObject, created: true, reopened: false };
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await Incident.findOne({ node, status: "ACTIVE" }).lean();
      return { incident: duplicate, created: false, reopened: false };
    }

    throw error;
  }
}

async function resolveActiveIncident(node, recoveredAt) {
  const activeIncident = await Incident.findOne({ node, status: "ACTIVE" });

  if (!activeIncident) {
    return { incident: null, resolved: false };
  }

  activeIncident.status = "RESOLVED";
  activeIncident.recoveredAt = recoveredAt;
  activeIncident.duration = Math.max(
    0,
    new Date(recoveredAt).getTime() - new Date(activeIncident.failedAt).getTime()
  );
  await activeIncident.save();

  const incidentObject = activeIncident.toObject();
  void notifyIncidentResolved(incidentObject);

  return { incident: incidentObject, resolved: true };
}

async function acknowledgeIncident(incidentId, user) {
  const incident = await Incident.findById(incidentId);

  if (!incident) {
    const error = new Error("Incident not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!incident.acknowledged) {
    incident.acknowledged = true;
    incident.acknowledgedBy = user.username;
    incident.acknowledgedAt = new Date();
    await incident.save();

    await createAuditLog({
      actor: user.username,
      actorRole: user.role,
      action: "INCIDENT_ACKNOWLEDGED",
      resourceType: "INCIDENT",
      resourceId: incident.id,
      metadata: { node: incident.node, status: incident.status }
    });
  }

  const incidentObject = incident.toObject();
  void notifyIncidentResolved(incidentObject);

  return incidentObject;
}

async function resolveIncidentById(incidentId, user) {
  const incident = await Incident.findById(incidentId);

  if (!incident) {
    const error = new Error("Incident not found.");
    error.statusCode = 404;
    throw error;
  }

  if (incident.status !== "RESOLVED") {
    incident.status = "RESOLVED";
    incident.recoveredAt = new Date();
    incident.duration = Math.max(
      0,
      new Date(incident.recoveredAt).getTime() - new Date(incident.failedAt).getTime()
    );
    if (!incident.acknowledged) {
      incident.acknowledged = true;
      incident.acknowledgedBy = user.username;
      incident.acknowledgedAt = new Date();
    }
    await incident.save();

    await createAuditLog({
      actor: user.username,
      actorRole: user.role,
      action: "INCIDENT_RESOLVED",
      resourceType: "INCIDENT",
      resourceId: incident.id,
      metadata: { node: incident.node }
    });
  }

  return incident.toObject();
}

async function updateIncidentNotes(incidentId, notes, user) {
  const incident = await Incident.findById(incidentId);

  if (!incident) {
    const error = new Error("Incident not found.");
    error.statusCode = 404;
    throw error;
  }

  incident.notes = notes || null;
  await incident.save();

  await createAuditLog({
    actor: user.username,
    actorRole: user.role,
    action: "INCIDENT_NOTE_UPDATED",
    resourceType: "INCIDENT",
    resourceId: incident.id,
    metadata: { node: incident.node, hasNotes: Boolean(incident.notes) }
  });

  return incident.toObject();
}

async function processTransitions(transitions = []) {
  const events = [];

  for (const transition of transitions) {
    if (!transition.changed) {
      continue;
    }

    if (transition.currentStatus === "DEAD" && transition.previousStatus !== "DEAD") {
      const result = await createIncidentIfNeeded(transition.node, transition.timestamp, transition);
      if (result.incident) {
        events.push({
          type: result.reopened ? "REOPENED" : "FAILURE",
          created: result.created,
          reopened: result.reopened,
          cooldownSeconds: config.incidentCooldownSeconds,
          node: transition.node,
          timestamp: transition.timestamp,
          incident: result.incident
        });
      }
    }

    if (transition.previousStatus === "DEAD" && transition.currentStatus === "ALIVE") {
      const result = await resolveActiveIncident(transition.node, transition.timestamp);
      if (result.incident && result.resolved) {
        events.push({
          type: "RECOVERY",
          resolved: result.resolved,
          node: transition.node,
          timestamp: transition.timestamp,
          incident: result.incident
        });
      }
    }
  }

  return events;
}

async function getIncidents(filters = {}) {
  const { status, node, cluster, service, region, environment, limit = 50 } = filters;
  const query = {};

  if (status && status !== "ALL") {
    query.status = String(status).toUpperCase();
  }
  if (node) query.node = { $regex: String(node).trim(), $options: "i" };
  if (cluster) query.cluster = cluster;
  if (service) query.service = service;
  if (region) query.region = region;
  if (environment) query.environment = environment;

  return Incident.find(query)
    .sort({ failedAt: -1 })
    .limit(Math.max(1, Math.min(500, Number(limit) || 50)))
    .lean();
}

module.exports = {
  acknowledgeIncident,
  getIncidents,
  processTransitions,
  resolveIncidentById,
  updateIncidentNotes,
  withinCooldownWindow
};
