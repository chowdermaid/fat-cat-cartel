import { sharedGameServerRead } from "./gameServerReadCache";
import { DEV_AUTH_LAYER_ENABLED, getSelectedDevPersona } from "@/lib/dev/personas";
import { devGameServerCapabilities } from "@/lib/dev/gameServerAccess";
import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import type {
  GameServerActionResponse,
  GameServerAccessStatusResponse,
  GameServerAuditLogResponse,
  GameServerId,
  GameServersResponse,
  GameServerStatusResponse,
  GameServerTelemetryResponse,
} from "../types";
import {
  stubGameServerAccessStatus,
  stubGameServerAction,
  stubGameServerEvents,
  stubGameServerStatus,
  stubGameServerTelemetry,
  stubGameServers,
} from "./gameServerStubs";

const USE_STUBS =
  import.meta.env.DEV && import.meta.env.VITE_USE_STUBS === "true" && !DEV_AUTH_LAYER_ENABLED;

function sharedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (DEV_AUTH_LAYER_ENABLED) {
    key = JSON.stringify([key, getSelectedDevPersona().id, devGameServerCapabilities()]);
  }
  return sharedGameServerRead(key, load);
}

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

export function getGameServerAccessStatus(sessionToken: string, serverId: GameServerId = "palworld") {
  return sharedRead(`access:${sessionToken}:${serverId}`, () =>
    USE_STUBS ? stubGameServerAccessStatus(serverId) :
    callGameServerFunction<GameServerAccessStatusResponse>(
      "getGameServerAccessStatus",
      sessionToken,
      { serverId },
    ),
  );
}

export function getGameServers(sessionToken: string) {
  return sharedRead(`servers:${sessionToken}`, () =>
    USE_STUBS ? stubGameServers({ includeDragonwilds: true }) :
    callGameServerFunction<GameServersResponse>(
      "getGameServers",
      sessionToken,
      { includeDragonwilds: true },
    ),
  );
}

export function getGameServerStatus<T extends GameServerId>(
  sessionToken: string,
  serverId: T,
) {
  return sharedRead(`status:${sessionToken}:${serverId}`, () =>
    USE_STUBS ? stubGameServerStatus(serverId) :
    callGameServerFunction<GameServerStatusResponse<T>>(
      "getGameServerStatus",
      sessionToken,
      { serverId },
    ),
  );
}

export function getGameServerTelemetry<T extends GameServerId>(
  sessionToken: string,
  serverId: T,
) {
  return sharedRead(`telemetry:${sessionToken}:${serverId}`, () =>
    USE_STUBS ? stubGameServerTelemetry(serverId) :
    callGameServerFunction<GameServerTelemetryResponse<T>>(
      "getGameServerTelemetry",
      sessionToken,
      { serverId },
    ),
  );
}

export function startGameServer<T extends GameServerId>(sessionToken: string, serverId: T) {
  if (USE_STUBS) return stubGameServerAction("start", serverId);
  return callGameServerFunction<GameServerActionResponse<T>>(
    "startGameServer",
    sessionToken,
    { serverId },
  );
}

export function stopGameServer<T extends GameServerId>(sessionToken: string, serverId: T) {
  if (USE_STUBS) return stubGameServerAction("stop", serverId);
  return callGameServerFunction<GameServerActionResponse<T>>(
    "stopGameServer",
    sessionToken,
    { serverId },
  );
}

export function listGameServerEvents(
  sessionToken: string,
  serverId: GameServerId,
) {
  return sharedRead(`events:${sessionToken}:${serverId}`, () =>
    USE_STUBS ? stubGameServerEvents(serverId) :
    callGameServerFunction<GameServerAuditLogResponse>(
      "listGameServerEvents",
      sessionToken,
      { serverId },
    ),
  );
}
