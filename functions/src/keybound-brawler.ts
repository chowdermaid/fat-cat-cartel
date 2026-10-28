import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

interface ScoreChange {
  lodestoneId: string;
  bestScore: number | null;
}

export function parseKeyboundScoreChanges(data: unknown): ScoreChange[] {
  const changes = (data as { changes?: unknown } | null)?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new HttpsError("invalid-argument", "At least one score change is required.");
  }
  const seen = new Set<string>();
  return changes.map((change: unknown) => {
    const { lodestoneId, bestScore } = (change ?? {}) as Partial<ScoreChange>;
    if (typeof lodestoneId !== "string" || !/^\d+$/.test(lodestoneId) || seen.has(lodestoneId)) {
      throw new HttpsError("invalid-argument", "Each change must have a unique numeric Lodestone ID.");
    }
    if (bestScore !== null && (typeof bestScore !== "number" || !Number.isSafeInteger(bestScore) || bestScore < 0)) {
      throw new HttpsError("invalid-argument", "Scores must be nonnegative whole numbers or null.");
    }
    seen.add(lodestoneId);
    return { lodestoneId, bestScore };
  });
}

export async function saveKeyboundScores(data: unknown) {
  const changes = parseKeyboundScoreChanges(data);
  const database = admin.database();
  const members = await Promise.all(changes.map(({ lodestoneId }) => database.ref(`members/${lodestoneId}`).get()));
  if (members.some((member) => !member.exists())) {
    throw new HttpsError("failed-precondition", "A changed member is no longer in the roster. Reload the page before editing their score.");
  }
  const updatedAt = Date.now();
  const updates: Record<string, number | null> = { updatedAt };
  for (const { lodestoneId, bestScore } of changes) updates[`scores/${lodestoneId}`] = bestScore;
  await database.ref("keyboundBrawler").update(updates);
  return { ok: true as const, changes, updatedAt };
}
