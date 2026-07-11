import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import type {
  GameServerActionResponse,
  GameServerAuditLogResponse,
  GameServerId,
  GameServersResponse,
  GameServerStatusResponse,
} from "../types";

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

export function getGameServers(sessionToken: string) {
  return callGameServerFunction<GameServersResponse>(
    "getGameServers",
    sessionToken,
  );
}

export function getGameServerStatus(
  sessionToken: string,
  serverId: GameServerId,
) {
  return callGameServerFunction<GameServerStatusResponse>(
    "getGameServerStatus",
    sessionToken,
    { serverId },
  );
}

export function startGameServer(sessionToken: string, serverId: GameServerId) {
  return callGameServerFunction<GameServerActionResponse>(
    "startGameServer",
    sessionToken,
    { serverId },
  );
}

export function stopGameServer(sessionToken: string, serverId: GameServerId) {
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
  return callGameServerFunction<GameServerAuditLogResponse>(
    "listGameServerEvents",
    sessionToken,
    { serverId },
  );
}
