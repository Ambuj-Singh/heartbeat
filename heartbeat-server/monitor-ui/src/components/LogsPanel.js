import { useEffect, useMemo, useRef } from "react";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

function formatText(value = "") {
  return `${value}`
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getKeywordTone(word = "") {
  const upper = word.toUpperCase();

  if (upper === "ALIVE" || upper === "UP" || upper === "RUNNING") {
    return "alive";
  }

  if (upper === "DEAD" || upper === "DOWN" || upper === "FAILED") {
    return "dead";
  }

  if (upper === "UNKNOWN" || upper === "PENDING") {
    return "unknown";
  }

  if (upper === "RESTART" || upper === "RETRY" || upper === "RECOVERY") {
    return "warning";
  }

  return "";
}

function getKeywordIcon(word = "") {
  const upper = word.toUpperCase();

  if (upper === "ALIVE" || upper === "UP" || upper === "RUNNING") {
    return <CheckCircleOutlineOutlinedIcon fontSize="inherit" />;
  }

  if (upper === "DEAD" || upper === "DOWN" || upper === "FAILED") {
    return <ErrorOutlineOutlinedIcon fontSize="inherit" />;
  }

  if (upper === "UNKNOWN" || upper === "PENDING") {
    return <HelpOutlineOutlinedIcon fontSize="inherit" />;
  }

  if (upper === "RESTART" || upper === "RETRY" || upper === "RECOVERY") {
    return <AutorenewOutlinedIcon fontSize="inherit" />;
  }

  return <InfoOutlinedIcon fontSize="inherit" />;
}

function renderMessageWithHighlights(message) {
  const parts = message.split(/(\s+)/);

  return parts.map((part, index) => {
    if (!part.trim()) {
      return part;
    }

    const cleanPart = part.replace(/[^A-Za-z]/g, "");
    const tone = getKeywordTone(cleanPart);

    if (!tone) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span key={`${part}-${index}`} className={`console-keyword ${tone}`}>
        {getKeywordIcon(cleanPart)}
        {part.toUpperCase()}
      </span>
    );
  });
}

function normalizeLog(log, index) {
  const rawTime = log?.time ? new Date(log.time) : null;
  const time = rawTime && !Number.isNaN(rawTime.getTime())
    ? rawTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "--:--:--";

  const message = formatText(log?.message || "Unknown log");
  const text = `${message}`.toUpperCase();
  const status = text.includes("DEAD")
    ? "DEAD"
    : text.includes("UNKNOWN")
      ? "UNKNOWN"
      : text.includes("ALIVE") || text.includes("UP") || text.includes("START")
        ? "ALIVE"
        : "INFO";

  return {
    id: `${log?.time || "t"}-${index}-${message}`,
    time,
    message,
    status
  };
}

function LogsPanel({
  logs = [],
  title = "Console feed",
  subtitle = "Fixed-height event stream with the latest entries at the bottom"
}) {
  const scrollRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const safeLogs = useMemo(() => {
    if (!Array.isArray(logs)) {
      return [];
    }

    return logs.slice(-120).map(normalizeLog);
  }, [logs]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    if (!shouldStickToBottomRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [safeLogs]);

  const handleScroll = () => {
    if (!scrollRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    shouldStickToBottomRef.current = scrollHeight - (scrollTop + clientHeight) < 24;
  };

  return (
    <section className="panel logs-panel">
      <div className="panel-heading">
        <div>
          <h2 className="panel-title panel-title-with-icon">
            <TerminalOutlinedIcon fontSize="small" />
            <span>{title}</span>
          </h2>
          <p className="panel-subtitle">{subtitle}</p>
        </div>
        <div className="panel-badge">{safeLogs.length} lines</div>
      </div>

      {safeLogs.length === 0 ? (
        <div className="empty-state">No logs yet.</div>
      ) : (
        <div className="console-shell">
          <div className="console-scroll" ref={scrollRef} onScroll={handleScroll}>
            {safeLogs.map((log) => (
              <div key={log.id} className="console-line">
                <span className={`console-status ${log.status.toLowerCase()}`}>{log.status}</span>
                <span className="console-time">{log.time}</span>
                <span className="console-message">{renderMessageWithHighlights(log.message)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default LogsPanel;
