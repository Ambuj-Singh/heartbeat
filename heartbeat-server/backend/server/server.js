const http = require("http");
const createApp = require("./app");
const config = require("./config/env");
const { connectDatabase } = require("./config/database");
const initializeSocket = require("./socket");
const { ensureBootstrapAdmin } = require("./services/authService");
const { startDockerContainerMonitor } = require("./services/dockerMonitorService");
const logger = require("./services/logger");

async function startServer() {
  await connectDatabase();
  await ensureBootstrapAdmin();

  const app = createApp();
  const server = http.createServer(app);
  const io = initializeSocket(server);
  startDockerContainerMonitor(io);

  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      logger.fatal(
        {
          port: config.port
        },
        "Port already in use. Another Heartbeat backend instance is likely already running."
      );
      process.exit(1);
    }

    logger.fatal({ err: error }, "HTTP server failed");
    process.exit(1);
  });

  server.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.env
      },
      "Heartbeat backend listening"
    );
  });
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start backend");
  process.exit(1);
});
