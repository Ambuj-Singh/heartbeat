import { DEMO_MODE, getDemoExport, getDemoResponse } from "../demo/mockApi";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:3002/api`;
let refreshPromise = null;

export function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "ALL") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function rawRequest(path, { method = "GET", body, headers = {} } = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
}

async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = rawRequest("/auth/refresh", { method: "POST" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Session refresh failed.");
        }

        return response.json().catch(() => ({}));
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  if (DEMO_MODE) {
    return getDemoResponse(path, options);
  }

  const response = await rawRequest(path, options);

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
    try {
      await refreshAuthSession();
      const retryResponse = await rawRequest(path, options);
      const retryPayload = await retryResponse.json().catch(() => ({}));

      if (!retryResponse.ok) {
        const retryError = new Error(retryPayload?.message || "Request failed.");
        retryError.status = retryResponse.status;
        retryError.details = retryPayload?.details || [];
        throw retryError;
      }

      return retryPayload;
    } catch (refreshError) {
      const authError = new Error("Authentication required.");
      authError.status = 401;
      throw authError;
    }
  }

  if (!response.ok) {
    const error = new Error(payload?.message || "Request failed.");
    error.status = response.status;
    error.details = payload?.details || [];
    throw error;
  }

  return payload;
}

export async function downloadExport(path, params = {}, filenamePrefix = "export") {
  if (DEMO_MODE) {
    const demoFile = await getDemoExport(path, params);
    const url = window.URL.createObjectURL(demoFile.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenamePrefix}.${demoFile.extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return;
  }

  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Export failed.");
  }

  const format = params.format === "csv" ? "csv" : "json";
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
