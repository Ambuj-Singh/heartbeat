const express = require("express");
const { validate } = require("../middleware/validate");
const { analyticsQuerySchema } = require("../validation/schemas");
const { getAnalyticsSummary } = require("../services/analyticsService");

const router = express.Router();

router.get("/summary", validate(analyticsQuerySchema, "query"), async (req, res, next) => {
  try {
    const summary = await getAnalyticsSummary(req.query);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
