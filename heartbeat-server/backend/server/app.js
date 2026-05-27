const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const authRoutes = require("./routes/auth");
const metricsRoutes = require("./routes/metrics");
const analyticsRoutes = require("./routes/analytics");
const logsRoutes = require("./routes/logs");
const incidentsRoutes = require("./routes/incidents");
const nodesRoutes = require("./routes/nodes");
const alertsRoutes = require("./routes/alerts");
const integrationsRoutes = require("./routes/integrations");
const auditLogsRoutes = require("./routes/auditLogs");
const insightsRoutes = require("./routes/insights");
const healthRoutes = require("./routes/health");
const systemRoutes = require("./routes/system");
const { authenticateRequest } = require("./middleware/authenticate");
const { authorizeRoles } = require("./middleware/authorize");
const { ROLES } = require("./services/authService");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

function buildCorsOrigin() {
  if (config.corsOrigins.includes("*")) {
    return true;
  }

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (config.env !== "production") {
      try {
        const parsedOrigin = new URL(origin);
        if (["localhost", "127.0.0.1"].includes(parsedOrigin.hostname)) {
          callback(null, true);
          return;
        }
      } catch (_error) {
        // Fall through to the denial below.
      }
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  };
}

function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );
  app.use(
    cors({
      origin: buildCorsOrigin(),
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api", authenticateRequest);
  app.use("/api/system", systemRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/incidents", incidentsRoutes);
  app.use("/api/nodes", nodesRoutes);
  app.use("/api/logs", logsRoutes);
  app.use("/api/alerts", alertsRoutes);
  app.use("/api/integrations", integrationsRoutes);
  app.use("/api/audit-logs", authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR), auditLogsRoutes);
  app.use("/api/ai/insights", insightsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
