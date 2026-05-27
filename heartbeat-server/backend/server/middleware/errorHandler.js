const logger = require("../services/logger");
const config = require("../config/env");

function normalizeError(error) {
  if (error?.name === "ZodError") {
    return {
      statusCode: 400,
      error: "ValidationError",
      message: "Invalid request data.",
      details: error.issues || []
    };
  }

  if (error?.name === "ValidationError") {
    return {
      statusCode: 400,
      error: "ValidationError",
      message: error.message || "Validation failed."
    };
  }

  if (error?.name === "CastError") {
    return {
      statusCode: 400,
      error: "BadRequest",
      message: "Invalid identifier or request format."
    };
  }

  if (error?.code === 11000) {
    return {
      statusCode: 409,
      error: "Conflict",
      message: "Duplicate resource detected."
    };
  }

  return {
    statusCode: error?.statusCode || 500,
    error: error?.name || "InternalServerError",
    message: error?.message || "Unexpected server error",
    details: error?.details
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: "NotFound",
    message: `No route found for ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(error, req, res, next) {
  const normalized = normalizeError(error);

  logger.error(
    {
      err: error,
      method: req.method,
      path: req.originalUrl,
      statusCode: normalized.statusCode
    },
    normalized.message
  );

  const response = {
    error: normalized.error,
    message: normalized.message
  };

  if (normalized.details) {
    response.details = normalized.details;
  }

  if (config.env !== "production" && error?.stack) {
    response.stack = error.stack;
  }

  res.status(normalized.statusCode).json(response);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
