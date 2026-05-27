import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import DockerDetailPanel from "../components/DockerDetailPanel";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useApiResource } from "../hooks/useApiResource";
import { useQueryState } from "../hooks/useQueryState";
import { apiRequest } from "../api/client";

function DockerPage() {
  const outletContext = useOutletContext();
  const auth = outletContext?.auth;
  const [stateFilter, setStateFilter] = useQueryState("state", "all");
  const [search, setSearch] = useQueryState("search", "");
  const [selectedId, setSelectedId] = useQueryState("container", "");
  const [testing, setTesting] = useState(false);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(false);
  const [pendingAction, setPendingAction] = useState({ id: "", type: "" });
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const {
    data: status,
    loading: statusLoading,
    error: statusError,
    setData: setStatus,
    refetch: refetchStatus
  } = useApiResource("/integrations/docker/status", {}, { initialData: null, pollIntervalMs: 8000 });
  const {
    data: containersPayload,
    loading,
    error,
    refetch: refetchContainers
  } = useApiResource(
    "/integrations/docker/containers",
    {
      state: stateFilter,
      search
    },
    { initialData: { count: 0, data: [] }, pollIntervalMs: 5000 }
  );

  const containers = useMemo(() => containersPayload?.data || [], [containersPayload]);

  useEffect(() => {
    if (!containers.length) {
      if (selectedId) {
        setSelectedId("");
      }
      return;
    }

    const selectedExists = containers.some((container) => container.id === selectedId);
    if (!selectedId || !selectedExists) {
      setSelectedId(containers[0].id);
    }
  }, [containers, selectedId, setSelectedId]);

  const {
    data: selectedContainer,
    loading: detailLoading,
    error: detailError,
    refetch: refetchDetails
  } = useApiResource(
    selectedId ? `/integrations/docker/containers/${selectedId}` : "/integrations/docker/containers/placeholder",
    {},
    { enabled: Boolean(selectedId), initialData: null, pollIntervalMs: 5000 }
  );
  const {
    data: logsPayload,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs
  } = useApiResource(
    selectedId ? `/integrations/docker/containers/${selectedId}/logs` : "/integrations/docker/containers/placeholder/logs",
    { tail: 60 },
    { enabled: Boolean(selectedId), initialData: { data: [] }, pollIntervalMs: 5000 }
  );

  const unhealthyCount = useMemo(
    () => containers.filter((container) => ["unhealthy", "restarting"].includes(container.state)).length,
    [containers]
  );
  const manageable = auth?.user && auth.user.role !== "VIEWER";
  const failingContainers = useMemo(
    () => containers.filter((container) => ["exited", "dead", "restarting", "unhealthy"].includes(container.state)),
    [containers]
  );
  const pendingContainer = useMemo(
    () => containers.find((container) => container.id === pendingAction.id) || null,
    [containers, pendingAction.id]
  );
  const actionLabel = useMemo(() => {
    if (pendingAction.type === "start") {
      return "starting";
    }

    if (pendingAction.type === "stop") {
      return "stopping";
    }

    if (pendingAction.type === "restart") {
      return "restarting";
    }

    return "";
  }, [pendingAction.type]);

  useEffect(() => {
    const savedValue = window.localStorage.getItem("docker-auto-restart");
    setAutoRestartEnabled(savedValue === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("docker-auto-restart", String(autoRestartEnabled));
  }, [autoRestartEnabled]);

  const runDockerTest = async () => {
    setTesting(true);
    setActionError("");
    setActionMessage("");

    try {
      const result = await apiRequest("/integrations/docker/test", { method: "POST" });
      setStatus(result?.status || null);
      setActionMessage("Docker integration test completed.");
    } catch (nextError) {
      setActionError(nextError.message || "Docker test failed.");
    } finally {
      setTesting(false);
    }
  };

  const refreshDockerData = useCallback(() => {
    refetchStatus();
    refetchContainers();
    refetchDetails();
    refetchLogs();
  }, [refetchContainers, refetchDetails, refetchLogs, refetchStatus]);

  const runContainerAction = useCallback(async (container, action) => {
    if (!container?.id) {
      return;
    }

    setPendingAction({ id: container.id, type: action });
    setActionError("");
    setActionMessage("");

    try {
      const result = await apiRequest(`/integrations/docker/containers/${container.id}/${action}`, {
        method: "POST"
      });
      setActionMessage(result?.message || `${container.name} ${action} requested.`);
      refreshDockerData();
    } catch (nextError) {
      setActionError(nextError.message || `Unable to ${action} the selected container.`);
    } finally {
      setPendingAction({ id: "", type: "" });
    }
  }, [refreshDockerData]);

  const restartContainer = useCallback((container) => runContainerAction(container, "restart"), [runContainerAction]);
  const startContainer = useCallback((container) => runContainerAction(container, "start"), [runContainerAction]);
  const stopContainer = useCallback((container) => runContainerAction(container, "stop"), [runContainerAction]);

  useEffect(() => {
    if (!manageable || !autoRestartEnabled || failingContainers.length === 0 || pendingAction.id) {
      return undefined;
    }

    const restartKey = "docker-auto-restart-cooldowns";
    const cooldowns = JSON.parse(window.sessionStorage.getItem(restartKey) || "{}");
    const now = Date.now();
    const eligibleContainer = failingContainers.find((container) => {
      const lastRestartAt = Number(cooldowns[container.id] || 0);
      return now - lastRestartAt > 60000;
    });

    if (!eligibleContainer) {
      return undefined;
    }

    cooldowns[eligibleContainer.id] = now;
    window.sessionStorage.setItem(restartKey, JSON.stringify(cooldowns));
    restartContainer(eligibleContainer);

    return undefined;
  }, [autoRestartEnabled, failingContainers, manageable, pendingAction.id, restartContainer]);

  return (
    <div className="page-grid docker-page">
      <FilterBar
        title="Docker integration"
        subtitle="Inspect Docker containers as a dedicated integration without changing the generic monitoring model"
        badge={`${containers.length} containers`}
      >
        <label className="filter-control">
          <span>State</span>
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="exited">Exited</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="restarting">Restarting</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="filter-control filter-control-wide">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Container name or image..." />
        </label>
        {manageable ? (
          <>
            <label className="docker-toggle">
              <input
                type="checkbox"
                checked={autoRestartEnabled}
                onChange={(event) => setAutoRestartEnabled(event.target.checked)}
              />
              <span>Auto-restart failing containers</span>
            </label>
            <button
              type="button"
              className="action-button secondary filter-reset-button"
              onClick={runDockerTest}
              disabled={testing}
            >
              {testing ? "Testing..." : "Run Docker test"}
            </button>
            <button
              type="button"
              className="action-button secondary filter-reset-button"
              onClick={() => restartContainer(failingContainers[0])}
              disabled={!failingContainers.length || Boolean(pendingAction.id)}
            >
              {pendingAction.type === "restart" ? "Restarting..." : "Restart failing"}
            </button>
          </>
        ) : null}
      </FilterBar>

      <section className="panel docker-arcade-banner">
        <div className="docker-arcade-copy">
          <div className="docker-arcade-kicker">Retro Control Deck</div>
          <h2 className="docker-arcade-title">Galaga Grid // Container Command</h2>
          <p className="docker-arcade-subtitle">
            Scan the fleet, trigger recovery actions, and monitor Docker events from a pixel-arcade command surface.
          </p>
        </div>
        <div className="docker-arcade-sprites" aria-hidden="true">
          <div className="pixel-sprite pixel-sprite-left" />
          <div className="pixel-sprite pixel-sprite-center" />
          <div className="pixel-sprite pixel-sprite-right" />
        </div>
      </section>

      {pendingAction.id ? (
        <section className="panel docker-progress-panel">
          <div className="docker-progress-title">
            {actionLabel.toUpperCase()} {pendingContainer?.name || "CONTAINER"}
          </div>
          <div className="docker-progress-subtitle">
            Docker command dispatched. Waiting for the runtime state to settle and refresh.
          </div>
          <div className="docker-progress-bar" aria-hidden="true">
            <span />
          </div>
        </section>
      ) : null}

      {actionMessage ? (
        <div className="panel docker-status-banner docker-status-banner-success">{actionMessage}</div>
      ) : null}
      {actionError ? (
        <div className="panel docker-status-banner docker-status-banner-error">{actionError}</div>
      ) : null}

      <section className="summary-grid">
        <div className="panel summary-card">
          <div className="summary-label">Integration status</div>
          <div className="summary-value">{status?.connected ? "Online" : "Offline"}</div>
          <div className="summary-helper">
            {statusError || (status?.dockerVersion ? `Docker ${status.dockerVersion}` : "Daemon availability pending")}
          </div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Running</div>
          <div className="summary-value">
            {containers.filter((container) => container.state === "running").length}
          </div>
          <div className="summary-helper">Containers currently serving traffic</div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Unhealthy</div>
          <div className="summary-value">{unhealthyCount}</div>
          <div className="summary-helper">Containers needing immediate operator attention</div>
        </div>
        <div className="panel summary-card">
          <div className="summary-label">Source</div>
          <div className="summary-value">Docker</div>
          <div className="summary-helper">Dedicated integration separate from generic node hydration</div>
        </div>
      </section>

      <section className="page-grid page-grid-overview">
        <div className="primary-column">
          <section className="panel detail-panel">
            <div className="panel-heading">
              <div>
                <h2 className="panel-title">Container inventory</h2>
                <p className="panel-subtitle">Search and filter Docker containers independently of the core nodes page</p>
              </div>
              <div className="panel-badge">
                {statusLoading ? "Checking..." : status?.connected ? "Daemon reachable" : "Daemon unavailable"}
              </div>
            </div>

            {loading ? <LoadingState message="Loading Docker containers..." /> : null}
            {error ? <ErrorState message={error} /> : null}
            {!loading && !error && containers.length === 0 ? (
              <EmptyState message="No Docker containers match the current filters." />
            ) : null}
            {!loading && !error && containers.length > 0 ? (
              <div className="docker-table">
                {containers.map((container) => (
                  <article
                    key={container.id}
                    className={`docker-row ${selectedId === container.id ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      className="docker-row-select"
                      onClick={() => setSelectedId(container.id)}
                    >
                      <div className="docker-row-main">
                        <div className="docker-row-title">{container.name}</div>
                        <div className="docker-row-meta">
                          {container.image}
                          {container.statusText ? ` • ${container.statusText}` : ""}
                        </div>
                      </div>
                      <div className="docker-row-side">
                        <span className={`status-chip docker-state ${container.state}`}>{container.state}</span>
                        <span className="docker-source-badge">Docker</span>
                      </div>
                    </button>
                    <div className="docker-row-actions">
                      {manageable && ["exited", "dead", "created"].includes(container.state) ? (
                        <button
                          type="button"
                          className="action-button"
                          onClick={() => startContainer(container)}
                          disabled={pendingAction.id === container.id && pendingAction.type === "start"}
                        >
                          <PlayArrowRoundedIcon fontSize="small" />
                          Start
                        </button>
                      ) : null}
                      {manageable && ["running", "restarting", "unhealthy", "paused"].includes(container.state) ? (
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => stopContainer(container)}
                          disabled={pendingAction.id === container.id && pendingAction.type === "stop"}
                        >
                          <StopRoundedIcon fontSize="small" />
                          Stop
                        </button>
                      ) : null}
                      {manageable ? (
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => restartContainer(container)}
                          disabled={pendingAction.id === container.id && pendingAction.type === "restart"}
                        >
                          <RestartAltRoundedIcon fontSize="small" />
                          Restart
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="action-button secondary"
                        onClick={() => setSelectedId(container.id)}
                      >
                        <TerminalRoundedIcon fontSize="small" />
                        Logs
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className="side-column">
          <DockerDetailPanel
            container={selectedContainer}
            logs={logsPayload?.data || []}
            loading={detailLoading}
            error={detailError}
            logsLoading={logsLoading}
            logsError={logsError}
            canManage={manageable}
            pendingAction={
              pendingAction.id === selectedContainer?.id ? pendingAction.type : ""
            }
            actionError={pendingAction.id === selectedContainer?.id ? "" : actionError}
            onStart={startContainer}
            onStop={stopContainer}
            onRestart={restartContainer}
          />
        </div>
      </section>
    </div>
  );
}

export default DockerPage;
