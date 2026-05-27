export const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === "true";

const TAGS = {
  cluster: "demo-cluster",
  service: "heartbeat",
  region: "ap-south-1",
  environment: "demo"
};

function iso(offsetMs = 0) {
  return new Date(Date.now() - offsetMs).toISOString();
}

function buildNodes(step = 0) {
  return {
    "api-gateway": { status: "ALIVE", retries: 0, ...TAGS, service: "gateway" },
    "worker-1": { status: "ALIVE", retries: 1 + (step % 2), ...TAGS, service: "worker" },
    "worker-2": {
      status: step % 4 === 1 ? "DEAD" : "ALIVE",
      retries: step % 4 === 1 ? 5 : 2,
      ...TAGS,
      service: "worker"
    },
    "db-primary": {
      status: step % 6 === 2 ? "UNKNOWN" : "ALIVE",
      retries: step % 6 === 2 ? 2 : 0,
      ...TAGS,
      service: "database"
    },
    "cache-edge": {
      status: step % 5 === 3 ? "DEAD" : "ALIVE",
      retries: step % 5 === 3 ? 4 : 1,
      ...TAGS,
      service: "cache"
    }
  };
}

function buildHistory(step = 0, count = 120) {
  return Array.from({ length: count }, (_, index) => {
    const sample = buildNodes(Math.max(0, step - (count - index - 1)));
    const values = Object.values(sample);
    const timestamp = Date.now() - (count - index - 1) * 1000;

    return {
      timestamp,
      time: new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      alive: values.filter((item) => item.status === "ALIVE").length,
      dead: values.filter((item) => item.status === "DEAD").length,
      unknown: values.filter((item) => item.status === "UNKNOWN").length
    };
  });
}

function buildIncidents(step = 0) {
  const workerActive = buildNodes(step)["worker-2"]?.status === "DEAD";

  return [
    {
      _id: "demo-incident-worker-2",
      node: "worker-2",
      status: workerActive ? "ACTIVE" : "RESOLVED",
      failedAt: iso(140000),
      recoveredAt: workerActive ? null : iso(70000),
      duration: workerActive ? null : 70000,
      acknowledged: true,
      acknowledgedBy: "demo-operator",
      acknowledgedAt: iso(120000),
      notes: "Demo incident for export and workflow walkthroughs.",
      ...TAGS,
      service: "worker"
    },
    {
      _id: "demo-incident-cache-edge",
      node: "cache-edge",
      status: "RESOLVED",
      failedAt: iso(420000),
      recoveredAt: iso(360000),
      duration: 60000,
      acknowledged: true,
      acknowledgedBy: "demo-admin",
      acknowledgedAt: iso(390000),
      notes: "Simulated packet-loss recovery.",
      ...TAGS,
      service: "cache"
    }
  ];
}

function buildAlerts(step = 0) {
  const workerDown = buildNodes(step)["worker-2"]?.status === "DEAD";

  return [
    ...(workerDown
      ? [{
          _id: `demo-alert-worker-2-${step}`,
          id: `demo-alert-worker-2-${step}`,
          type: "CRITICAL",
          severity: "CRITICAL",
          message: "worker-2 failed health checks in demo mode.",
          node: "worker-2",
          createdAt: iso(10000),
          ...TAGS
        }]
      : []),
    {
      _id: `demo-alert-info-${step}`,
      id: `demo-alert-info-${step}`,
      type: "RECOVERY",
      severity: "LOW",
      message: "api-gateway completed a synthetic recovery drill.",
      node: "api-gateway",
      createdAt: iso(25000),
      ...TAGS
    }
  ];
}

function buildLogs(step = 0) {
  return [
    { _id: "log-1", level: "INFO", message: "ALIVE api-gateway accepted synthetic traffic.", timestamp: iso(2000), node: "api-gateway", ...TAGS, service: "gateway" },
    { _id: "log-2", level: "WARN", message: "RETRY worker-2 exceeded retry budget during demo.", timestamp: iso(6000), node: "worker-2", ...TAGS, service: "worker" },
    { _id: "log-3", level: "ERROR", message: "DEAD worker-2 failed probe and opened an incident.", timestamp: iso(12000), node: "worker-2", ...TAGS, service: "worker" },
    { _id: "log-4", level: "INFO", message: "RECOVERY api-gateway completed restart cleanly.", timestamp: iso(18000), node: "api-gateway", ...TAGS, service: "gateway" },
    { _id: "log-5", level: "WARN", message: "UNKNOWN db-primary is waiting for replication quorum.", timestamp: iso(25000), node: "db-primary", ...TAGS, service: "database" },
    {
      _id: `log-live-${step}`,
      level: buildNodes(step)["worker-2"]?.status === "DEAD" ? "ERROR" : "INFO",
      message:
        buildNodes(step)["worker-2"]?.status === "DEAD"
          ? "DEAD worker-2 remains unavailable while demo incident is active."
          : "ALIVE worker-2 recovered and resumed throughput.",
      timestamp: iso(0),
      node: "worker-2",
      ...TAGS,
      service: "worker"
    }
  ];
}

