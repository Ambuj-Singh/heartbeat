const express = require("express");
const { validate } = require("../middleware/validate");
const { auditLogsQuerySchema } = require("../validation/schemas");
const { getAuditLogs } = require("../services/auditLogService");

const router = express.Router();

router.get("/", validate(auditLogsQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await getAuditLogs(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
