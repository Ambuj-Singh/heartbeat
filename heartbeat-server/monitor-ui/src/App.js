import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import NodesPage from "./pages/NodesPage";
import IncidentsPage from "./pages/IncidentsPage";
import LogsPage from "./pages/LogsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AiPage from "./pages/AiPage";
import AlertsPage from "./pages/AlertsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import LoginPage from "./pages/LoginPage";
import DockerPage from "./pages/DockerPage";
import { useDashboard } from "./hooks/useDashboard";
import { useAuthSession } from "./hooks/useAuthSession";
import { LoadingState } from "./components/AsyncState";
import "./App.css";

function ProtectedApp({ auth }) {
  const dashboard = useDashboard();
  const location = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Layout dashboard={dashboard} auth={auth} />;
}

function App() {
  const auth = useAuthSession();

  if (auth.loading && !auth.isAuthenticated) {
    return (
      <div className="auth-shell">
        <section className="auth-card panel">
          <LoadingState message="Checking your session..." />
        </section>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage auth={auth} />} />
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route element={<ProtectedApp auth={auth} />}>
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/docker" element={<DockerPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/audit" element={<AuditLogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
