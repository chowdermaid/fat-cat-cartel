import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveKeyboundScores } from "../api/keyboundScores";
import type { RankedMember, ScoreSaveResult } from "../types";
import { parseScoreDraft } from "../utils/scores";

export function useScoreEditor(canEdit: boolean, sessionToken: string | null, commit: (result: ScoreSaveResult) => void) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function save(member: RankedMember, draft: string): Promise<boolean> {
    if (!canEdit || !sessionToken) throw new Error("Boss or Underpaw Discord role required.");
    const parsed = parseScoreDraft(draft);
    if (parsed.error) throw new Error(parsed.error);
    if (inFlight.current) return false;
    if (parsed.value === member.bestScore) return true;
    inFlight.current = true;
    setSavingId(member.lodestoneId);
    try {
      const result = await saveKeyboundScores(sessionToken, [{ lodestoneId: member.lodestoneId, bestScore: parsed.value }]);
      if (!mounted.current) return false;
      commit(result);
      toast.success("Keybound Brawler score saved.");
      return true;
    } finally {
      inFlight.current = false;
      if (mounted.current) setSavingId(null);
    }
  }

  return { savingId, save };
}
