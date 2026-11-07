import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { GIL_RUSH_PATH, GIL_RUSH_PRIVATE_PATH, GilRushError, lockMinorityAssignments, minorityChestCount, nextGilRushEvent, nextMinorityAssignments, publishTreasureAssignments, readGilRushEvent, readMinorityAssignments, requireMinorityGame } from "./cartel-gil-rush-model";
import type { MinorityAssignments } from "./cartel-gil-rush-model";

export function waitForGilRushEvent(afterRevision: unknown, waitMs = 20_000) {
  if (afterRevision !== null && (!Number.isSafeInteger(afterRevision) || Number(afterRevision) < 0)) throw new HttpsError("invalid-argument", "Invalid event revision.");
  const ref = admin.database().ref(GIL_RUSH_PATH);
  return new Promise<ReturnType<typeof readGilRushEvent> | null>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, event: ReturnType<typeof readGilRushEvent> | null = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ref.off("value", receive);
      if (error) reject(error); else resolve(event);
    };
    const receive = (snapshot: admin.database.DataSnapshot) => {
      try {
        const event = readGilRushEvent(snapshot.val());
        if (afterRevision === null || event.revision !== afterRevision) finish(undefined, event);
      } catch (error) { finish(error instanceof Error ? error : new Error("Invalid shared event.")); }
    };
    const timer = setTimeout(() => finish(), waitMs);
    ref.on("value", receive, error => finish(error));
  });
}

async function transact(ref: admin.database.Reference, transform: (value: unknown) => unknown) {
  const warmCache = () => {};
  try {
    ref.on("value", warmCache);
    await ref.once("value");
    const result = await ref.transaction(transform);
    if (!result.committed) throw new HttpsError("aborted", "Event update was not committed.");
    return result.snapshot;
  } finally { ref.off("value", warmCache); }
}

export async function mutateGilRushEvent(data: unknown) {
  const request = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const action = request.action && typeof request.action === "object" ? request.action as Record<string, unknown> : {};
  const eventRef = admin.database().ref(GIL_RUSH_PATH);
  const privateRef = admin.database().ref(GIL_RUSH_PRIVATE_PATH);
  try {
    if (["load-minority-assignments", "save-minority-assignments"].includes(String(action.type))) {
      const event = readGilRushEvent((await eventRef.once("value")).val());
      const game = requireMinorityGame(event, action.gameId);
      const saved = action.type === "load-minority-assignments" ? await privateRef.once("value") : await transact(privateRef, value => nextMinorityAssignments(value, event, action, request.expectedRevision));
      const assignments = readMinorityAssignments(saved.val(), event, game.id);
      if (game.kind === "minority" && assignments && (game.treasureAssignments?.revision ?? 0) < assignments.revision) await transact(eventRef, value => publishTreasureAssignments(value, assignments));
      return { ok: true, assignments };
    }
    let minority: MinorityAssignments | undefined;
    if (action.type === "reveal-minority-chest") {
      const event = readGilRushEvent((await eventRef.once("value")).val());
      const game = requireMinorityGame(event, action.gameId);
      if (request.expectedRevision !== event.revision) throw new GilRushError("Event changed on another host. Review latest values and retry.", "aborted");
      const count = minorityChestCount(game.kind);
      if (!Number.isSafeInteger(action.chest) || Number(action.chest) < 1 || Number(action.chest) > count) throw new GilRushError(`Choose one of ${count === 3 ? "three" : "four"} chests.`);
      if (game.chestReveals.some(row => row.chest === action.chest)) throw new GilRushError("This chest reveal is no longer available.");
      const saved = await transact(privateRef, value => lockMinorityAssignments(value, event, game.id));
      minority = readMinorityAssignments(saved.val(), event, game.id)!;
    }
    let endedMinorityId: number | null = null;
    const snapshot = await transact(eventRef, value => {
      const before = readGilRushEvent(value);
      if (action.type === "end-minigame" && (before.minigame?.kind === "minority" || before.minigame?.kind === "minority-draw")) endedMinorityId = before.minigame.id;
      return nextGilRushEvent(value, action, request.expectedRevision, Math.random, minority);
    });
    if (action.type === "reset" || endedMinorityId !== null) {
      try {
        await transact(privateRef, value => {
          const saved = value as { gameId?: number } | null;
          return saved && (action.type === "reset" ? Number(saved.gameId) <= snapshot.val().revision : saved.gameId === endedMinorityId) ? null : value;
        });
      } catch { console.warn("Could not clear Gil Rush private assignments."); }
    }
    return { ok: true, event: snapshot.val() };
  } catch (error) {
    if (error instanceof GilRushError) throw new HttpsError(error.code, error.message);
    throw error;
  }
}
