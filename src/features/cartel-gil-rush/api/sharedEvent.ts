import { db, ref, onValue } from "@/lib/db";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { GIL_RUSH_PATH, readGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import type { MinorityAssignments } from "../../../../functions/src/cartel-gil-rush-model";
import type { SharedEvent, SharedEventAction } from "../types";
import { loadStubMinority, mutateStubEvent, saveStubMinority, subscribeStubEvent } from "./sharedEventStub";

const callableName = "mutateCartelGilRushEventAsia";
const callableOptions = { region: "asia-southeast1" };

const useStub = import.meta.env.VITE_USE_STUBS === "true" || DEV_AUTH_LAYER_ENABLED;

export async function loadMinorityAssignments(token: string, gameId: number): Promise<MinorityAssignments | null> {
  if (useStub) return loadStubMinority(token, gameId);
  return (await callAdminFunction<{ assignments: MinorityAssignments | null }>(callableName, token, { action: { type: "load-minority-assignments", gameId } }, callableOptions)).assignments;
}

export async function saveMinorityAssignments(token: string, gameId: number, choices: { id: string; chest: number }[], revision: number): Promise<MinorityAssignments> {
  if (useStub) return saveStubMinority(token, gameId, choices, revision);
  return (await callAdminFunction<{ assignments: MinorityAssignments }>(callableName, token, { action: { type: "save-minority-assignments", gameId, choices }, expectedRevision: revision }, callableOptions)).assignments;
}

export function subscribeSharedEvent(receive: (event: SharedEvent) => void, fail: (error: Error) => void): () => void {
  if (useStub) return subscribeStubEvent(receive, fail);
  return onValue(ref(db, GIL_RUSH_PATH), (snapshot: { val: () => unknown }) => {
    try { receive(readGilRushEvent(snapshot.val())); }
    catch (error) { fail(error instanceof Error ? error : new Error("Shared event is invalid.")); }
  }, fail);
}

export async function mutateSharedEvent(token: string, action: SharedEventAction, expectedRevision: number): Promise<SharedEvent> {
  if (useStub) return mutateStubEvent(token, action, expectedRevision);
  const result = await callAdminFunction<{ ok: true; event: unknown }>(callableName, token, { action, expectedRevision }, callableOptions);
  return readGilRushEvent(result.event);
}
