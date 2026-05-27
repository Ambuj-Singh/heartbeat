const express = require("express");
const { getDashboardSnapshot } = require("../services/dashboardService");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const snapshot = await getDashboardSnapshot();
    res.json(snapshot.ai);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
