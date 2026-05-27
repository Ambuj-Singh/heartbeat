const express = require("express");
const { validate } = require("../middleware/validate");
const { authorizeRoles } = require("../middleware/authorize");
const { ROLES } = require("../services/authService");
const {
  incidentsQuerySchema,
  incidentNotesBodySchema,
  incidentsExportQuerySchema
} = require("../validation/schemas");
const {
  acknowledgeIncident,
  getIncidents,
  resolveIncidentById,
  updateIncidentNotes
} = require("../services/incidentService");
const { toCsv } = require("../services/exportService");

const router = express.Router();

router.get("/", validate(incidentsQuerySchema, "query"), async (req, res, next) => {
  try {
    const incidents = await getIncidents(req.query);
    res.json({
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
});

router.get("/export", validate(incidentsExportQuerySchema, "query"), async (req, res, next) => {
  try {
    const format = req.query.format || "json";
    const incidents = await getIncidents(req.query);

    if (format === "csv") {
      const csv = toCsv(incidents, [
        { key: "node", header: "node" },
        { key: "status", header: "status" },
        { key: "failedAt", header: "failedAt" },
        { key: "recoveredAt", header: "recoveredAt" },
        { key: "duration", header: "duration" },
        { key: "acknowledged", header: "acknowledged" },
        { key: "acknowledgedBy", header: "acknowledgedBy" },
        { key: "cluster", header: "cluster" },
        { key: "service", header: "service" },
        { key: "region", header: "region" },
        { key: "environment", header: "environment" },
        { key: "notes", header: "notes" }
      ]);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="incidents-export.csv"');
      res.send(csv);
      return;
    }

    res.json({
      count: incidents.length,
      data: incidents
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/acknowledge", authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR), async (req, res, next) => {
  try {
    const incident = await acknowledgeIncident(req.params.id, req.user);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/resolve", authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR), async (req, res, next) => {
  try {
    const incident = await resolveIncidentById(req.params.id, req.user);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id/notes",
  authorizeRoles(ROLES.ADMIN, ROLES.OPERATOR),
  validate(incidentNotesBodySchema),
  async (req, res, next) => {
  try {
    const incident = await updateIncidentNotes(req.params.id, req.body.notes, req.user);
    res.json(incident);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
