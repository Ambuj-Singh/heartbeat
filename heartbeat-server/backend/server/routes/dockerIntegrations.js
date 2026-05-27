const express = require("express");
const { validate } = require("../middleware/validate");
const { authorizeRoles } = require("../middleware/authorize");
const { ROLES } = require("../services/authService");
const {
  dockerContainerLogsQuerySchema,
  dockerContainerParamsSchema,
  dockerContainersQuerySchema
} = require("../validation/schemas");
const {
  getDockerContainer,
  getDockerContainerRecentLogs,
  getDockerIntegrationStatus,
  listDockerContainers,
  startDockerContainer,
  stopDockerContainer,
  restartDockerContainer,
  testDockerIntegration
} = require("../services/dockerIntegrationService");

const router = express.Router();

router.get("/status", async (req, res, next) => {
  try {
    const status = await getDockerIntegrationStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

router.get("/containers", validate(dockerContainersQuerySchema, "query"), async (req, res, next) => {
  try {
    const containers = await listDockerContainers(req.query);
    res.json(containers);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/containers/:id",
  validate(dockerContainerParamsSchema, "params"),
  async (req, res, next) => {
    try {
      const container = await getDockerContainer(req.params.id);
      res.json(container);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/containers/:id/logs",
  validate(dockerContainerParamsSchema, "params"),
  validate(dockerContainerLogsQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const logs = await getDockerContainerRecentLogs(req.params.id, req.query);
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/containers/:id/start",
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  validate(dockerContainerParamsSchema, "params"),
  async (req, res, next) => {
    try {
      const result = await startDockerContainer(req.params.id, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/containers/:id/stop",
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  validate(dockerContainerParamsSchema, "params"),
  async (req, res, next) => {
    try {
      const result = await stopDockerContainer(req.params.id, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/containers/:id/restart",
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  validate(dockerContainerParamsSchema, "params"),
  async (req, res, next) => {
    try {
      const result = await restartDockerContainer(req.params.id, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/test",
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  async (req, res, next) => {
    try {
      const result = await testDockerIntegration(req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
