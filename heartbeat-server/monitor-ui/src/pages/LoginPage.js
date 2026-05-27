import { useState } from "react";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { Navigate, useLocation } from "react-router-dom";
import { DEMO_MODE } from "../demo/mockApi";

function LoginPage({ auth }) {
  const location = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin12345");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  if (auth.isAuthenticated) {
    const destination = location.state?.from?.pathname || "/overview";
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      await auth.login({ username, password });
    } catch (error) {
      setFormError(error.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card panel">
        <div className="auth-grid">
          <div className="auth-column auth-column-primary">
            <div className="auth-brand">
              <FavoriteBorderOutlinedIcon fontSize="small" />
              <span>Heartbeat Ops</span>
            </div>

            <div className="auth-copy">
              <div className="topbar-eyebrow">Secure access</div>
              <h1 className="auth-title">Sign in to the monitoring console</h1>
              <p className="auth-subtitle">
                Access live infrastructure health, incident workflows, alert history, analytics, and audit trails from one operator workspace.
              </p>
            </div>

            <div className="auth-feature-list">
              <div className="auth-feature">
                <span className="auth-feature-icon"><ShieldOutlinedIcon fontSize="small" /></span>
                <div>
                  <div className="auth-feature-title">Cookie-based session security</div>
                  <div className="auth-feature-copy">
                    Uses httpOnly auth cookies and refresh rotation instead of browser-stored tokens.
                  </div>
                </div>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon"><HubOutlinedIcon fontSize="small" /></span>
                <div>
                  <div className="auth-feature-title">Realtime infrastructure visibility</div>
                  <div className="auth-feature-copy">
                    View Docker-backed node health, incidents, and logs after authentication succeeds.
                  </div>
                </div>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon"><InsightsOutlinedIcon fontSize="small" /></span>
                <div>
                  <div className="auth-feature-title">Analytics and exports</div>
                  <div className="auth-feature-copy">
                    Investigate degradation trends and export incidents or logs for handoff.
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-footnote">
              {DEMO_MODE
                ? "Demo mode is enabled. You can continue with the prefilled credentials."
                : "Default local bootstrap credentials are admin / admin12345 unless you changed backend/.env."}
            </div>
          </div>

          <div className="auth-column auth-column-form">
            <div className="auth-form-shell">
              <div className="auth-form-header">
                <div className="auth-form-title">Operator sign in</div>
                <div className="auth-form-copy">Authenticate to load protected dashboard data.</div>
              </div>

              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="filter-control auth-control">
                  <span>Username</span>
                  <input
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="admin"
                  />
                </label>

                <label className="filter-control auth-control">
                  <span>Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                  />
                </label>

                {formError || auth.error ? (
                  <div className="empty-state empty-state-error">{formError || auth.error}</div>
                ) : null}

                <button
                  type="submit"
                  className="action-button auth-submit"
                  disabled={submitting || auth.loading}
                >
                  {submitting || auth.loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="auth-helper-card">
                <div className="auth-helper-title">Local setup note</div>
                <div className="auth-helper-copy">
                  If local sign-in still fails, open the frontend on `localhost` or `127.0.0.1` and make sure the backend is reachable on port `3002`.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
