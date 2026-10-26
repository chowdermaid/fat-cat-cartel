import { DEV_AUTH_LAYER_ENABLED, DEV_SESSION_TOKEN, getSelectedDevPersona } from "@/lib/dev/personas";
import { LOCAL_DEV_ADMIN_SESSION_TOKEN } from "@/features/admin/constants";
import { nextGilRushEvent, readGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import type { SharedEvent, SharedEventAction } from "../types";

const key = "fcc_dev_data_cartel-gil-rush";
const changed = "fcc-gil-rush-dev-update";

export function subscribeStubEvent(receive: (event: SharedEvent) => void, fail: (error: Error) => void): () => void {
  let active = true;
  const notify = () => {
    if (!active) return;
    try { receive(readGilRushEvent(JSON.parse(localStorage.getItem(key) ?? "null"))); }
    catch (error) { fail(error instanceof Error ? error : new Error("Shared event is invalid.")); }
  };
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) notify(); };
  window.addEventListener(changed, notify);
  window.addEventListener("storage", storage);
  queueMicrotask(notify);
  return () => { active = false; window.removeEventListener(changed, notify); window.removeEventListener("storage", storage); };
}

export async function mutateStubEvent(token: string, action: SharedEventAction, revision: number): Promise<SharedEvent> {
  const allowed = DEV_AUTH_LAYER_ENABLED
    ? token === DEV_SESSION_TOKEN && getSelectedDevPersona().isAdmin
    : token === LOCAL_DEV_ADMIN_SESSION_TOKEN;
  if (!allowed) throw new Error("Boss or Underpaw Discord role required.");
  // Web Locks makes the browser-only fixture atomic across tabs too.
  return navigator.locks.request(key, () => {
    const next = nextGilRushEvent(JSON.parse(localStorage.getItem(key) ?? "null"), action, revision);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
    return next;
  });
}
