import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";

function formatDuration(duration) {
  if (!Number.isFinite(duration) || duration === null) {
    return "In progress";
  }

  const totalSeconds = Math.max(0, Math.floor(duration / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function formatTime(value) {
  if (!value) {
    return "--:--:--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--:--";
  }

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function IncidentTimeline({
  incidents = [],
  title = "Incident timeline",
  subtitle = "Latest active and resolved node failures",
  emptyMessage = "No incidents recorded yet."
}) {
  const safeIncidents = Array.isArray(incidents) ? incidents.slice(0, 20) : [];

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title panel-title-with-icon">
            <TimelineOutlinedIcon fontSize="small" />
            <span>{title}</span>
          </h2>
          <p className="panel-subtitle">{subtitle}</p>
        </div>
        <div className="panel-badge">{safeIncidents.length} items</div>
      </div>

      {safeIncidents.length === 0 ? (
        <div className="empty-state">{emptyMessage}</div>
      ) : (
        <div className="timeline-list">
          {safeIncidents.map((incident, index) => {
            const active = incident?.status === "ACTIVE";

            return (
              <div className="timeline-item" key={`${incident?.node || "node"}-${incident?.failedAt || index}`}>
                <div className={`timeline-marker ${active ? "active" : "resolved"}`}>
                  {active ? (
                    <ReportProblemOutlinedIcon fontSize="inherit" />
                  ) : (
                    <CheckCircleOutlineRoundedIcon fontSize="inherit" />
                  )}
                </div>

                <div className="timeline-body">
                  <div className="timeline-topline">
                    <span className="timeline-node">{incident?.node || "Unknown node"}</span>
                    <span className={`timeline-status ${active ? "active" : "resolved"}`}>
                      {incident?.status || "UNKNOWN"}
                    </span>
                  </div>

                  <div className="timeline-meta">
                    Failed: {formatTime(incident?.failedAt)}
                  </div>

                  <div className="timeline-meta">
                    Recovered: {active ? "Still down" : formatTime(incident?.recoveredAt)}
                  </div>

                  <div className="timeline-meta">
                    Duration: {formatDuration(incident?.duration)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default IncidentTimeline;
