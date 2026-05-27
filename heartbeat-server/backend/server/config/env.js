const path = require("path");
const dotenv = require("dotenv");
const packageJson = require(path.resolve(__dirname, "..", "..", "..", "package.json"));

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCorsOrigins(value) {
  const configuredOrigins = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (configuredOrigins.length === 0) {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  const origins = new Set(configuredOrigins);

  if (origins.has("http://localhost:3000")) {
    origins.add("http://127.0.0.1:3000");
  }

  if (origins.has("http://127.0.0.1:3000")) {
    origins.add("http://localhost:3000");
  }

  return [...origins];
}

module.exports = {
  appVersion: process.env.APP_VERSION || packageJson.version || "0.0.0",
  env: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3002),
  mongoUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/heartbeat_monitor",
  dbConnectAttempts: toNumber(process.env.DB_CONNECT_ATTEMPTS, 3),
  dbConnectRetryMs: toNumber(process.env.DB_CONNECT_RETRY_MS, 2000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 300),
  logRetentionLimit: toNumber(process.env.LOG_RETENTION_LIMIT, 200),
  alertRetentionLimit: toNumber(process.env.ALERT_RETENTION_LIMIT, 50),
  metricRetentionLimit: toNumber(process.env.METRIC_RETENTION_LIMIT, 1000),
  logTtlSeconds: toNumber(process.env.LOG_TTL_SECONDS, 7 * 24 * 60 * 60),
  metricTtlSeconds: toNumber(process.env.METRIC_TTL_SECONDS, 30 * 24 * 60 * 60),
  metricsQueryLimit: toNumber(process.env.METRICS_QUERY_LIMIT, 500),
  incidentCooldownSeconds: toNumber(process.env.INCIDENT_COOLDOWN_SECONDS, 5),
  socketRateLimitWindowMs: toNumber(process.env.SOCKET_RATE_LIMIT_WINDOW_MS, 10_000),
  socketRateLimitMax: toNumber(process.env.SOCKET_RATE_LIMIT_MAX, 30),
  socketInvalidPayloadLimit: toNumber(process.env.SOCKET_INVALID_PAYLOAD_LIMIT, 3),
  dockerMonitorEnabled:
    String(process.env.DOCKER_MONITOR_ENABLED || "true").toLowerCase() === "true",
  dockerMonitorIntervalMs: toNumber(process.env.DOCKER_MONITOR_INTERVAL_MS, 5000),
  dockerMonitorCluster: process.env.DOCKER_MONITOR_CLUSTER || "local-docker",
  jwtSecret: process.env.JWT_SECRET || "development-jwt-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  refreshTokenSecret:
    process.env.REFRESH_TOKEN_SECRET || "development-refresh-secret-change-me",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  accessTokenCookieName: process.env.ACCESS_TOKEN_COOKIE_NAME || "heartbeat_access",
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME || "heartbeat_refresh",
  cookieSecure:
    String(process.env.COOKIE_SECURE || process.env.NODE_ENV === "production").toLowerCase() ===
    "true",
  cookieSameSite: process.env.COOKIE_SAMESITE || "strict",
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  exportLimitMax: toNumber(process.env.EXPORT_LIMIT_MAX, 500),
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  genericWebhookUrl: process.env.GENERIC_WEBHOOK_URL || "",
  outboundNotificationsEnabled:
    String(process.env.ENABLE_OUTBOUND_NOTIFICATIONS || "true").toLowerCase() === "true",
  bootstrapAdmin: {
    username: process.env.BOOTSTRAP_ADMIN_USERNAME || "admin",
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "admin12345",
    role: process.env.BOOTSTRAP_ADMIN_ROLE || "ADMIN"
  }
};
