import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { DEMO_MODE } from "../demo/mockApi";

const DEMO_USER = {
  id: "demo-user",
  username: "demo-admin",
  role: "ADMIN"
};

export function useAuthSession() {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async () => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setLoading(false);
      setError("");
      return DEMO_USER;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/auth/me");
      setUser(payload?.user || null);
      return payload?.user || null;
    } catch (nextError) {
      setUser(null);
      setError(nextError.message || "Authentication required.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/auth/login", {
        method: "POST",
        body: credentials
      });

      setUser(payload?.user || null);
      return payload?.user || null;
    } catch (nextError) {
      setUser(null);
      setError(nextError.message || "Unable to sign in.");
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      return;
    }

    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (_error) {
      // Clearing UI session locally is enough if the server session is already gone.
    } finally {
      setUser(null);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: DEMO_MODE || Boolean(user),
    login,
    logout,
    refreshSession
  };
}
