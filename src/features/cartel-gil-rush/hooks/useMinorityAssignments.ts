import { useEffect, useRef, useState } from "react";
import { loadMinorityAssignments, saveMinorityAssignments } from "../api/sharedEvent";
import type { MinorityAssignments } from "../../../../functions/src/cartel-gil-rush-model";

export function useMinorityAssignments(token: string | null, gameId: number, enabled: boolean) {
  const [saved, setSaved] = useState<MinorityAssignments | null>(null);
  const [loading, setLoading] = useState(enabled && !!token);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);

  async function reload() {
    if (!enabled || !token) return false;
    const active = generation.current;
    setLoading(true);
    setError(null);
    try {
      const assignments = await loadMinorityAssignments(token, gameId);
      if (active !== generation.current) return false;
      setSaved(assignments);
      return true;
    } catch (cause) {
      if (active === generation.current) setError(cause instanceof Error ? cause.message : "Could not load assignments.");
      return false;
    } finally { if (active === generation.current) setLoading(false); }
  }

  useEffect(() => {
    const active = ++generation.current;
    if (enabled && token) {
      loadMinorityAssignments(token, gameId).then(assignments => {
        if (active === generation.current) { setSaved(assignments); setLoading(false); }
      }, cause => {
        if (active === generation.current) { setError(cause instanceof Error ? cause.message : "Could not load assignments."); setLoading(false); }
      });
    }
    return () => { generation.current = active + 1; };
  }, [token, gameId, enabled]);

  async function save(choices: { id: string; chest: number }[], revision: number) {
    if (!enabled || !token || busy.current || loading) return false;
    const active = generation.current;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const assignments = await saveMinorityAssignments(token, gameId, choices, revision);
      if (active !== generation.current) return false;
      setSaved(assignments);
      return true;
    } catch (cause) {
      if (active === generation.current) setError(cause instanceof Error ? cause.message : "Could not save assignments. Your draft is retained.");
      return false;
    } finally {
      if (active === generation.current) { busy.current = false; setPending(false); }
    }
  }
  return { saved, loading, pending, error, reload, save };
}
