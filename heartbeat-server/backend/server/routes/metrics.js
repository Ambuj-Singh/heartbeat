const express = require("express");
const { validate } = require("../middleware/validate");
const { getMetricsByRange, resolveRange } = require("../services/metricService");
const { metricsQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", validate(metricsQuerySchema, "query"), async (req, res, next) => {
  try {
    const range = resolveRange(req.query.range);
    const metrics = await getMetricsByRange(range);
    res.json({
      range,
      count: metrics.length,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
