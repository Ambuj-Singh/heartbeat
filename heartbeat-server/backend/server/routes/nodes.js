const express = require("express");
const { validate } = require("../middleware/validate");
const { getNodes } = require("../services/nodeService");
const { nodesQuerySchema } = require("../validation/schemas");

const router = express.Router();

router.get("/", validate(nodesQuerySchema, "query"), async (req, res, next) => {
  try {
    const nodes = await getNodes(req.query);
    res.json({
      count: nodes.length,
      data: nodes
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
