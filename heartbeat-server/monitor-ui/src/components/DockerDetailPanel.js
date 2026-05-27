import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import { EmptyState, ErrorState, LoadingState } from "./AsyncState";

function formatDateTime(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleString();
}

function renderPorts(ports = []) {
  if (!Array.isArray(ports) || ports.length === 0) {
    return "No published ports";
  }

  return ports
    .map((port) => {
      if (port.containerPort) {
        const bindings = (port.bindings || [])
          .map((binding) => `${binding.hostIp || "0.0.0.0"}:${binding.hostPort || "-"}`)
          .join(", ");
        return `${port.containerPort}${bindings ? ` -> ${bindings}` : ""}`;
      }

      return `${port.ip || "0.0.0.0"}:${port.publicPort || "-"} -> ${port.privatePort || "-"} (${port.type || "tcp"})`;
    })
    .join(" | ");
}

function canStartContainer(state = "") {
  return ["exited", "dead", "created"].includes(state);
}

function canStopContainer(state = "") {
  return ["running", "restarting", "unhealthy", "paused"].includes(state);
}

function DockerDetailPanel({
  container,
  logs,
  loading,
  error,
  logsLoading,
  logsError,
  canManage = false,
  pendingAction = "",
  actionError = "",
  onStart,
  onStop,
  onRestart
}) {
  if (loading) {
    return <LoadingState message="Loading Docker container details..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!container) {
    return <EmptyState message="Select a Docker container to inspect details." />;
  }

  const labels = Object.entries(container.labels || {});
  const showStart = canStartContainer(container.state);
  const showStop = canStopContainer(container.state);
  const actionTitle =
    pendingAction === "start"
      ? "Start sequence"
      : pendingAction === "stop"
        ? "Shutdown sequence"
        : pendingAction === "restart"
          ? "Reboot sequence"
          : "";

  return (
    <section className="panel detail-panel docker-detail-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title">{container.name}</h2>
          <p className="panel-subtitle">{container.image}</p>
        </div>
        <div className="docker-badge-row">
          <span className={`status-chip docker-state ${container.state}`}>{container.state}</span>
          <span className="panel-badge">Docker</span>
        </div>
      </div>

      {canManage ? (
        <div className="docker-action-row">
          <div className="docker-action-buttons">
            {showStart ? (
              <button
                type="button"
                className="action-button"
                onClick={() => onStart?.(container)}
                disabled={pendingAction === "start"}
              >
                <PlayArrowRoundedIcon fontSize="small" />
                {pendingAction === "start" ? "Starting..." : "Start"}
              </button>
            ) : null}
            {showStop ? (
              <button
                type="button"
                className="action-button secondary"
                onClick={() => onStop?.(container)}
                disabled={pendingAction === "stop"}
              >
                <StopRoundedIcon fontSize="small" />
                {pendingAction === "stop" ? "Stopping..." : "Stop"}
              </button>
            ) : null}
            <button
              type="button"
              className="action-button secondary"
              onClick={() => onRestart?.(container)}
              disabled={pendingAction === "restart"}
            >
              <RestartAltRoundedIcon fontSize="small" />
              {pendingAction === "restart" ? "Restarting..." : "Restart"}
            </button>
            <button
              type="button"
              className="action-button secondary"
              onClick={() =>
                document.getElementById(`docker-logs-${container.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start"
                })
              }
            >
              <TerminalRoundedIcon fontSize="small" />
              Logs
            </button>
          </div>
          <div className="docker-action-copy">
            Operator controls for Docker-specific actions. The generic node and realtime socket pipeline remain unchanged.
          </div>
          {pendingAction ? (
            <div className="docker-inline-progress">
              <div className="docker-inline-progress-copy">{actionTitle} in progress</div>
              <div className="docker-inline-progress-bar" aria-hidden="true">
                <span />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {actionError ? <ErrorState message={actionError} /> : null}

      <div className="docker-detail-grid">
        <div className="compact-item">
          <div className="compact-item-title">Health</div>
          <div className="compact-item-copy">{container.health || "Not reported"}</div>
        </div>
        <div className="compact-item">
          <div className="compact-item-title">Restart count</div>
          <div className="compact-item-copy">{container.restartCount ?? "Unavailable"}</div>
        </div>
        <div className="compact-item">
          <div className="compact-item-title">Created</div>
          <div className="compact-item-copy">{formatDateTime(container.createdAt)}</div>
        </div>
        <div className="compact-item">
          <div className="compact-item-title">Started</div>
          <div className="compact-item-copy">{formatDateTime(container.startedAt)}</div>
        </div>
        <div className="compact-item docker-detail-wide">
          <div className="compact-item-title">Ports</div>
          <div className="compact-item-copy">{renderPorts(container.ports)}</div>
        </div>
        <div className="compact-item docker-detail-wide">
          <div className="compact-item-title">Source</div>
          <div className="compact-item-copy">{container.source}</div>
        </div>
        {labels.length > 0 ? (
          <div className="compact-item docker-detail-wide">
            <div className="compact-item-title">Labels</div>
            <div className="docker-label-list">
              {labels.map(([key, value]) => (
                <div key={`${key}-${value}`} className="docker-label-chip">
                  <span className="docker-label-key">{key}</span>
                  <span className="docker-label-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <section className="docker-logs-panel" id={`docker-logs-${container.id}`}>
        <div className="panel-heading">
          <div>
            <h3 className="panel-title">Recent logs</h3>
            <p className="panel-subtitle">Latest Docker stdout and stderr lines</p>
          </div>
        </div>

        {logsLoading ? <LoadingState message="Loading container logs..." /> : null}
        {logsError ? <ErrorState message={logsError} /> : null}
        {!logsLoading && !logsError && (!logs || logs.length === 0) ? (
          <EmptyState message="No recent logs are available for this container." />
        ) : null}
        {!logsLoading && !logsError && logs?.length > 0 ? (
          <div className="console-shell">
            <div className="console-scroll">
              {logs.map((entry) => (
                <div className="console-line" key={entry.id}>
                  <span className="console-status info">LOG</span>
                  <span className="console-time">docker</span>
                  <span className="console-message">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

export default DockerDetailPanel;
