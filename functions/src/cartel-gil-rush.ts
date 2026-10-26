import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { GIL_RUSH_PATH, GilRushError, nextGilRushEvent } from "./cartel-gil-rush-model";

export async function mutateGilRushEvent(data: unknown) {
  const request = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const eventRef = admin.database().ref(GIL_RUSH_PATH);
  const warmCache = () => {};
  try {
    // Keep the cache warm: cold RTDB transactions initially see null even for existing events.
    eventRef.on("value", warmCache);
    await eventRef.once("value");
    const result = await eventRef.transaction(current =>
      nextGilRushEvent(current, request.action, request.expectedRevision),
    );
    if (!result.committed) throw new HttpsError("aborted", "Event update was not committed.");
    return { ok: true, event: result.snapshot.val() };
  } catch (error) {
    if (error instanceof GilRushError) throw new HttpsError(error.code, error.message);
    throw error;
  } finally {
    eventRef.off("value", warmCache);
  }
}
