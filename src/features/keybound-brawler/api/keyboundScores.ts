import { db, get, ref, update } from "@/lib/db";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { LOCAL_DEV_ADMIN_SESSION_TOKEN } from "@/features/admin/constants";
import { DEV_AUTH_LAYER_ENABLED, DEV_SESSION_TOKEN, getSelectedDevPersona } from "@/lib/dev/personas";
import { KEYBOUND_SCORES_PATH, KEYBOUND_USE_STUBS } from "../constants";
import type { KeyboundScores, ScoreChange, ScoreSaveResult } from "../types";

let pendingRead: Promise<KeyboundScores> | null = null;

export function fetchKeyboundScores(): Promise<KeyboundScores> {
  if (pendingRead) return pendingRead;
  pendingRead = get(ref(db, KEYBOUND_SCORES_PATH)).then((snapshot: { val(): unknown }) => {
    const data = snapshot.val() as Partial<KeyboundScores> | null;
    if (data === null) return { scores: {}, updatedAt: null };
    if (typeof data !== "object" || Array.isArray(data)) throw new Error("Leaderboard scores are malformed.");
    const scores = data.scores ?? {};
    if (typeof scores !== "object" || Array.isArray(scores) || Object.entries(scores).some(([id, value]) => !/^\d+$/.test(id) || !Number.isSafeInteger(value) || value < 0)) {
      throw new Error("Leaderboard scores are malformed.");
    }
    if (data.updatedAt != null && (!Number.isSafeInteger(data.updatedAt) || data.updatedAt < 0)) throw new Error("Leaderboard update time is malformed.");
    return { scores, updatedAt: data.updatedAt ?? null };
  }).finally(() => { pendingRead = null; });
  return pendingRead!;
}

export async function saveKeyboundScores(sessionToken: string, changes: ScoreChange[]): Promise<ScoreSaveResult> {
  if (!KEYBOUND_USE_STUBS) return callAdminFunction<ScoreSaveResult>("saveKeyboundBrawlerScores", sessionToken, { changes });
  const allowed = DEV_AUTH_LAYER_ENABLED
    ? sessionToken === DEV_SESSION_TOKEN && getSelectedDevPersona().authenticated && getSelectedDevPersona().isAdmin
    : sessionToken === LOCAL_DEV_ADMIN_SESSION_TOKEN;
  if (!allowed) throw new Error("Boss or Underpaw Discord role required.");
  if (!Array.isArray(changes) || changes.length === 0) throw new Error("At least one score change is required.");
  const seen = new Set<string>();
  for (const { lodestoneId, bestScore } of changes) {
    if (typeof lodestoneId !== "string" || !/^\d+$/.test(lodestoneId) || seen.has(lodestoneId)) throw new Error("Each change must have a unique numeric Lodestone ID.");
    if (bestScore !== null && (typeof bestScore !== "number" || !Number.isSafeInteger(bestScore) || bestScore < 0)) throw new Error("Scores must be nonnegative whole numbers or null.");
    seen.add(lodestoneId);
  }
  const members = await Promise.all(changes.map(({ lodestoneId }) => get(ref(db, `members/${lodestoneId}`))));
  if (members.some((member: { exists(): boolean }) => !member.exists())) throw new Error("A changed member is no longer in the roster. Reload the page before editing their score.");
  const updatedAt = Date.now();
  await update(ref(db, KEYBOUND_SCORES_PATH), { ...Object.fromEntries(changes.map((change) => [`scores/${change.lodestoneId}`, change.bestScore])), updatedAt });
  return { ok: true, changes, updatedAt };
}
