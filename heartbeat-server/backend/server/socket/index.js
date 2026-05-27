const { Server } = require("socket.io");
const config = require("../config/env");
const { getDashboardSnapshot } = require("../services/dashboardService");
const { handleMetricsUpdate } = require("../services/realtimeService");
const { getUserFromAccessToken, ROLES } = require("../services/authService");
const logger = require("../services/logger");
const {
  decrementSockets,
  incrementSockets,
  setSocketServer
} = require("../services/runtimeState");

function parseCookieHeader(headerValue = "") {
  return String(headerValue || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, item) => {
      const separatorIndex = item.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = item.slice(0, separatorIndex).trim();
      const value = item.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function buildCorsOrigin() {
  if (config.corsOrigins.includes("*")) {
    return true;
  }

  return config.corsOrigins;
}

function createSocketLimiter() {
  const state = {
    windowStartedAt: Date.now(),
    count: 0,
    invalidCount: 0
  };

  return {
    markMessage() {
      const now = Date.now();
      if (now - state.windowStartedAt > config.socketRateLimitWindowMs) {
        state.windowStartedAt = now;
        state.count = 0;
        state.invalidCount = 0;
      }

      state.count += 1;
      return state.count <= config.socketRateLimitMax;
    },
    markInvalid() {
      state.invalidCount += 1;
      return state.invalidCount <= config.socketInvalidPayloadLimit;
    }
  };
}

function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: buildCorsOrigin(),
      credentials: true
    }
  });

  setSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers?.cookie);
      const token = cookies[config.accessTokenCookieName];

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const user = await getUserFromAccessToken(token);
      socket.data.user = user;
      socket.data.limiter = createSocketLimiter();
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    incrementSockets();
    logger.info(
      {
        socketId: socket.id,
        user: socket.data.user?.username,
        role: socket.data.user?.role
      },
      "Socket connected"
    );

    try {
      const snapshot = await getDashboardSnapshot();
      socket.emit("dashboard:init", snapshot);
      socket.emit("init", snapshot);
      socket.emit("ai", { message: snapshot.ai.summary });
    } catch (error) {
      logger.error({ err: error, socketId: socket.id }, "Failed to hydrate socket snapshot");
      socket.emit("server:error", {
        message: "Failed to load dashboard snapshot."
      });
    }

    socket.on("metrics:update", async (payload = {}) => {
      const limiter = socket.data.limiter;

      if (!limiter.markMessage()) {
        logger.warn(
          {
            socketId: socket.id,
            user: socket.data.user?.username
          },
          "Socket rate limit exceeded"
        );
        socket.emit("metrics:error", {
          message: "Rate limit exceeded."
        });
        socket.disconnect(true);
        return;
      }

      try {
        if (![ROLES.ADMIN, ROLES.OPERATOR].includes(socket.data.user?.role)) {
          socket.emit("metrics:error", {
            message: "Forbidden"
          });
          return;
        }

        const result = await handleMetricsUpdate(payload, io);
        socket.emit("metrics:ack", {
          ok: true,
          metricId: result.metric._id
        });
      } catch (error) {
        const valid = limiter.markInvalid();
        logger.warn(
          {
            err: error,
            socketId: socket.id,
            user: socket.data.user?.username
          },
          "Socket payload rejected"
        );
        socket.emit("metrics:error", {
          message: error.message || "Unable to process metrics update.",
          details: error.details || []
        });

        if (!valid) {
          socket.disconnect(true);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      decrementSockets();
      logger.info(
        {
          socketId: socket.id,
          user: socket.data.user?.username,
          reason
        },
        "Socket disconnected"
      );
    });
  });

  return io;
}

module.exports = initializeSocket;
