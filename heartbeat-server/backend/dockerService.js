const Docker = require("dockerode");
const logger = require("./server/services/logger");

const docker = new Docker();

function sanitizeLabels(labels = {}) {
  return Object.entries(labels || {}).reduce((accumulator, [key, value]) => {
    const safeKey = String(key || "");

    if (!safeKey || /secret|token|password|key/i.test(safeKey)) {
      return accumulator;
    }

    accumulator[safeKey] = String(value || "");
    return accumulator;
  }, {});
}

function mapPorts(ports = []) {
  return (ports || []).map((port) => ({
    privatePort: port.PrivatePort || null,
    publicPort: port.PublicPort || null,
    type: port.Type || "tcp",
    ip: port.IP || null
  }));
}

function mapInspectPorts(ports = {}) {
  return Object.entries(ports || {}).map(([containerPort, bindings]) => ({
    containerPort,
    bindings: (bindings || []).map((binding) => ({
      hostIp: binding.HostIp || null,
      hostPort: binding.HostPort || null
    }))
  }));
}

function normalizeContainerState(inspect = {}) {
  const state = inspect?.State || {};
  const healthStatus = state?.Health?.Status || null;
  const status = String(state?.Status || inspect?.status || "unknown").toLowerCase();

  if (healthStatus === "unhealthy") {
    return "unhealthy";
  }

  if (["running", "exited", "restarting", "paused", "dead", "created"].includes(status)) {
    return status;
  }

  return "unknown";
}

function buildStatusText(inspect = {}) {
  return (
    inspect?.State?.Status ||
    inspect?.Status ||
    inspect?.statusText ||
    inspect?.status ||
    "unknown"
  );
}

function mapContainer(summary = {}, inspect = {}) {
  const containerState = normalizeContainerState(inspect);
  const startedAt = inspect?.State?.StartedAt || null;
  const createdAt = inspect?.Created || summary?.Created || null;
  const names = summary?.Names || [];

  return {
    id: summary?.Id || inspect?.Id || null,
    shortId: (summary?.Id || inspect?.Id || "").slice(0, 12),
    name: names[0] ? names[0].replace(/^\//, "") : inspect?.Name?.replace(/^\//, "") || "unknown",
    image: summary?.Image || inspect?.Config?.Image || "unknown",
    state: containerState,
    health: inspect?.State?.Health?.Status || null,
    statusText: buildStatusText(summary?.Status ? { statusText: summary.Status } : inspect),
    createdAt,
    startedAt,
    restartCount: inspect?.RestartCount ?? null,
    ports: summary?.Ports ? mapPorts(summary.Ports) : mapInspectPorts(inspect?.NetworkSettings?.Ports),
    labels: sanitizeLabels(summary?.Labels || inspect?.Config?.Labels || {}),
    source: "docker"
  };
}

async function pingDocker() {
  return docker.ping();
}

async function getDockerVersion() {
  return docker.version();
}

async function getDockerInfo() {
  return docker.info();
}

async function listContainers(filters = {}) {
  const summaries = await docker.listContainers({ all: true });
  const search = String(filters?.search || "").trim().toLowerCase();
  const requestedState = String(filters?.state || "all").toLowerCase();
  const containers = await Promise.all(
    summaries.map(async (summary) => {
      try {
        const inspect = await docker.getContainer(summary.Id).inspect();
        return mapContainer(summary, inspect);
      } catch (error) {
        logger.warn({ err: error, containerId: summary.Id }, "Failed to inspect Docker container");
        return mapContainer(summary, {});
      }
    })
  );

  return containers.filter((container) => {
    const matchesSearch =
      !search ||
      container.name.toLowerCase().includes(search) ||
      container.image.toLowerCase().includes(search);
    const matchesState = requestedState === "all" || container.state === requestedState;

    return matchesSearch && matchesState;
  });
}

async function getContainerDetails(containerId) {
  const container = docker.getContainer(containerId);
  const inspect = await container.inspect();

  return {
    ...mapContainer(
      {
        Id: inspect?.Id,
        Names: [inspect?.Name],
        Image: inspect?.Config?.Image,
        Status: inspect?.State?.Status,
        Labels: inspect?.Config?.Labels,
        Ports: []
      },
      inspect
    ),
    command: inspect?.Config?.Cmd || [],
    entrypoint: inspect?.Config?.Entrypoint || [],
    mounts: (inspect?.Mounts || []).map((mount) => ({
      type: mount.Type || null,
      source: mount.Source || null,
      destination: mount.Destination || null,
      mode: mount.Mode || null,
      readOnly: Boolean(mount.RW === false)
    })),
    networks: Object.entries(inspect?.NetworkSettings?.Networks || {}).map(([name, network]) => ({
      name,
      ipAddress: network?.IPAddress || null,
      gateway: network?.Gateway || null
    }))
  };
}

async function getContainerLogs(containerId, options = {}) {
  const tail = Math.max(1, Math.min(500, Number(options?.tail) || 200));
  const container = docker.getContainer(containerId);
  const stream = await container.logs({
    stdout: true,
    stderr: true,
    tail,
    timestamps: true
  });

  return stream
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `${containerId}-${index}`,
      message: line,
      source: "docker"
    }));
}

async function startContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.start();
  return getContainerDetails(containerId);
}

async function stopContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.stop();
  return getContainerDetails(containerId);
}

async function restartContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.restart();
  return getContainerDetails(containerId);
}

module.exports = {
  getContainerDetails,
  getContainerLogs,
  getDockerInfo,
  getDockerVersion,
  listContainers,
  mapContainer,
  normalizeContainerState,
  pingDocker,
  startContainer,
  stopContainer,
  restartContainer
};
