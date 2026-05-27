const logger = require("./logger");
const { createAuditLog } = require("./auditLogService");
const {
  getContainerDetails,
  getContainerLogs,
  getDockerInfo,
  getDockerVersion,
  listContainers,
  pingDocker,
  startContainer,
  stopContainer,
  restartContainer
} = require("../../dockerService");

function buildDockerUnavailableError(error) {
  const nextError = new Error("Docker integration is unavailable.");
  nextError.statusCode = 503;
  nextError.details = [
    {
      path: "docker",
      message: error?.message || "Unable to reach Docker."
    }
  ];
  return nextError;
}

async function getDockerIntegrationStatus() {
  const lastCheckedAt = new Date().toISOString();

  try {
    await pingDocker();
    const [version, info] = await Promise.all([getDockerVersion(), getDockerInfo()]);

    return {
      connected: true,
      daemonReachable: true,
      dockerVersion: version?.Version || version?.Version || null,
      engineOperatingSystem: info?.OperatingSystem || null,
      containers: info?.Containers ?? null,
      lastCheckedAt
    };
  } catch (error) {
    logger.warn({ err: error }, "Docker integration status check failed");

    return {
      connected: false,
      daemonReachable: false,
      dockerVersion: null,
      engineOperatingSystem: null,
      containers: null,
      lastCheckedAt,
      error: error?.message || "Unable to reach Docker."
    };
  }
}

async function listDockerContainers(filters = {}) {
  try {
    const containers = await listContainers(filters);
    return {
      count: containers.length,
      data: containers
    };
  } catch (error) {
    throw buildDockerUnavailableError(error);
  }
}

async function getDockerContainer(containerId) {
  try {
    return await getContainerDetails(containerId);
  } catch (error) {
    if (error?.statusCode === 404 || /no such container/i.test(error?.message || "")) {
      const nextError = new Error("Docker container not found.");
      nextError.statusCode = 404;
      throw nextError;
    }

    throw buildDockerUnavailableError(error);
  }
}

async function getDockerContainerRecentLogs(containerId, options = {}) {
  try {
    const logs = await getContainerLogs(containerId, options);
    return {
      count: logs.length,
      data: logs
    };
  } catch (error) {
    if (error?.statusCode === 404 || /no such container/i.test(error?.message || "")) {
      const nextError = new Error("Docker container not found.");
      nextError.statusCode = 404;
      throw nextError;
    }

    throw buildDockerUnavailableError(error);
  }
}

async function testDockerIntegration(user) {
  const status = await getDockerIntegrationStatus();

  if (!status.connected) {
    throw buildDockerUnavailableError(new Error(status.error || "Docker is unavailable."));
  }

  const containers = await listContainers({ state: "all" });

  await createAuditLog({
    actor: user.username,
    actorRole: user.role,
    action: "DOCKER_INTEGRATION_TESTED",
    resourceType: "INTEGRATION",
    resourceId: "docker",
    metadata: {
      containerCount: containers.length
    }
  });

  return {
    status,
    sampleCount: containers.length
  };
}

async function restartDockerContainer(containerId, user) {
  return executeDockerContainerAction(containerId, "restart", user);
}

async function startDockerContainer(containerId, user) {
  return executeDockerContainerAction(containerId, "start", user);
}

async function stopDockerContainer(containerId, user) {
  return executeDockerContainerAction(containerId, "stop", user);
}

async function executeDockerContainerAction(containerId, action, user) {
  try {
    const executor =
      action === "start"
        ? startContainer
        : action === "stop"
          ? stopContainer
          : restartContainer;
    const actionLabel =
      action === "start" ? "started" : action === "stop" ? "stopped" : "restarted";
    const auditAction =
      action === "start"
        ? "DOCKER_CONTAINER_STARTED"
        : action === "stop"
          ? "DOCKER_CONTAINER_STOPPED"
          : "DOCKER_CONTAINER_RESTARTED";
    const container = await executor(containerId);

    await createAuditLog({
      actor: user.username,
      actorRole: user.role,
      action: auditAction,
      resourceType: "CONTAINER",
      resourceId: containerId,
      metadata: {
        containerName: container?.name || null,
        source: "docker",
        operation: action
      }
    });

    return {
      ok: true,
      message: `${container?.name || "Container"} ${actionLabel}.`,
      data: container
    };
  } catch (error) {
    if (error?.statusCode === 404 || /no such container/i.test(error?.message || "")) {
      const nextError = new Error("Docker container not found.");
      nextError.statusCode = 404;
      throw nextError;
    }

    throw buildDockerUnavailableError(error);
  }
}

module.exports = {
  getDockerContainer,
  getDockerContainerRecentLogs,
  getDockerIntegrationStatus,
  listDockerContainers,
  startDockerContainer,
  stopDockerContainer,
  restartDockerContainer,
  testDockerIntegration
};
