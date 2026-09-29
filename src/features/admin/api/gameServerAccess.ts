import { readGameServerAccessStore, upsertLocalGameServerAccess, deleteLocalGameServerAccess } from "@/lib/dev/gameServerAccess";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { stubGameServerAuditLog, stubGameServerSettings, stubUpdateGameServerSettings } from "@/features/gameserver/api/gameServerStubs";
import { callAdminFunction } from "./adminFunctions";
import type {
  GameServerAccessCandidatesResponse,
  GameServerAccessEntry,
  GameServerAccessListResponse,
  GameServerAccessUpsertResponse,
  GameServerAuditLogResponse,
  GameServerId,
  GameServerSettingsResponse,
} from "@/features/gameserver/types";

const USE_STUBS = import.meta.env.DEV && import.meta.env.VITE_USE_STUBS === "true" && !DEV_AUTH_LAYER_ENABLED;

export type GameServerAccessInput = {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  expiresAt: number | null;
  notes: string | null;
};

export async function listGameServerAccess(adminSessionToken: string, serverId: GameServerId = "palworld") {
  if (USE_STUBS) return { ok: true as const, entries: Object.values(readGameServerAccessStore(serverId)).sort((a, b) => a.displayName.localeCompare(b.displayName)) };
  return callAdminFunction<GameServerAccessListResponse>(
    "listGameServerAccess",
    adminSessionToken,
    { serverId },
  );
}

export async function listGameServerAccessCandidates(adminSessionToken: string, serverId: GameServerId = "palworld") {
  if (USE_STUBS) return { ok: true as const, candidates: [], legacyEntries: (await listGameServerAccess(adminSessionToken, serverId)).entries };
  return callAdminFunction<GameServerAccessCandidatesResponse>(
    "listGameServerAccessCandidates",
    adminSessionToken,
    { serverId },
  );
}

export async function upsertGameServerAccess(
  adminSessionToken: string,
  input: GameServerAccessInput,
  serverId: GameServerId = "palworld",
) {
  if (USE_STUBS) return upsertLocalGameServerAccess(input, "local-dev", serverId);
  return callAdminFunction<GameServerAccessUpsertResponse>(
    "upsertGameServerAccess",
    adminSessionToken,
    { ...input, serverId },
  );
}

export async function deleteGameServerAccess(
  adminSessionToken: string,
  discordUserId: string,
  serverId: GameServerId = "palworld",
) {
  if (USE_STUBS) return deleteLocalGameServerAccess(discordUserId, serverId);
  return callAdminFunction<{ ok: true }>(
    "deleteGameServerAccess",
    adminSessionToken,
    { discordUserId, serverId },
  );
}

export function listGameServerAuditLog(
  adminSessionToken: string,
  serverId: GameServerId = "palworld",
) {
  if (USE_STUBS) return stubGameServerAuditLog(serverId);
  return callAdminFunction<GameServerAuditLogResponse>(
    "listGameServerAuditLog",
    adminSessionToken,
    { serverId },
  );
}

export function getGameServerSettings(adminSessionToken: string, serverId: GameServerId = "palworld") {
  if (USE_STUBS) return stubGameServerSettings(serverId);
  return callAdminFunction<GameServerSettingsResponse>(
    "getGameServerSettings",
    adminSessionToken,
    { serverId },
  );
}

export function updateGameServerSettings(
  adminSessionToken: string,
  input: {
    serverId: GameServerId;
    enabled: boolean;
    disabledMessage: string | null;
  },
) {
  if (USE_STUBS) return stubUpdateGameServerSettings(input);
  return callAdminFunction<GameServerSettingsResponse>(
    "updateGameServerSettings",
    adminSessionToken,
    input,
  );
}

export function emptyGameServerAccessEntry(): GameServerAccessEntry {
  return {
    discordUserId: "",
    displayName: "",
    enabled: true,
    expiresAt: null,
    notes: null,
    addedBy: "",
    addedAt: 0,
    updatedBy: "",
    updatedAt: 0,
  };
}