function buildAuditLogs() {
  return [
    { _id: "audit-1", actor: "demo-admin", actorRole: "ADMIN", action: "ALERT_ACKNOWLEDGED", resourceType: "ALERT", timestamp: iso(40000) },
    { _id: "audit-2", actor: "demo-operator", actorRole: "OPERATOR", action: "INCIDENT_RESOLVED", resourceType: "INCIDENT", timestamp: iso(75000) },
    { _id: "audit-3", actor: "system", actorRole: "ADMIN", action: "OUTBOUND_NOTIFICATION_SENT", resourceType: "INTEGRATION", timestamp: iso(120000) }
  ];
}

function buildDockerContainers() {
  const overrides = JSON.parse(window.localStorage.getItem("demo-docker-overrides") || "{}");
  const getOverride = (id, fallback) => ({ ...fallback, ...(overrides[id] || {}) });

  return [
    getOverride("docker-api-gateway", {
      id: "docker-api-gateway",
      shortId: "docker-api-g",
      name: "api-gateway",
      image: "heartbeat/api:latest",
      state: "running",
      health: "healthy",
      statusText: "Up 12 minutes",
      createdAt: iso(900000),
      startedAt: iso(720000),
      restartCount: 0,
      ports: [{ containerPort: "3000/tcp", bindings: [{ hostIp: "0.0.0.0", hostPort: "3000" }] }],
      labels: { "com.docker.compose.service": "api-gateway" },
      source: "docker"
    }),
    getOverride("docker-worker-2", {
      id: "docker-worker-2",
      shortId: "docker-work",
      name: "worker-2",
      image: "heartbeat/worker:latest",
      state: "restarting",
      health: "unhealthy",
      statusText: "Restarting (1) 5 seconds ago",
      createdAt: iso(1100000),
      startedAt: iso(45000),
      restartCount: 4,
      ports: [],
      labels: { "com.docker.compose.service": "worker" },
      source: "docker"
    }),
    getOverride("docker-postgres", {
      id: "docker-postgres",
      shortId: "docker-post",
      name: "postgres",
      image: "postgres:18",
      state: "running",
      health: "healthy",
      statusText: "Up 18 minutes (healthy)",
      createdAt: iso(1400000),
      startedAt: iso(1320000),
      restartCount: 0,
      ports: [{ containerPort: "5432/tcp", bindings: [{ hostIp: "0.0.0.0", hostPort: "5432" }] }],
      labels: { "com.docker.compose.service": "postgres" },
      source: "docker"
    })
  ];
}

function filterDockerContainers(params) {
  const state = params.get("state");
  const search = (params.get("search") || "").toLowerCase();

  return buildDockerContainers().filter((container) => {
    const matchesState = !state || state === "all" || container.state === state;
    const matchesSearch =
      !search ||
      container.name.toLowerCase().includes(search) ||
      container.image.toLowerCase().includes(search);

    return matchesState && matchesSearch;
  });
}

function buildDockerLogs(containerId) {
  return [
    { id: `${containerId}-1`, message: "2026-04-08T10:00:00Z container boot sequence started", source: "docker" },
    { id: `${containerId}-2`, message: "2026-04-08T10:00:04Z health probe registered", source: "docker" },
    { id: `${containerId}-3`, message: "2026-04-08T10:00:08Z serving requests", source: "docker" }
  ];
}

function paginate(items, page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);
  const start = (safePage - 1) * safeLimit;

  return {
    total: items.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(items.length / safeLimit)),
    data: items.slice(start, start + safeLimit)
  };
}

function matchTag(item, key, value) {
  return !value || String(item?.[key] || "").toLowerCase().includes(String(value).toLowerCase());
}

