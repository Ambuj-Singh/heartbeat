const AuditLog = require("../models/AuditLog");

async function createAuditLog({
  actor = "system",
  actorRole = "ADMIN",
  action,
  resourceType,
  resourceId = null,
  metadata = {},
  timestamp = new Date()
}) {
  const entry = await AuditLog.create({
    actor,
    actorRole,
    action,
    resourceType,
    resourceId: resourceId ? String(resourceId) : null,
    metadata,
    timestamp
  });

  return entry.toObject();
}

async function getAuditLogs({
  actor,
  action,
  resourceType,
  page = 1,
  limit = 50
} = {}) {
  const query = {};
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));

  if (actor) query.actor = { $regex: String(actor).trim(), $options: "i" };
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;

  const [total, data] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ timestamp: -1 })
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

module.exports = {
  createAuditLog,
  getAuditLogs
};
