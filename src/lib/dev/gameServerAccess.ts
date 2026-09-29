import type { GameServerAccessEntry, GameServerId } from "@/features/gameserver/types";
import { parseMockServerId } from "@/features/gameserver/api/gameServerMockState";
import { DEV_PERSONAS, devStorageKey, getSelectedDevPersona, subscribeDevPersona, type DevPersona } from "./personas";

const ACCESS_EVENT = "fcc-dev-game-server-access-change";
const ids: GameServerId[] = ["palworld", "dragonwilds"];
function accessKey(serverId: GameServerId): string {
  return devStorageKey(parseMockServerId({ serverId }) === "palworld" ? "game-server-access" : "dragonwilds-server-access");
}

export function readGameServerAccessStore(serverId: GameServerId = "palworld"): Record<string, GameServerAccessEntry> {
  const key = accessKey(serverId);
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function writeGameServerAccessStore(store: Record<string, GameServerAccessEntry>, serverId: GameServerId = "palworld"): void {
  const key = accessKey(serverId);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(store));
  window.dispatchEvent(new Event(ACCESS_EVENT));
}

export function devGameServerAccessStatus(persona: DevPersona = getSelectedDevPersona(), serverId: GameServerId = "palworld") {
  const entry = readGameServerAccessStore(serverId)[persona.discordUserId];
  const expiresAt = entry?.expiresAt;
  const validIdentity = !entry?.discordUserId || entry.discordUserId === persona.discordUserId;
  const active = validIdentity && entry?.enabled === true && (expiresAt == null ||
    (typeof expiresAt === "number" && Number.isFinite(expiresAt) && expiresAt > Date.now()));
  return { ok: true as const, canUseGameServers: persona.authenticated && (persona.isAdmin || active),
    isAdmin: persona.authenticated && persona.isAdmin, expiresAt: expiresAt ?? null };
}

export function devGameServerCapabilities(persona: DevPersona = getSelectedDevPersona()) {
  const gameServerAccessById = {
    palworld: devGameServerAccessStatus(persona, "palworld").canUseGameServers,
    dragonwilds: devGameServerAccessStatus(persona, "dragonwilds").canUseGameServers,
  };
  return { gameServerAccessById, canUseGameServers: gameServerAccessById.palworld || gameServerAccessById.dragonwilds };
}

export function upsertLocalGameServerAccess(input: {
  discordUserId: string; displayName: string; enabled: boolean; expiresAt: number | null; notes: string | null;
}, actor: string, serverId: GameServerId = "palworld") {
  const discordUserId = input.discordUserId.trim();
  const displayName = input.displayName.trim();
  const expiresAt = input.expiresAt ?? null;
  if (!/^\d{17,24}$/.test(discordUserId) && !DEV_PERSONAS.some((persona) => persona.discordUserId === discordUserId)) throw new Error("A valid Discord user ID is required.");
  if (!displayName || displayName.length > 80) throw new Error("Display name must be between 1 and 80 characters.");
  if (expiresAt !== null && (!Number.isSafeInteger(expiresAt) || expiresAt <= 0 || (input.enabled && expiresAt <= Date.now()))) {
    throw new Error("Enabled access must expire in the future.");
  }
  const store = readGameServerAccessStore(serverId);
  const existing = store[discordUserId];
  const now = Date.now();
  const entry: GameServerAccessEntry = { discordUserId, displayName, enabled: input.enabled,
    expiresAt, notes: input.notes?.trim().slice(0, 500) || null, addedBy: existing?.addedBy || actor,
    addedAt: existing?.addedAt || now, updatedBy: actor, updatedAt: now };
  writeGameServerAccessStore({ ...store, [discordUserId]: entry }, serverId);
  return { ok: true as const, entry };
}

export function deleteLocalGameServerAccess(discordUserId: string, serverId: GameServerId = "palworld") {
  const next = { ...readGameServerAccessStore(serverId) };
  delete next[discordUserId];
  writeGameServerAccessStore(next, serverId);
  return { ok: true as const };
}

// Local notifications and earliest active expiry only; no authorization polling.
export function subscribeDevGameServerAccess(listener: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function sync() {
    clearTimeout(timer);
    listener();
    const persona = getSelectedDevPersona();
    const deadlines = ids.map((id) => devGameServerAccessStatus(persona, id))
      .filter((access) => !access.isAdmin && access.canUseGameServers && access.expiresAt !== null)
      .map((access) => access.expiresAt!);
    if (deadlines.length) timer = setTimeout(sync, Math.min(Math.max(1, Math.min(...deadlines) - Date.now() + 1), 2_147_483_647));
  }
  const unsubscribe = subscribeDevPersona(sync);
  window.addEventListener(ACCESS_EVENT, sync);
  window.addEventListener("focus", sync);
  sync();
  return () => {
    clearTimeout(timer);
    unsubscribe();
    window.removeEventListener(ACCESS_EVENT, sync);
    window.removeEventListener("focus", sync);
  };
}
