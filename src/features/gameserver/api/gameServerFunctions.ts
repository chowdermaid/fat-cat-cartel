import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import type {
  GameServerActionResponse,
  GameServerAccessStatusResponse,
  GameServerAuditLogResponse,
  GameServerId,
  GameServersResponse,
  GameServerStatusResponse,
} from "../types";
import {
  stubGameServerAccessStatus,
  stubGameServerAction,
  stubGameServerEvents,
  stubGameServerStatus,
  stubGameServers,
} from "./gameServerStubs";

const USE_STUBS =
  import.meta.env.DEV && import.meta.env.VITE_USE_STUBS === "true";

export async function callGameServerFunction<T = unknown>(
  name: string,
  adminSessionToken: string,
  data: Record<string, unknown> = {},
  options?: { timeout?: number },
): Promise<T> {
  return callAdminFunction<T>(
    name,
    adminSessionToken,
    data,
    options,
  );
}

export function getGameServerAccessStatus(sessionToken: string) {
  if (USE_STUBS) return stubGameServerAccessStatus();
  return callGameServerFunction<GameServerAccessStatusResponse>(
    "getGameServerAccessStatus",
    sessionToken,
  );
}

export function getGameServers(sessionToken: string) {
  if (USE_STUBS) return stubGameServers();
  return callGameServerFunction<GameServersResponse>(
    "getGameServers",
    sessionToken,
  );
}

export function getGameServerStatus(
  sessionToken: string,
  serverId: GameServerId,
) {
  if (USE_STUBS) return stubGameServerStatus();
  return callGameServerFunction<GameServerStatusResponse>(
    "getGameServerStatus",
    sessionToken,
    { serverId },
  );
}

export function startGameServer(sessionToken: string, serverId: GameServerId) {
  if (USE_STUBS) return stubGameServerAction("start");
  return callGameServerFunction<GameServerActionResponse>(
    "startGameServer",
    sessionToken,
    { serverId },
  );
}

export function stopGameServer(sessionToken: string, serverId: GameServerId) {
  if (USE_STUBS) return stubGameServerAction("stop");
  return callGameServerFunction<GameServerActionResponse>(
    "stopGameServer",
    sessionToken,
    { serverId },
  );
}

export function listGameServerEvents(
  sessionToken: string,
  serverId: GameServerId,
) {
  if (USE_STUBS) return stubGameServerEvents();
  return callGameServerFunction<GameServerAuditLogResponse>(
    "listGameServerEvents",
    sessionToken,
    { serverId },
  );
}
