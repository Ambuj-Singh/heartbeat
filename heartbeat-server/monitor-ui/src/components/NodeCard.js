export default function NodeCard({ node, data = {} }) {
  const statusClass =
    data?.status === "ALIVE" ? "alive" : data?.status === "DEAD" ? "dead" : "unknown";
  const retryTone =
    (data?.retries || 0) > 0 ? `${data.retries} restart attempts used` : "No recovery attempts";

  return (
    <article className={`panel node-card status-${statusClass}`}>
      <div className="node-card-header">
        <h3 className="node-title">{node}</h3>
        <span className={`status-pill ${statusClass}`}>{data?.status || "UNKNOWN"}</span>
      </div>

      <div className="node-metrics">
        <div className="metric-box">
          <span className="metric-label">Retries</span>
          <div className="metric-value">{data?.retries ?? 0}</div>
        </div>
        <div className="metric-box">
          <span className="metric-label">State</span>
          <div className="metric-value">{data?.status || "UNKNOWN"}</div>
        </div>
      </div>

      <p className="node-footnote">{retryTone}</p>
    </article>
  );
}