function filterLogs(params) {
  return buildLogs().filter((item) => {
    const level = params.get("level");
    const search = params.get("search");

    if (level && item.level !== level) {
      return false;
    }
    if (search && !item.message.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return ["cluster", "service", "region", "environment", "node"].every((key) =>
      matchTag(item, key, params.get(key))
    );
  });
}

function filterIncidents(params) {
  return buildIncidents().filter((item) => {
    const status = params.get("status");

    if (status && status !== "ALL" && item.status !== status) {
      return false;
    }

    return ["cluster", "service", "region", "environment", "node"].every((key) =>
      matchTag(item, key, params.get(key))
    );
  });
}

function filterAlerts(params) {
  return buildAlerts().filter((item) => {
    const severity = params.get("severity");
    const type = params.get("type");
    const status = params.get("status");

    if (severity && item.severity !== severity) {
      return false;
    }
    if (type && type !== "ALL" && item.type !== type) {
      return false;
    }
    if (status === "OPEN" && (item.acknowledged || item.resolved)) {
      return false;
    }
    if (status === "ACKNOWLEDGED" && !item.acknowledged) {
      return false;
    }
    if (status === "RESOLVED" && !item.resolved) {
      return false;
    }

    return true;
  });
}

function filterAuditLogs(params) {
  return buildAuditLogs().filter((item) => {
    const actor = params.get("actor");
    const action = params.get("action");

    return matchTag(item, "actor", actor) && matchTag(item, "action", action);
  });
}

function rangeMs(range = "1m") {
  return { "1m": 60000, "5m": 300000, "15m": 900000, "1h": 3600000, "24h": 86400000 }[range] || 60000;
}

function metrics(range = "1m") {
  const cutoff = Date.now() - rangeMs(range);
  return buildHistory(24, 180)
    .filter((item) => item.timestamp >= cutoff)
    .map((item) => ({
      timestamp: new Date(item.timestamp).toISOString(),
      alive: item.alive,
      dead: item.dead,
      unknown: item.unknown
    }));
}

function analytics(range = "1m") {
  const points = metrics(range);
  const incidents = buildIncidents();
  const resolved = incidents.filter((item) => Number.isFinite(item.duration));
  return {
    range,
    failureRate: points.length ? Math.round((points.filter((item) => item.dead > 0).length / points.length) * 100) : 0,
    avgRecoveryTime: resolved.length ? Math.round(resolved.reduce((sum, item) => sum + item.duration, 0) / resolved.length) : 0,
    totalIncidents: incidents.length,
    activeIncidents: incidents.filter((item) => item.status === "ACTIVE").length,
    retryTrend: 6,
    healthTrend: points.map((item) => ({ timestamp: item.timestamp, value: Math.max(0, 100 - item.dead * 30 - item.unknown * 10) }))
  };
}

export function getDemoDashboardSnapshot(step = 0) {
  const dashboard = {
    nodes: buildNodes(step),
    logs: buildLogs(step).reverse(),
    history: buildHistory(step, 120),
    incidents: buildIncidents(step),
    alerts: buildAlerts(step)
  };

  return {
    dashboard,
    ai:
      dashboard.alerts.some((item) => item.type === "CRITICAL")
        ? "Demo mode detected a critical node failure. Review worker capacity and the export workflow."
        : "Demo mode is stable. Explore filters, exports, and the alert center safely.",
    analyticsSummary: analytics("1m"),
    lastUpdated: new Date().toISOString()
  };
}

function toCsv(rows = []) {
  const keys = Object.keys(rows[0] || {});
  return [keys.join(","), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n");
}

export function getDemoResponse(path) {
  const url = new URL(path, "http://demo.local");
  const params = url.searchParams;

  if (url.pathname === "/metrics") return Promise.resolve({ count: metrics(params.get("range") || "1m").length, data: metrics(params.get("range") || "1m") });
  if (url.pathname === "/analytics/summary") return Promise.resolve(analytics(params.get("range") || "1m"));
  if (url.pathname === "/logs") return Promise.resolve(paginate(filterLogs(params), params.get("page") || 1, params.get("limit") || 40));
  if (url.pathname === "/incidents") {
    const data = filterIncidents(params);
    return Promise.resolve({ count: data.length, data });
  }
  if (url.pathname === "/alerts") return Promise.resolve(paginate(filterAlerts(params), params.get("page") || 1, params.get("limit") || 10));
  if (url.pathname === "/audit-logs") return Promise.resolve(paginate(filterAuditLogs(params), params.get("page") || 1, params.get("limit") || 12));
  if (url.pathname === "/system") return Promise.resolve({ uptime: 86400, memory: { rss: 92000000, heapTotal: 50000000, heapUsed: 28000000, external: 2000000 }, database: { healthy: true, readyState: 1 }, sockets: { activeConnections: 4 }, environment: "demo", version: "1.0.0-demo", timestamp: new Date().toISOString() });
  if (url.pathname === "/integrations/status") return Promise.resolve({ enabled: true, slack: { configured: true }, webhook: { configured: false } });
  if (url.pathname === "/integrations/test") return Promise.resolve({ status: { enabled: true, slack: { configured: true }, webhook: { configured: false } }, results: [{ target: "slack", ok: true, skipped: false }, { target: "webhook", ok: false, skipped: true, reason: "not_configured" }] });
  if (url.pathname === "/integrations/docker/status") {
    return Promise.resolve({
      connected: true,
      daemonReachable: true,
      dockerVersion: "27.0-demo",
      engineOperatingSystem: "Docker Desktop",
      containers: buildDockerContainers().length,
      lastCheckedAt: new Date().toISOString()
    });
  }
  if (url.pathname === "/integrations/docker/containers") {
    const data = filterDockerContainers(params);
    return Promise.resolve({ count: data.length, data });
  }
  const dockerDetailMatch = url.pathname.match(/^\/integrations\/docker\/containers\/([^/]+)$/);
  if (dockerDetailMatch) {
    return Promise.resolve(
      buildDockerContainers().find((container) => container.id === dockerDetailMatch[1]) || null
    );
  }
  const dockerLogsMatch = url.pathname.match(/^\/integrations\/docker\/containers\/([^/]+)\/logs$/);
  if (dockerLogsMatch) {
    return Promise.resolve({ count: 3, data: buildDockerLogs(dockerLogsMatch[1]) });
  }
  const dockerRestartMatch = url.pathname.match(/^\/integrations\/docker\/containers\/([^/]+)\/restart$/);
  if (dockerRestartMatch) {
    const overrides = JSON.parse(window.localStorage.getItem("demo-docker-overrides") || "{}");
    overrides[dockerRestartMatch[1]] = {
      state: "running",
      health: "healthy",
      statusText: "Up 25 seconds",
      startedAt: iso(25000)
    };
    window.localStorage.setItem("demo-docker-overrides", JSON.stringify(overrides));
    const container = buildDockerContainers().find((item) => item.id === dockerRestartMatch[1]) || null;
    return Promise.resolve({
      ok: true,
      message: `Restart requested for ${container?.name || "container"}.`,
      data: container
    });
  }
  const dockerStartMatch = url.pathname.match(/^\/integrations\/docker\/containers\/([^/]+)\/start$/);
  if (dockerStartMatch) {
    const overrides = JSON.parse(window.localStorage.getItem("demo-docker-overrides") || "{}");
    overrides[dockerStartMatch[1]] = {
      state: "running",
      health: "healthy",
      statusText: "Up 12 seconds",
      startedAt: iso(12000)
    };
    window.localStorage.setItem("demo-docker-overrides", JSON.stringify(overrides));
    const container = buildDockerContainers().find((item) => item.id === dockerStartMatch[1]) || null;
    return Promise.resolve({
      ok: true,
      message: `${container?.name || "Container"} started.`,
      data: container
    });
  }
  const dockerStopMatch = url.pathname.match(/^\/integrations\/docker\/containers\/([^/]+)\/stop$/);
  if (dockerStopMatch) {
    const overrides = JSON.parse(window.localStorage.getItem("demo-docker-overrides") || "{}");
    overrides[dockerStopMatch[1]] = {
      state: "exited",
      health: null,
      statusText: "Exited (0) 3 seconds ago"
    };
    window.localStorage.setItem("demo-docker-overrides", JSON.stringify(overrides));
    const container = buildDockerContainers().find((item) => item.id === dockerStopMatch[1]) || null;
    return Promise.resolve({
      ok: true,
      message: `${container?.name || "Container"} stopped.`,
      data: container
    });
  }
  if (url.pathname === "/integrations/docker/test") {
    return Promise.resolve({
      status: {
        connected: true,
        daemonReachable: true,
        dockerVersion: "27.0-demo",
        engineOperatingSystem: "Docker Desktop",
        containers: buildDockerContainers().length,
        lastCheckedAt: new Date().toISOString()
      },
      sampleCount: buildDockerContainers().length
    });
  }

  return Promise.resolve({});
}

export async function getDemoExport(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      search.set(key, String(value));
    }
  });

  const payload = await getDemoResponse(`${path}${search.toString() ? `?${search.toString()}` : ""}`);
  const rows = payload?.data || [];
  const format = params.format === "csv" ? "csv" : "json";

  return {
    blob: new Blob(
      [format === "csv" ? toCsv(rows) : JSON.stringify(payload, null, 2)],
      { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }
    ),
    extension: format
  };
}
