const { z } = require("zod");

const roleSchema = z.enum(["ADMIN", "OPERATOR", "VIEWER"]);
const nodeStatusSchema = z.enum(["ALIVE", "DEAD", "UNKNOWN"]);
const incidentStatusSchema = z.enum(["ACTIVE", "RESOLVED"]);
const logLevelSchema = z.enum(["INFO", "WARN", "ERROR"]);
const alertTypeSchema = z.enum(["CRITICAL", "RECOVERY", "WARNING"]);
const alertSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const alertStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);
const metricsRangeSchema = z.enum(["1m", "5m", "15m", "1h", "24h"]).default("1m");
const dockerStateSchema = z.enum([
  "all",
  "running",
  "exited",
  "restarting",
  "paused",
  "unhealthy",
  "dead",
  "created"
]);

const timestampSchema = z.union([z.string().datetime(), z.date()]).optional();
const tagFilterFields = {
  cluster: z.string().trim().max(100).optional(),
  service: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  environment: z.string().trim().max(100).optional(),
  node: z.string().trim().max(100).optional()
};

const logEntrySchema = z.union([
  z.string().min(1).max(2000),
  z.object({
    message: z.string().min(1).max(2000),
    level: logLevelSchema.optional(),
    timestamp: timestampSchema,
    ...tagFilterFields
  })
]);

const nodeInputSchema = z.object({
  status: nodeStatusSchema,
  retries: z.number().int().min(0).optional().default(0),
  timestamp: timestampSchema,
  cluster: z.string().trim().max(100).optional(),
  service: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  environment: z.string().trim().max(100).optional()
});

const metricsUpdateSchema = z
  .object({
    alive: z.number().int().min(0),
    dead: z.number().int().min(0),
    unknown: z.number().int().min(0),
    timestamp: timestampSchema,
    nodes: z.record(z.string().min(1), nodeInputSchema).optional(),
    logs: z.array(logEntrySchema).max(100).optional()
  })
  .strict();

const loginBodySchema = z
  .object({
    username: z.string().min(1).max(100),
    password: z.string().min(1).max(200)
  })
  .strict();

const metricsQuerySchema = z.object({
  range: metricsRangeSchema.optional(),
  ...tagFilterFields
});

const analyticsQuerySchema = z.object({
  range: metricsRangeSchema.optional(),
  ...tagFilterFields
});

const logsQuerySchema = z.object({
  level: logLevelSchema.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  ...tagFilterFields
});

const incidentsQuerySchema = z.object({
  status: incidentStatusSchema.or(z.literal("ALL")).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  ...tagFilterFields
});

const nodesQuerySchema = z.object({
  status: nodeStatusSchema.or(z.literal("ALL")).optional(),
  sort: z.enum(["name", "retries"]).optional(),
  ...tagFilterFields
});

const alertsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
  severity: alertSeveritySchema.optional(),
  type: alertTypeSchema.or(z.literal("ALL")).optional(),
  status: alertStatusSchema.or(z.literal("ALL")).optional(),
  ...tagFilterFields
});

const incidentNotesBodySchema = z.object({
  notes: z.string().trim().max(5000).nullable().optional()
});

const auditLogsQuerySchema = z.object({
  actor: z.string().trim().max(100).optional(),
  action: z.string().trim().max(100).optional(),
  resourceType: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

const exportFormatSchema = z.enum(["json", "csv"]).default("json");

const logsExportQuerySchema = logsQuerySchema.extend({
  format: exportFormatSchema.optional()
});

const incidentsExportQuerySchema = incidentsQuerySchema.extend({
  format: exportFormatSchema.optional()
});

const integrationTestBodySchema = z
  .object({
    target: z.enum(["slack", "webhook", "all"]).optional()
  })
  .strict();

const dockerContainerParamsSchema = z.object({
  id: z.string().trim().min(1).max(128)
});

const dockerContainersQuerySchema = z.object({
  state: dockerStateSchema.optional(),
  search: z.string().trim().max(200).optional()
});

const dockerContainerLogsQuerySchema = z.object({
  tail: z.coerce.number().int().min(1).max(500).optional()
});

module.exports = {
  alertSeveritySchema,
  alertStatusSchema,
  alertTypeSchema,
  alertsQuerySchema,
  analyticsQuerySchema,
  auditLogsQuerySchema,
  dockerContainerLogsQuerySchema,
  dockerContainerParamsSchema,
  dockerContainersQuerySchema,
  incidentNotesBodySchema,
  incidentStatusSchema,
  incidentsQuerySchema,
  incidentsExportQuerySchema,
  integrationTestBodySchema,
  logLevelSchema,
  loginBodySchema,
  logsQuerySchema,
  logsExportQuerySchema,
  metricsQuerySchema,
  metricsRangeSchema,
  metricsUpdateSchema,
  nodeStatusSchema,
  nodesQuerySchema,
  roleSchema
};
