import { useEffect, useState } from "react";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MinimizeRoundedIcon from "@mui/icons-material/MinimizeRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import LogsPanel from "./LogsPanel";

function FloatingTerminal({ logs = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const savedOpen = window.localStorage.getItem("heartbeat-terminal-open");
    const savedMinimized = window.localStorage.getItem("heartbeat-terminal-minimized");

    setIsOpen(savedOpen === "true");
    setIsMinimized(savedMinimized === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("heartbeat-terminal-open", String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    window.localStorage.setItem("heartbeat-terminal-minimized", String(isMinimized));
  }, [isMinimized]);

  if (!isOpen) {
    return (
      <button
        type="button"
        className="terminal-fab"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
      >
        <TerminalOutlinedIcon fontSize="small" />
        Web terminal
      </button>
    );
  }

  return (
    <div className={`floating-terminal ${isMinimized ? "minimized" : ""}`}>
      <div className="floating-terminal-header">
        <div className="floating-terminal-title">
          <TerminalOutlinedIcon fontSize="small" />
          <span>Live web terminal</span>
        </div>
        <div className="floating-terminal-actions">
          <button
            type="button"
            className="floating-terminal-icon"
            onClick={() => setIsMinimized((value) => !value)}
            aria-label={isMinimized ? "Expand terminal" : "Minimize terminal"}
          >
            {isMinimized ? <OpenInFullRoundedIcon fontSize="small" /> : <MinimizeRoundedIcon fontSize="small" />}
          </button>
          <button
            type="button"
            className="floating-terminal-icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close terminal"
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </div>
      </div>

      {!isMinimized ? (
        <div className="floating-terminal-body">
          <LogsPanel
            logs={logs}
            title="Live terminal stream"
            subtitle="Realtime console lines from the active dashboard session"
          />
        </div>
      ) : null}
    </div>
  );
}

export default FloatingTerminal;
