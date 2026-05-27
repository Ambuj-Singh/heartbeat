import PsychologyAltOutlinedIcon from "@mui/icons-material/PsychologyAltOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";

function formatText(value = "") {
  return `${value}`
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\r/g, "")
    .trim();
}

function getRiskLevel(deadCount, retryCount, pendingCount) {
  if (deadCount > 0) {
    return "HIGH";
  }

  if (retryCount > 3 || pendingCount > 0) {
    return "MEDIUM";
  }

  return "LOW";
}

export default function AiPanel({ ai = "", nodes = {}, unknownCount = 0, incidents = [] }) {
  const safeNodes = nodes || {};

  const dead = Object.keys(safeNodes).filter((node) => safeNodes[node]?.status === "DEAD");
  const retries = Object.values(safeNodes).reduce((sum, node) => sum + (node?.retries || 0), 0);
  const stable = dead.length === 0 && unknownCount === 0;
  const riskLevel = getRiskLevel(dead.length, retries, unknownCount);
  const riskClass = riskLevel.toLowerCase();

  const recommendations = stable
    ? [
        "No recovery action needed right now.",
        "Keep watching trend lines for sudden drops in alive nodes.",
        "Retry counters are a good early warning even before a node goes down."
      ]
    : [
        dead.length > 0
          ? `Prioritize restart validation for ${dead.join(", ")}.`
          : "Investigate pending nodes before they degrade further.",
        retries > 0
          ? `Recovery automation has already used ${retries} retry attempts.`
          : "No retry pressure yet, so this is a good time to intervene cleanly.",
        "Watch the next few polling intervals to confirm the cluster returns to a steady alive state."
      ];

  const formattedAi = formatText(ai);
  const aiLines = formattedAi
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const insightSummary =
    aiLines[0] ||
    (stable
      ? "All monitored nodes are healthy, retries are under control, and the platform is currently operating without visible incidents."
      : dead.length > 0
        ? `Dead nodes detected: ${dead.join(", ")}. The cluster needs attention before the failure spreads or retry limits are exhausted.`
        : "Some nodes are still warming up. Monitor upcoming snapshots to confirm they settle into a healthy state.");
  const aiDetailLines = aiLines.slice(1);

  return (
    <section className="panel insight-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title panel-title-with-icon">
            <PsychologyAltOutlinedIcon fontSize="small" />
            <span>AI insight</span>
          </h2>
          <p className="panel-subtitle">Operator-focused summary generated from the current node state</p>
        </div>
      </div>

      <div className={`insight-state ${stable ? "stable" : "warning"}`}>
        {stable ? <ShieldOutlinedIcon fontSize="inherit" /> : <ReportProblemOutlinedIcon fontSize="inherit" />}
        {stable ? "Stable posture" : "Operator review recommended"}
      </div>

      <p className="insight-copy">
        {insightSummary}
      </p>

      <div className="insight-list">
        {aiDetailLines.map((line, index) => (
          <div className="insight-item" key={`ai-line-${index}`}>
            {line}
          </div>
        ))}
        {recommendations.map((item, index) => (
          <div className="insight-item" key={index}>
            {item}
          </div>
        ))}
        {incidents.length > 0 ? (
          <div className="insight-item">
            <span className="insight-inline-icon">
              <TimelineOutlinedIcon fontSize="inherit" />
            </span>
            Latest incident: {incidents[incidents.length - 1]?.node || "Unknown node"} at{" "}
            {incidents[incidents.length - 1]?.failedAt
              ? new Date(incidents[incidents.length - 1].failedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                })
              : "unknown time"}
          </div>
        ) : null}
      </div>

      <div className={`insight-risk risk-${riskClass}`}>
        <span className="insight-risk-label">Risk Level</span>
        <span className="insight-risk-value">
          {riskLevel === "HIGH" ? <ReportProblemOutlinedIcon fontSize="inherit" /> : <ShieldOutlinedIcon fontSize="inherit" />}
          {riskLevel}
        </span>
      </div>
    </section>
  );
}
