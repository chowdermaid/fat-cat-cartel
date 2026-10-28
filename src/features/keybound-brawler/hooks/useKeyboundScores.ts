import { useEffect, useState } from "react";
import { fetchKeyboundScores } from "../api/keyboundScores";
import type { KeyboundScores, ScoreSaveResult } from "../types";
import { applyScoreChanges } from "../utils/scores";

export function useKeyboundScores() {
  const [data, setData] = useState<KeyboundScores>({ scores: {}, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchKeyboundScores().then((scores) => {
      if (active) setData(scores);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load leaderboard scores.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  function commit(result: ScoreSaveResult) {
    setData((current) => applyScoreChanges(current, result.changes, result.updatedAt));
  }

  function retry() {
    setLoading(true);
    setError(null);
    setAttempt((current) => current + 1);
  }

  return { data, loading, error, retry, commit };
}
