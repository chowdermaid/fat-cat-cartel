import { useCallback, useEffect, useState } from "react";
import type { CraftingRequestDashboardData } from "../types";
import { EMPTY_DASHBOARD_DATA, readCraftingRequestDashboard } from "../api/craftingRequests";

export type CraftingRequestsState = {
  data: CraftingRequestDashboardData;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  reload: () => Promise<void>;
};

export function useCraftingRequests(): CraftingRequestsState {
  const [data, setData] =
    useState<CraftingRequestDashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await readCraftingRequestDashboard());
    } catch {
      setError("Crafting requests could not be loaded.");
      setData(EMPTY_DASHBOARD_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
    isEmpty:
      !loading &&
      !error &&
      data.open.length === 0 &&
      data.inProgress.length === 0 &&
      data.completed.length === 0,
  };
}
