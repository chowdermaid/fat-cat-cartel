import { useCallback, useEffect, useState } from "react";
import { fetchDmuProgress } from "../api/dmuProgressFetchers";
import type { DmuProgressData } from "../types";

interface DmuProgressState {
  data: DmuProgressData | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useDmuProgress(): DmuProgressState {
  const [data, setData] = useState<DmuProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDmuProgress());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DMU progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDmuProgress()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load DMU progress.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, reload };
}
