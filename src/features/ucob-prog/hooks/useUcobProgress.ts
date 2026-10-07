import { useCallback, useEffect, useRef, useState } from "react";
import { fetchUcobProgress } from "../api/ucobProgressFetchers";
import type { UcobProgressData } from "../types";

export function useUcobProgress() {
  const [data, setData] = useState<UcobProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requests = useRef({ id: 0 });
  const reload = useCallback(async () => {
    const current = requests.current;
    const id = ++current.id;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUcobProgress();
      if (id === current.id) setData(result);
    } catch (err) {
      if (id === current.id) setError(err instanceof Error ? err.message : "Failed to load UCOB progress.");
      throw err;
    } finally {
      if (id === current.id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const current = requests.current;
    const id = ++current.id;
    fetchUcobProgress().then((result) => {
      if (id === current.id) setData(result);
    }).catch((err: unknown) => {
      if (id === current.id) setError(err instanceof Error ? err.message : "Failed to load UCOB progress.");
    }).finally(() => {
      if (id === current.id) setLoading(false);
    });
    return () => { current.id++; };
  }, []);

  return { data, loading, error, reload };
}
