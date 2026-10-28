import type { Member } from "@/types";
import type { KeyboundScores, RankedMember, ScoreChange } from "../types";

export function rankMembers(members: Record<string, Member>, scores: Record<string, number>): RankedMember[] {
  const rows = Object.entries(members).map(([lodestoneId, member]) => ({
    ...member, lodestoneId, bestScore: scores[lodestoneId] ?? null, rank: null as number | null,
  })).sort((a, b) => {
    if (a.bestScore === null && b.bestScore !== null) return 1;
    if (b.bestScore === null && a.bestScore !== null) return -1;
    return (b.bestScore ?? 0) - (a.bestScore ?? 0) || a.name.localeCompare(b.name) || a.lodestoneId.localeCompare(b.lodestoneId);
  });
  let rank = 0;
  return rows.map((row, index) => {
    if (row.bestScore === null) return row;
    if (index === 0 || row.bestScore !== rows[index - 1].bestScore) rank = index + 1;
    return { ...row, rank };
  });
}

export function parseScoreDraft(value: string): { value: number | null; error: string | null } {
  if (value === "") return { value: null, error: null };
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    return { value: null, error: "Enter a nonnegative whole number within the safe integer range." };
  }
  return { value: Number(value), error: null };
}

export function applyScoreChanges(saved: KeyboundScores, changes: ScoreChange[], updatedAt: number): KeyboundScores {
  const scores = { ...saved.scores };
  for (const { lodestoneId, bestScore } of changes) {
    if (bestScore === null) delete scores[lodestoneId];
    else scores[lodestoneId] = bestScore;
  }
  return { scores, updatedAt };
}

