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

export type GameServerAccessInput = {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  notes: string | null;
};

export function listGameServerAccess(adminSessionToken: string) {
  return callAdminFunction<GameServerAccessListResponse>(
    "listGameServerAccess",
    adminSessionToken,
  );
}

export function listGameServerAccessCandidates(adminSessionToken: string) {
  return callAdminFunction<GameServerAccessCandidatesResponse>(
    "listGameServerAccessCandidates",
    adminSessionToken,
  );
}

export function upsertGameServerAccess(
  adminSessionToken: string,
  input: GameServerAccessInput,
) {
  return callAdminFunction<GameServerAccessUpsertResponse>(
    "upsertGameServerAccess",
    adminSessionToken,
    input,
  );
}

export function deleteGameServerAccess(
  adminSessionToken: string,
  discordUserId: string,
) {
  return callAdminFunction<{ ok: true }>(
    "deleteGameServerAccess",
    adminSessionToken,
    { discordUserId },
  );
}

export function listGameServerAuditLog(
  adminSessionToken: string,
  serverId: GameServerId = "palworld",
) {
  return callAdminFunction<GameServerAuditLogResponse>(
    "listGameServerAuditLog",
    adminSessionToken,
    { serverId },
  );
}

export function getGameServerSettings(adminSessionToken: string) {
  return callAdminFunction<GameServerSettingsResponse>(
    "getGameServerSettings",
    adminSessionToken,
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
    notes: null,
    addedBy: "",
    addedAt: 0,
    updatedAt: 0,
  };
}
