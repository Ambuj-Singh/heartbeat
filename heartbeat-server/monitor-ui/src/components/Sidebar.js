import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PsychologyAltOutlinedIcon from "@mui/icons-material/PsychologyAltOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import AdbOutlinedIcon from "@mui/icons-material/AdbOutlined";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", icon: <DashboardOutlinedIcon fontSize="small" /> },
  { to: "/nodes", label: "Nodes", icon: <DnsOutlinedIcon fontSize="small" /> },
  { to: "/incidents", label: "Incidents", icon: <ReportProblemOutlinedIcon fontSize="small" /> },
  { to: "/alerts", label: "Alerts", icon: <NotificationsActiveOutlinedIcon fontSize="small" /> },
  { to: "/docker", label: "Docker", icon: <AdbOutlinedIcon fontSize="small" /> },
  { to: "/logs", label: "Logs", icon: <TerminalOutlinedIcon fontSize="small" /> },
  { to: "/analytics", label: "Analytics", icon: <InsightsOutlinedIcon fontSize="small" /> },
  { to: "/ai", label: "AI Ops", icon: <PsychologyAltOutlinedIcon fontSize="small" /> },
  { to: "/audit", label: "Audit", icon: <FactCheckOutlinedIcon fontSize="small" /> }
];

function Sidebar({ auth, expanded = true, onToggle }) {
  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-copy">
          <FavoriteBorderOutlinedIcon fontSize="small" />
          {expanded ? <span>Heartbeat Ops</span> : null}
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={expanded ? "Collapse menu" : "Expand menu"}
          title={expanded ? "Collapse menu" : "Expand menu"}
        >
          {expanded ? <MenuOpenRoundedIcon fontSize="small" /> : <MenuRoundedIcon fontSize="small" />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            {item.icon}
            {expanded ? <span>{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      {auth?.user ? (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            {expanded ? (
              <>
                <div className="sidebar-user-name">{auth.user.username}</div>
                <div className="sidebar-user-role">{auth.user.role}</div>
              </>
            ) : (
              <div className="sidebar-user-role">{auth.user.role.slice(0, 1)}</div>
            )}
          </div>
          <button type="button" className="action-button secondary sidebar-logout" onClick={auth.logout}>
            {expanded ? "Sign out" : "Out"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default Sidebar;
