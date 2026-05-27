const Metric = require("../models/Metric");
const config = require("../config/env");

const RANGE_MAP_MS = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000
};

function resolveRange(range = "1m") {
  return RANGE_MAP_MS[range] ? range : "1m";
}

function rangeToStartDate(range = "1m") {
  const safeRange = resolveRange(range);
  return new Date(Date.now() - RANGE_MAP_MS[safeRange]);
}

function normalizeTimestamp(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function createMetric(payload) {
  const metric = await Metric.create({
    alive: payload.alive,
    dead: payload.dead,
    unknown: payload.unknown,
    timestamp: normalizeTimestamp(payload.timestamp)
  });

  await trimMetrics();
  return metric.toObject();
}

async function getMetricsByRange(range = "1m") {
  return Metric.find({
    timestamp: { $gte: rangeToStartDate(range) }
  })
    .sort({ timestamp: 1 })
    .limit(config.metricsQueryLimit)
    .lean();
}

async function getRecentMetrics(limit = 20) {
  const metrics = await Metric.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return metrics.reverse();
}

async function trimMetrics() {
  const overflow = await Metric.find({})
    .sort({ timestamp: -1 })
    .skip(config.metricRetentionLimit)
    .select("_id")
    .lean();

  if (overflow.length > 0) {
    await Metric.deleteMany({
      _id: { $in: overflow.map((item) => item._id) }
    });
  }
}

module.exports = {
  createMetric,
  getMetricsByRange,
  getRecentMetrics,
  normalizeTimestamp,
  resolveRange
};
