const express = require("express");
const { validate } = require("../middleware/validate");
const { authorizeRoles } = require("../middleware/authorize");
const { ROLES } = require("../services/authService");
const { alertsQuerySchema } = require("../validation/schemas");
const { acknowledgeAlert, getRecentAlerts, resolveAlert } = require("../services/alertService");

const router = express.Router();

router.get("/", validate(alertsQuerySchema, "query"), async (req, res, next) => {
  try {
    const alerts = await getRecentAlerts(req.query);
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/acknowledge", authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR), async (req, res, next) => {
  try {
    const alert = await acknowledgeAlert(req.params.id, req.user);
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/resolve", authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR), async (req, res, next) => {
  try {
    const alert = await resolveAlert(req.params.id, req.user);
    res.json(alert);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
