const mongoose = require("mongoose");
const config = require("./env");
const logger = require("../services/logger");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeMongoUri(uri = "") {
  return String(uri).replace(/\/\/([^:/]+):([^@]+)@/, "//<user>:<password>@");
}

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connected");
  });
  mongoose.connection.on("error", (error) => {
    logger.error({ err: error }, "MongoDB connection error");
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });

  let lastError = null;

  for (let attempt = 1; attempt <= config.dbConnectAttempts; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri);
      return;
    } catch (error) {
      lastError = error;
      logger.error(
        {
          err: error,
          attempt,
          attempts: config.dbConnectAttempts,
          mongoUri: sanitizeMongoUri(config.mongoUri)
        },
        "MongoDB connection attempt failed"
      );

      if (attempt < config.dbConnectAttempts) {
        await sleep(config.dbConnectRetryMs);
      }
    }
  }

  logger.error(
    {
      mongoUri: sanitizeMongoUri(config.mongoUri)
    },
    "MongoDB is not reachable. Start MongoDB locally, run `docker compose up mongo`, or update MONGODB_URI in backend/.env."
  );

  throw lastError;
}

module.exports = {
  connectDatabase,
  mongoose
};
