const { Schema, model } = require("mongoose");

const auditLogSchema = new Schema(
  {
    actor: { type: String, required: true, index: true },
    actorRole: {
      type: String,
      enum: ["ADMIN", "OPERATOR", "VIEWER"],
      required: true,
      index: true
    },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  {
    versionKey: false
  }
);

auditLogSchema.index({ timestamp: -1, actor: 1, action: 1 });

module.exports = model("AuditLog", auditLogSchema);
