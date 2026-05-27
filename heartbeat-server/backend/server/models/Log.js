const { Schema, model } = require("mongoose");
const config = require("../config/env");

const logSchema = new Schema(
  {
    message: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ["INFO", "WARN", "ERROR"],
      default: "INFO",
      index: true
    },
    node: { type: String, default: null, index: true },
    cluster: { type: String, default: null, index: true },
    service: { type: String, default: null, index: true },
    region: { type: String, default: null, index: true },
    environment: { type: String, default: null, index: true },
    timestamp: { type: Date, required: true, index: true }
  },
  {
    versionKey: false
  }
);

logSchema.index({ timestamp: -1 });
logSchema.index({ level: 1, timestamp: -1 });
logSchema.index({ cluster: 1, service: 1, region: 1, environment: 1, timestamp: -1 });
logSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: config.logTtlSeconds, name: "log_ttl_index" }
);

module.exports = model("Log", logSchema);
