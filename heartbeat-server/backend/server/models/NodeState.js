const { Schema, model } = require("mongoose");

const nodeStateSchema = new Schema(
  {
    node: { type: String, required: true, unique: true, trim: true },
    cluster: { type: String, default: "default", index: true },
    service: { type: String, default: null, index: true },
    region: { type: String, default: null, index: true },
    environment: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["ALIVE", "DEAD", "UNKNOWN"],
      required: true,
      default: "UNKNOWN",
      index: true
    },
    retries: { type: Number, default: 0, min: 0 },
    lastChange: { type: Date, default: null },
    lastUpdated: { type: Date, required: true, index: true }
  },
  {
    versionKey: false
  }
);

nodeStateSchema.index({ cluster: 1, service: 1, region: 1, environment: 1, status: 1 });

module.exports = model("NodeState", nodeStateSchema);
