const Log = require("../models/Log");
const config = require("../config/env");

function sanitizeMessage(message) {
  return String(message || "").replace(/\s+/g, " ").trim();
}

function normalizeLevel(level = "INFO") {
  const safeLevel = String(level || "INFO").toUpperCase();
  return ["INFO", "WARN", "ERROR"].includes(safeLevel) ? safeLevel : "INFO";
}

async function trimLogs() {
  const overflow = await Log.find({})
    .sort({ timestamp: -1 })
    .skip(config.logRetentionLimit)
    .select("_id")
    .lean();

  if (overflow.length > 0) {
    await Log.deleteMany({
      _id: { $in: overflow.map((item) => item._id) }
    });
  }
}

async function createLog({
  message,
  level = "INFO",
  timestamp,
  node = null,
  cluster = null,
  service = null,
  region = null,
  environment = null
}) {
  const safeMessage = sanitizeMessage(message);

  if (!safeMessage) {
    return null;
  }

  const log = await Log.create({
    message: safeMessage,
    level: normalizeLevel(level),
    node,
    cluster,
    service,
    region,
    environment,
    timestamp: timestamp ? new Date(timestamp) : new Date()
  });

  await trimLogs();
  return log.toObject();
}

async function createLogs(entries = []) {
  const created = [];

  for (const entry of entries) {
    const log = await createLog(typeof entry === "string" ? { message: entry } : entry);
    if (log) {
      created.push(log);
    }
  }

  return created;
}

async function getLogs(filters = {}) {
  const {
    level,
    search,
    page = 1,
    limit = 50,
    cluster,
    service,
    region,
    environment,
    node
  } = filters;
  const query = {};
  const safeLimit = Math.min(config.logRetentionLimit, Math.max(1, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  if (level) query.level = normalizeLevel(level);
  if (search) query.message = { $regex: search, $options: "i" };
  if (cluster) query.cluster = cluster;
  if (service) query.service = service;
  if (region) query.region = region;
  if (environment) query.environment = environment;
  if (node) query.node = { $regex: String(node).trim(), $options: "i" };

  const [total, data] = await Promise.all([
    Log.countDocuments(query),
    Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
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

async function getLogsForExport(filters = {}) {
  const { limit = config.exportLimitMax, ...rest } = filters;
  const result = await getLogs({
    ...rest,
    page: 1,
    limit: Math.min(config.exportLimitMax, Math.max(1, Number(limit) || config.exportLimitMax))
  });

  return result.data;
}

module.exports = {
  createLog,
  createLogs,
  getLogsForExport,
  getLogs,
  normalizeLevel
};
