const { Schema, model } = require("mongoose");
const config = require("../config/env");

const metricSchema = new Schema(
  {
    alive: { type: Number, required: true, min: 0 },
    dead: { type: Number, required: true, min: 0 },
    unknown: { type: Number, required: true, min: 0 },
    timestamp: { type: Date, required: true, index: true }
  },
  {
    versionKey: false
  }
);

metricSchema.index({ timestamp: 1 });
metricSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: config.metricTtlSeconds, name: "metric_ttl_index" }
);

module.exports = model("Metric", metricSchema);
