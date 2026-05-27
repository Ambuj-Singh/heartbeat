const NodeState = require("../models/NodeState");

function normalizeNodeStatus(status = "UNKNOWN") {
  const safeStatus = String(status || "UNKNOWN").toUpperCase();
  return ["ALIVE", "DEAD", "UNKNOWN"].includes(safeStatus)
    ? safeStatus
    : "UNKNOWN";
}

function normalizeNodesPayload(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        node: String(item?.node || item?.name || item?.id || "").trim(),
        status: normalizeNodeStatus(item?.status),
        retries: Math.max(0, Number(item?.retries) || 0),
        timestamp: item?.timestamp || null,
        cluster: String(item?.cluster || "default").trim() || "default",
        service: item?.service ? String(item.service).trim() : null,
        region: item?.region ? String(item.region).trim() : null,
        environment: item?.environment ? String(item.environment).trim() : null
      }))
      .filter((item) => item.node);
  }

  if (typeof input === "object") {
    return Object.entries(input).map(([node, value]) => ({
      node: String(node).trim(),
      status: normalizeNodeStatus(value?.status),
      retries: Math.max(0, Number(value?.retries) || 0),
      timestamp: value?.timestamp || null,
      cluster: String(value?.cluster || "default").trim() || "default",
      service: value?.service ? String(value.service).trim() : null,
      region: value?.region ? String(value.region).trim() : null,
      environment: value?.environment ? String(value.environment).trim() : null
    }));
  }

  return [];
}

async function syncNodeStates(inputNodes, fallbackTimestamp) {
  const normalizedNodes = normalizeNodesPayload(inputNodes);
  const transitions = [];

  for (const nodeInput of normalizedNodes) {
    const timestamp = nodeInput.timestamp ? new Date(nodeInput.timestamp) : fallbackTimestamp;
    const safeTimestamp = Number.isNaN(timestamp.getTime()) ? fallbackTimestamp : timestamp;
    const existing = await NodeState.findOne({ node: nodeInput.node });
    const previousStatus = existing?.status || "UNKNOWN";
    const previousRetries = existing?.retries || 0;
    const didStatusChange = !existing || previousStatus !== nodeInput.status;

    const nextNodeState = await NodeState.findOneAndUpdate(
      { node: nodeInput.node },
      {
        $set: {
          status: nodeInput.status,
          retries: nodeInput.retries,
          cluster: nodeInput.cluster,
          service: nodeInput.service,
          region: nodeInput.region,
          environment: nodeInput.environment,
          lastUpdated: safeTimestamp,
          ...(didStatusChange ? { lastChange: safeTimestamp } : {})
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    transitions.push({
      node: nodeInput.node,
      previousStatus,
      currentStatus: nodeInput.status,
      previousRetries,
      currentRetries: nodeInput.retries,
      changed: didStatusChange,
      timestamp: safeTimestamp,
      cluster: nodeInput.cluster,
      service: nodeInput.service,
      region: nodeInput.region,
      environment: nodeInput.environment,
      nodeState: nextNodeState
    });
  }

  return transitions;
}

async function getNodes(filters = {}) {
  const { status, sort = "name", cluster, service, region, environment, node } = filters;
  const query = {};

  if (status && status !== "ALL") {
    query.status = normalizeNodeStatus(status);
  }
  if (cluster) query.cluster = cluster;
  if (service) query.service = service;
  if (region) query.region = region;
  if (environment) query.environment = environment;
  if (node) query.node = { $regex: String(node).trim(), $options: "i" };

  const sortQuery = sort === "retries" ? { retries: -1, node: 1 } : { node: 1 };
  return NodeState.find(query).sort(sortQuery).lean();
}

async function getNodeMap() {
  const nodes = await NodeState.find({}).sort({ node: 1 }).lean();

  return nodes.reduce((accumulator, node) => {
    accumulator[node.node] = {
      status: node.status,
      retries: node.retries,
      cluster: node.cluster,
      service: node.service,
      region: node.region,
      environment: node.environment,
      lastChange: node.lastChange,
      lastUpdated: node.lastUpdated
    };
    return accumulator;
  }, {});
}

module.exports = {
  getNodeMap,
  getNodes,
  normalizeNodesPayload,
  normalizeNodeStatus,
  syncNodeStates
};
