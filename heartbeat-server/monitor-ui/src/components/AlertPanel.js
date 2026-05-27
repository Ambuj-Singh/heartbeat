import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

function getAlertAppearance(type = "WARNING") {
  if (type === "CRITICAL") {
    return {
      icon: <ReportProblemOutlinedIcon fontSize="inherit" />,
      color: "#ff6b7d",
      background: "rgba(53, 12, 20, 0.94)",
      border: "rgba(255, 107, 125, 0.35)"
    };
  }

  if (type === "RECOVERY") {
    return {
      icon: <CheckCircleOutlineRoundedIcon fontSize="inherit" />,
      color: "#39d98a",
      background: "rgba(8, 34, 24, 0.94)",
      border: "rgba(57, 217, 138, 0.35)"
    };
  }

  return {
    icon: <WarningAmberRoundedIcon fontSize="inherit" />,
    color: "#ffb85c",
    background: "rgba(48, 28, 8, 0.94)",
    border: "rgba(255, 184, 92, 0.35)"
  };
}

function AlertPanel({ alerts = [], onDismiss }) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1200,
        display: "grid",
        gap: 12,
        width: "min(360px, calc(100vw - 32px))"
      }}
    >
      {alerts.map((alert) => {
        const appearance = getAlertAppearance(alert?.type);

        return (
          <div
            key={alert?.id}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "start",
              padding: "14px 16px",
              borderRadius: 18,
              border: `1px solid ${appearance.border}`,
              background: appearance.background,
              color: "#f5f7fb",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
              backdropFilter: "blur(14px)",
              animation: "alertFadeIn 180ms ease-out"
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.06)",
                color: appearance.color,
                fontSize: "1.05rem"
              }}
            >
              {appearance.icon}
            </div>

            <div>
              <div
                style={{
                  color: appearance.color,
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase"
                }}
              >
                {alert?.type || "WARNING"}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: "0.95rem",
                  lineHeight: 1.5
                }}
              >
                {alert?.message || "Alert"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#9db1c9",
                  fontSize: "0.8rem"
                }}
              >
                {alert?.time
                  ? new Date(alert.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })
                  : "--:--:--"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss?.(alert?.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                border: 0,
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.05)",
                color: "#c9d7e7",
                cursor: "pointer"
              }}
              aria-label="Dismiss alert"
            >
              <CloseRoundedIcon fontSize="small" />
            </button>
          </div>
        );
      })}

      <style>
        {`
          @keyframes alertFadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

export default AlertPanel;
