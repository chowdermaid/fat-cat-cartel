import { DEV_AUTH_LAYER_ENABLED, DEV_SESSION_TOKEN, getSelectedDevPersona } from "@/lib/dev/personas";
import { LOCAL_DEV_ADMIN_SESSION_TOKEN } from "@/features/admin/constants";
import { GilRushError, lockMinorityAssignments, minorityChestCount, nextGilRushEvent, nextMinorityAssignments, publishTreasureAssignments, readGilRushEvent, readMinorityAssignments, requireMinorityGame } from "../../../../functions/src/cartel-gil-rush-model";
import type { MinorityAssignments } from "../../../../functions/src/cartel-gil-rush-model";
import type { SharedEvent, SharedEventAction } from "../types";

const key = "fcc_dev_data_cartel-gil-rush";
const changed = "fcc-gil-rush-dev-update";
const privateKey = "fcc_dev_private_cartel-gil-rush-minority";

function requireStubHost(token: string) {
  const allowed = DEV_AUTH_LAYER_ENABLED ? token === DEV_SESSION_TOKEN && getSelectedDevPersona().isAdmin : token === LOCAL_DEV_ADMIN_SESSION_TOKEN;
  if (!allowed) throw new Error("Boss or Underpaw Discord role required.");
}

export async function loadStubMinority(token: string, gameId: number): Promise<MinorityAssignments | null> {
  requireStubHost(token);
  return navigator.locks.request(key, () => {
    const current = readGilRushEvent(JSON.parse(localStorage.getItem(key) ?? "null"));
    const saved = readMinorityAssignments(JSON.parse(localStorage.getItem(privateKey) ?? "null"), current, gameId);
    if (current.minigame?.kind === "minority" && saved && (current.minigame.treasureAssignments?.revision ?? 0) < saved.revision) {
      localStorage.setItem(key, JSON.stringify(publishTreasureAssignments(current, saved)));
      window.dispatchEvent(new Event(changed));
    }
    return saved;
  });
}

export async function saveStubMinority(token: string, gameId: number, choices: { id: string; chest: number }[], revision: number): Promise<MinorityAssignments> {
  requireStubHost(token);
  return navigator.locks.request(key, () => {
    const current = readGilRushEvent(JSON.parse(localStorage.getItem(key) ?? "null"));
    const saved = nextMinorityAssignments(JSON.parse(localStorage.getItem(privateKey) ?? "null"), current, { gameId, choices }, revision);
    localStorage.setItem(privateKey, JSON.stringify(saved));
    if (current.minigame?.kind === "minority") {
      localStorage.setItem(key, JSON.stringify(publishTreasureAssignments(current, saved)));
      window.dispatchEvent(new Event(changed));
    }
    return saved;
  });
}

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
  requireStubHost(token);
  // Web Locks makes the browser-only fixture atomic across tabs too.
  return navigator.locks.request(key, () => {
    const current = readGilRushEvent(JSON.parse(localStorage.getItem(key) ?? "null"));
    let minority: MinorityAssignments | undefined;
    if (action.type === "reveal-minority-chest") {
      const game = requireMinorityGame(current, action.gameId);
      if (revision !== current.revision) throw new GilRushError("Event changed on another host. Review latest values and retry.", "aborted");
      if (!Number.isSafeInteger(action.chest) || action.chest < 1 || action.chest > minorityChestCount(game.kind) || game.chestReveals.some(row => row.chest === action.chest)) throw new GilRushError("This chest reveal is no longer available.");
      minority = lockMinorityAssignments(JSON.parse(localStorage.getItem(privateKey) ?? "null"), current, action.gameId);
      localStorage.setItem(privateKey, JSON.stringify(minority));
    }
    const next = nextGilRushEvent(current, action, revision, Math.random, minority);
    if (action.type === "reset" || (action.type === "end-minigame" && (current.minigame?.kind === "minority" || current.minigame?.kind === "minority-draw"))) localStorage.removeItem(privateKey);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
    return next;
  });
}
