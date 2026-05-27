const Alert = require("../models/Alert");
const config = require("../config/env");
const { createAuditLog } = require("./auditLogService");
const { notifyCriticalAlert } = require("./integrationService");

function normalizeAlertType(type = "WARNING") {
  const safeType = String(type || "WARNING").toUpperCase();
  return ["CRITICAL", "RECOVERY", "WARNING"].includes(safeType)
    ? safeType
    : "WARNING";
}

function normalizeAlertSeverity(severity = "MEDIUM") {
  const safeSeverity = String(severity || "MEDIUM").toUpperCase();
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(safeSeverity)
    ? safeSeverity
    : "MEDIUM";
}

async function trimAlerts() {
  const overflow = await Alert.find({})
    .sort({ createdAt: -1, timestamp: -1 })
    .skip(config.alertRetentionLimit)
    .select("_id")
    .lean();

  if (overflow.length > 0) {
    await Alert.deleteMany({
      _id: { $in: overflow.map((item) => item._id) }
    });
  }
}

async function createAlert({
  type,
  severity = "MEDIUM",
  message,
  node = null,
  cluster = null,
  service = null,
  region = null,
  environment = null,
  metadata = {},
  timestamp
}) {
  const alert = await Alert.create({
    type: normalizeAlertType(type),
    severity: normalizeAlertSeverity(severity),
    message: String(message || "").trim(),
    node,
    cluster,
    service,
    region,
    environment,
    metadata,
    timestamp: timestamp ? new Date(timestamp) : new Date()
  });

  await trimAlerts();

  const alertObject = alert.toObject();

  if (alertObject.type === "CRITICAL" || alertObject.severity === "CRITICAL") {
    void notifyCriticalAlert(alertObject);
  }

  return alertObject;
}

async function getRecentAlerts(filters = {}) {
  const {
    limit = config.alertRetentionLimit,
    page = 1,
    severity,
    type,
    status,
    cluster,
    service,
    region,
    environment,
    node
  } = filters;
  const query = {};
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || config.alertRetentionLimit));

  if (severity) query.severity = normalizeAlertSeverity(severity);
  if (type && type !== "ALL") query.type = normalizeAlertType(type);
  if (cluster) query.cluster = cluster;
  if (service) query.service = service;
  if (region) query.region = region;
  if (environment) query.environment = environment;
  if (node) query.node = { $regex: String(node).trim(), $options: "i" };

  if (status === "OPEN") {
    query.resolved = false;
    query.acknowledged = false;
  } else if (status === "ACKNOWLEDGED") {
    query.acknowledged = true;
    query.resolved = false;
  } else if (status === "RESOLVED") {
    query.resolved = true;
  }

  const [total, data] = await Promise.all([
    Alert.countDocuments(query),
    Alert.find(query)
      .sort({ createdAt: -1, timestamp: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean()
  ]);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    data
  };
}

async function acknowledgeAlert(alertId, user) {
  const alert = await Alert.findById(alertId);

  if (!alert) {
    const error = new Error("Alert not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!alert.acknowledged) {
    alert.acknowledged = true;
    alert.acknowledgedBy = user.username;
    alert.acknowledgedAt = new Date();
    await alert.save();

    await createAuditLog({
      actor: user.username,
      actorRole: user.role,
      action: "ALERT_ACKNOWLEDGED",
      resourceType: "ALERT",
      resourceId: alert.id,
      metadata: { node: alert.node, severity: alert.severity, type: alert.type }
    });
  }

  return alert.toObject();
}

async function resolveAlert(alertId, user) {
  const alert = await Alert.findById(alertId);

  if (!alert) {
    const error = new Error("Alert not found.");
    error.statusCode = 404;
    throw error;
  }

  if (!alert.resolved) {
    alert.resolved = true;
    alert.resolvedAt = new Date();
    if (!alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = user.username;
      alert.acknowledgedAt = new Date();
    }
    await alert.save();

    await createAuditLog({
      actor: user.username,
      actorRole: user.role,
      action: "ALERT_RESOLVED",
      resourceType: "ALERT",
      resourceId: alert.id,
      metadata: { node: alert.node, severity: alert.severity, type: alert.type }
    });
  }

  return alert.toObject();
}

module.exports = {
  acknowledgeAlert,
  createAlert,
  getRecentAlerts,
  normalizeAlertSeverity,
  normalizeAlertType,
  resolveAlert
};
