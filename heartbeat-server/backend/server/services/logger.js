const pino = require("pino");
const config = require("../config/env");

const logger = pino({
  level: config.logLevel,
  base: {
    service: "heartbeat-backend",
    env: config.env
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
