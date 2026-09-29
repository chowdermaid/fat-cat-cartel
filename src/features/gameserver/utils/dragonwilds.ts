import type {
  DragonwildsServerState,
  GameServerAccessState,
  GameServerId,
  GameServerActionResponse,
  GameServerStatus,
  GameServerStatusResponse,
} from "../types";

export function gameServerIdentity(auth: GameServerAccessState, serverId?: GameServerId): string {
  const access = auth.session?.gameServerAccessById;
  const capabilities = serverId ? [serverId, access?.[serverId]] : [access?.palworld, access?.dragonwilds];
  return JSON.stringify([auth.sessionToken, auth.session?.discordUserId,
    auth.authed, auth.checking, auth.canUseGameServers, auth.session?.isAdmin, ...capabilities]);
}

export function gameServerError(error: unknown): string {
  return error instanceof Error ? error.message : "Game server request failed.";
}

export function isGameServerAccessError(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code).replace(/^functions\//, "") : "";
  return code === "permission-denied" || code === "unauthenticated" ||
    /whitelist|session.*(?:expired|invalid|required)|(?:expired|invalid).*session|not authenticated/i.test(gameServerError(error));
}

export function dragonwildsStatusLabel(status?: GameServerStatus): string {
  switch (status) {
    case "running": return "Host running";
    case "pending": return "Host starting";
    case "stopped": return "Host stopped";
    case "stopping": case "shutting-down": return "Host stopping";
    case "disabled": return "Disabled";
    default: return "Host unavailable";
  }
}

export function validPlayerCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function onlineLabel(count: unknown, capacity: unknown): string {
  if (!validPlayerCount(count)) return "Player count unavailable";
  return validPlayerCount(capacity) && capacity > 0 && capacity >= count
    ? `${count} / ${capacity} online` : `${count} online`;
}

export function memoryLabel(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? `${Math.round(value)}% used` : "Unavailable";
}

export function uptimeLabel(launchTime: string | null | undefined, checkedAt: number | undefined): string {
  const launch = launchTime ? Date.parse(launchTime) : NaN;
  if (!Number.isFinite(launch) || !checkedAt || launch > checkedAt) return "Unavailable";
  const minutes = Math.floor((checkedAt - launch) / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function checkedTime(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value).toLocaleString() : "Unavailable";
}

export function canDragonwildsAct(state: DragonwildsServerState, action: "start" | "stop"): boolean {
  return !state.accessDenied && !state.loadingStatus && !state.action &&
    !state.error && state.status?.enabled === true &&
    state.status.status === (action === "start" ? "stopped" : "running");
}

export function dragonwildsActionStatus(
  result: GameServerActionResponse<"dragonwilds">,
  previous: GameServerStatusResponse<"dragonwilds">,
): GameServerStatusResponse<"dragonwilds"> {
  const present = Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
  return { ...previous, ...present, ok: true } as GameServerStatusResponse<"dragonwilds">;
}
