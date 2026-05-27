import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AlertPanel from "./AlertPanel";
import FloatingTerminal from "./FloatingTerminal";

function Layout({ dashboard, auth }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const savedValue = window.localStorage.getItem("heartbeat-sidebar-expanded");
    if (savedValue !== null) {
      setSidebarExpanded(savedValue === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("heartbeat-sidebar-expanded", String(sidebarExpanded));
  }, [sidebarExpanded]);

  return (
    <div className={`app-shell dashboard-layout ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}>
      <AlertPanel alerts={dashboard.dashboard.alerts} onDismiss={dashboard.dismissAlert} />
      <FloatingTerminal logs={dashboard.dashboard.logs} />
      <Sidebar
        auth={auth}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((value) => !value)}
      />

      <div className="layout-main">
        {dashboard.isDemoMode ? (
          <div className="demo-banner">
            Demo mode is active. Live sockets and protected API calls are replaced with local mock data.
          </div>
        ) : null}
        <Topbar dashboard={dashboard} auth={auth} />
        <main className="page-content">
          <Outlet context={{ dashboard, auth }} />
        </main>
      </div>
    </div>
  );
}

export default Layout;
