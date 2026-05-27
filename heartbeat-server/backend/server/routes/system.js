const express = require("express");
const mongoose = require("mongoose");
const config = require("../config/env");
const { getActiveSocketConnections } = require("../services/runtimeState");

const router = express.Router();

router.get("/", (req, res) => {
  const memory = process.memoryUsage();
  const readyState = mongoose.connection.readyState;
  const mongoHealthy = readyState === 1;

  res.status(200).json({
    uptime: process.uptime(),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external
    },
    database: {
      healthy: mongoHealthy,
      readyState
    },
    sockets: {
      activeConnections: getActiveSocketConnections()
    },
    environment: config.env,
    version: config.appVersion,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
