const { Schema, model } = require("mongoose");

const alertSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["CRITICAL", "RECOVERY", "WARNING"],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
      default: "MEDIUM",
      index: true
    },
    message: { type: String, required: true, trim: true },
    node: { type: String, default: null, index: true },
    cluster: { type: String, default: null, index: true },
    service: { type: String, default: null, index: true },
    region: { type: String, default: null, index: true },
    environment: { type: String, default: null, index: true },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date, default: null },
    timestamp: { type: Date, required: true, index: true, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    versionKey: false,
    timestamps: { createdAt: true, updatedAt: true }
  }
);

alertSchema.index({ timestamp: -1 });
alertSchema.index({ severity: 1, resolved: 1, acknowledged: 1, createdAt: -1 });

module.exports = model("Alert", alertSchema);
