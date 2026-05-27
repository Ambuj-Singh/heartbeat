const { Schema, model } = require("mongoose");

const incidentSchema = new Schema(
  {
    node: { type: String, required: true, trim: true, index: true },
    cluster: { type: String, default: null, index: true },
    service: { type: String, default: null, index: true },
    region: { type: String, default: null, index: true },
    environment: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED"],
      required: true,
      index: true
    },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedBy: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    notes: { type: String, default: null },
    failedAt: { type: Date, required: true, index: true },
    recoveredAt: { type: Date, default: null },
    duration: { type: Number, default: null }
  },
  {
    versionKey: false
  }
);

incidentSchema.index(
  { node: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" }
  }
);
incidentSchema.index({ cluster: 1, service: 1, region: 1, environment: 1, failedAt: -1 });

module.exports = model("Incident", incidentSchema);
