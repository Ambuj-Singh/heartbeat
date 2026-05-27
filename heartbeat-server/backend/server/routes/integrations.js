const express = require("express");
const { validate } = require("../middleware/validate");
const { authorizeRoles } = require("../middleware/authorize");
const { ROLES } = require("../services/authService");
const { integrationTestBodySchema } = require("../validation/schemas");
const { getIntegrationStatus, testIntegrations } = require("../services/integrationService");
const dockerIntegrationsRoutes = require("./dockerIntegrations");

const router = express.Router();

router.use("/docker", dockerIntegrationsRoutes);

router.get("/status", async (req, res, next) => {
  try {
    res.json(getIntegrationStatus());
  } catch (error) {
    next(error);
  }
});

router.post(
  "/test",
  authorizeRoles(ROLES.ADMIN),
  validate(integrationTestBodySchema),
  async (req, res, next) => {
    try {
      const result = await testIntegrations(req.body?.target, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
