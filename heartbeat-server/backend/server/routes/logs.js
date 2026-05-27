const express = require("express");
const { validate } = require("../middleware/validate");
const { getLogs, getLogsForExport } = require("../services/logService");
const { logsExportQuerySchema, logsQuerySchema } = require("../validation/schemas");
const { toCsv } = require("../services/exportService");

const router = express.Router();

router.get("/export", validate(logsExportQuerySchema, "query"), async (req, res, next) => {
  try {
    const format = req.query.format || "json";
    const logs = await getLogsForExport(req.query);

    if (format === "csv") {
      const csv = toCsv(logs, [
        { key: "timestamp", header: "timestamp" },
        { key: "level", header: "level" },
        { key: "node", header: "node" },
        { key: "cluster", header: "cluster" },
        { key: "service", header: "service" },
        { key: "region", header: "region" },
        { key: "environment", header: "environment" },
        { key: "message", header: "message" }
      ]);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="logs-export.csv"');
      res.send(csv);
      return;
    }

    res.json({
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", validate(logsQuerySchema, "query"), async (req, res, next) => {
  try {
    const logs = await getLogs(req.query);

    res.json({
      count: logs.data.length,
      total: logs.total,
      page: logs.page,
      limit: logs.limit,
      totalPages: logs.totalPages,
      data: logs.data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
