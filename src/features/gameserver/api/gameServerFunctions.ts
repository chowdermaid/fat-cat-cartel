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
  import.meta.env.DEV && import.meta.env.VITE_USE_STUBS === "true";
const pendingReads = new Map<string, Promise<unknown>>();

function sharedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pendingReads.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = load();
  pendingReads.set(key, promise);
  const clear = () => {
    if (pendingReads.get(key) === promise) pendingReads.delete(key);
  };
  void promise.then(clear, clear);
  return promise;
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

export function getGameServerAccessStatus(sessionToken: string) {
  if (USE_STUBS) return stubGameServerAccessStatus();
  return sharedRead(`access:${sessionToken}`, () =>
    callGameServerFunction<GameServerAccessStatusResponse>(
      "getGameServerAccessStatus",
      sessionToken,
    ),
  );
}

export function getGameServers(sessionToken: string) {
  if (USE_STUBS) return stubGameServers();
  return sharedRead(`servers:${sessionToken}`, () =>
    callGameServerFunction<GameServersResponse>(
      "getGameServers",
      sessionToken,
    ),
  );
}

export function getGameServerStatus(
  sessionToken: string,
  serverId: GameServerId,
) {
  if (USE_STUBS) return stubGameServerStatus();
  return sharedRead(`status:${sessionToken}:${serverId}`, () =>
    callGameServerFunction<GameServerStatusResponse>(
      "getGameServerStatus",
      sessionToken,
      { serverId },
    ),
  );
}

export function getGameServerTelemetry(
  sessionToken: string,
  serverId: GameServerId,
) {
  if (USE_STUBS) return stubGameServerTelemetry();
  return sharedRead(`telemetry:${sessionToken}:${serverId}`, () =>
    callGameServerFunction<GameServerTelemetryResponse>(
      "getGameServerTelemetry",
      sessionToken,
      { serverId },
    ),
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
  return sharedRead(`events:${sessionToken}:${serverId}`, () =>
    callGameServerFunction<GameServerAuditLogResponse>(
      "listGameServerEvents",
      sessionToken,
      { serverId },
    ),
  );
}
