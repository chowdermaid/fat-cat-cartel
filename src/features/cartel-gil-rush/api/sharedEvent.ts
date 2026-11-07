import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { readGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
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

export function subscribeSharedEvent(token: string | null, receive: (event: SharedEvent) => void, fail: (error: Error) => void): () => void {
  if (!token) { queueMicrotask(() => fail(new Error("Sign in to view this internal event."))); return () => {}; }
  if (useStub) return subscribeStubEvent(receive, fail);
  let active = true;
  let revision: number | null = null;
  let resume: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = (delay: number) => new Promise<void>(resolve => { resume = resolve; timer = setTimeout(() => { resume = undefined; timer = undefined; resolve(); }, delay); });
  const visible = () => typeof document === "undefined" || !document.hidden;
  const onVisibility = () => {
    if (visible() && resume) { clearTimeout(timer); timer = undefined; const resolve = resume; resume = undefined; resolve(); }
  };
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  async function listen() {
    while (active) {
      if (!visible()) { await new Promise<void>(resolve => { resume = resolve; }); continue; }
      try {
        const result = await callAdminFunction<{ event: unknown | null }>("readCartelGilRushEvent", token!, { afterRevision: revision }, { ...callableOptions, timeout: 45_000 });
        if (!active) return;
        if (result.event !== null) {
          const event = readGilRushEvent(result.event);
          revision = event.revision;
          receive(event);
        }
        await wait(1000);
      } catch (cause) {
        if (!active) return;
        const error = cause instanceof Error ? cause : new Error("Could not read the shared event.");
        fail(error);
        const code = (cause as { code?: string } | null)?.code;
        if (code === "functions/permission-denied" || code === "functions/unauthenticated") return;
        revision = null;
        await wait(5000);
      }
    }
  }
  void listen();
  return () => {
    active = false;
    clearTimeout(timer);
    resume?.();
    resume = undefined;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
  };
}

export async function mutateSharedEvent(token: string, action: SharedEventAction, expectedRevision: number): Promise<SharedEvent> {
  if (useStub) return mutateStubEvent(token, action, expectedRevision);
  const result = await callAdminFunction<{ ok: true; event: unknown }>(callableName, token, { action, expectedRevision }, callableOptions);
  return readGilRushEvent(result.event);
}
