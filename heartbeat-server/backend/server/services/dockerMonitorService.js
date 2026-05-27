const { listContainers } = require("../../dockerService");
const config = require("../config/env");
const logger = require("./logger");
const { handleMetricsUpdate } = require("./realtimeService");

function mapContainerToNode(container) {
  const status = container?.status === "running" ? "ALIVE" : "DEAD";

  return {
    node: container?.name || container?.id || "unknown-container",
    status,
    retries: status === "ALIVE" ? 0 : 1,
    cluster: config.dockerMonitorCluster,
    service: "docker",
    region: "local",
    environment: config.env,
    timestamp: new Date().toISOString()
  };
}

function buildDockerMetricsPayload(containers = []) {
  const nodes = {};
  const mappedNodes = containers.map(mapContainerToNode);

  mappedNodes.forEach((node) => {
    nodes[node.node] = {
      status: node.status,
      retries: node.retries,
      cluster: node.cluster,
      service: node.service,
      region: node.region,
      environment: node.environment,
      timestamp: node.timestamp
    };
  });

  return {
    alive: mappedNodes.filter((node) => node.status === "ALIVE").length,
    dead: mappedNodes.filter((node) => node.status === "DEAD").length,
    unknown: 0,
    timestamp: new Date().toISOString(),
    nodes,
    logs: mappedNodes.map((node) => ({
      level: node.status === "ALIVE" ? "INFO" : "ERROR",
      message: `${node.status} Docker container ${node.node}.`,
      node: node.node,
      cluster: node.cluster,
      service: node.service,
      region: node.region,
      environment: node.environment,
      timestamp: node.timestamp
    }))
  };
}

function startDockerContainerMonitor(io) {
  if (!config.dockerMonitorEnabled) {
    logger.info("Docker container monitor disabled");
    return null;
  }

  let polling = false;
  let hasLoggedDockerFailure = false;

  async function pollDocker() {
    if (polling) {
      return;
    }

    polling = true;

    try {
      const containers = await listContainers();
      const payload = buildDockerMetricsPayload(containers);
      await handleMetricsUpdate(payload, io);

      if (hasLoggedDockerFailure) {
        logger.info("Docker container monitor recovered");
        hasLoggedDockerFailure = false;
      }
    } catch (error) {
      if (!hasLoggedDockerFailure) {
        logger.warn(
          { err: error },
          "Docker container monitor could not read Docker state. Disable with DOCKER_MONITOR_ENABLED=false if Docker is not available."
        );
        hasLoggedDockerFailure = true;
      }
    } finally {
      polling = false;
    }
  }

  void pollDocker();
  const intervalId = setInterval(pollDocker, config.dockerMonitorIntervalMs);

  logger.info(
    {
      intervalMs: config.dockerMonitorIntervalMs,
      cluster: config.dockerMonitorCluster
    },
    "Docker container monitor started"
  );

  return intervalId;
}

module.exports = {
  buildDockerMetricsPayload,
  startDockerContainerMonitor
};
