const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const readyState = mongoose.connection.readyState;
  const mongoHealthy = readyState === 1;

  res.status(mongoHealthy ? 200 : 503).json({
    status: mongoHealthy ? "ok" : "degraded",
    uptime: process.uptime(),
    mongo: {
      healthy: mongoHealthy,
      readyState
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
