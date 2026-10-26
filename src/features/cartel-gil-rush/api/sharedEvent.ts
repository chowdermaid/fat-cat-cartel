import { db, ref, onValue } from "@/lib/db";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { GIL_RUSH_PATH, readGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import type { SharedEvent, SharedEventAction } from "../types";
import { mutateStubEvent, subscribeStubEvent } from "./sharedEventStub";

const useStub = import.meta.env.VITE_USE_STUBS === "true" || DEV_AUTH_LAYER_ENABLED;

export function subscribeSharedEvent(receive: (event: SharedEvent) => void, fail: (error: Error) => void): () => void {
  if (useStub) return subscribeStubEvent(receive, fail);
  return onValue(ref(db, GIL_RUSH_PATH), (snapshot: { val: () => unknown }) => {
    try { receive(readGilRushEvent(snapshot.val())); }
    catch (error) { fail(error instanceof Error ? error : new Error("Shared event is invalid.")); }
  }, fail);
}

export async function mutateSharedEvent(token: string, action: SharedEventAction, expectedRevision: number): Promise<SharedEvent> {
  if (useStub) return mutateStubEvent(token, action, expectedRevision);
  const result = await callAdminFunction<{ ok: true; event: unknown }>("mutateCartelGilRushEvent", token, { action, expectedRevision });
  return readGilRushEvent(result.event);
}
