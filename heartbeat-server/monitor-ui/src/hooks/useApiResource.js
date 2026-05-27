import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, buildQuery } from "../api/client";

export function useApiResource(
  path,
  params,
  { enabled = true, initialData = null, pollIntervalMs = 0, refreshKey = "" } = {}
) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const dataRef = useRef(initialData);
  const serializedParams = useMemo(() => JSON.stringify(params || {}), [params]);
  const stableParams = useMemo(() => JSON.parse(serializedParams), [serializedParams]);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    setLoading(dataRef.current === null || dataRef.current === undefined);
    setError("");

    apiRequest(`${path}${buildQuery(stableParams)}`)
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError.message || "Unable to load data.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, path, requestVersion, serializedParams, stableParams, refreshKey]);

  useEffect(() => {
    if (!enabled || !pollIntervalMs || pollIntervalMs < 1000) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRequestVersion((value) => value + 1);
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs]);

  const refetch = () => {
    setRequestVersion((value) => value + 1);
  };

  return { data, loading, error, setData, refetch };
}
