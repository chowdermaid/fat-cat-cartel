import { GAME_SERVERS } from "../constants";
import type {
  GameServerAuditLogEntry, GameServerId, GameServerSettings,
  GameServerStatusResponse, GameServerTelemetryResponse, GameServersResponse,
} from "../types";
import { GAME_SERVER_FIXTURE_TIME, gameServerFixture, type GameServerFixture } from "./gameServerFixtures";

export function parseMockServerId(data: Record<string, unknown>, optional = false): GameServerId {
  if (optional && !("serverId" in data)) return "palworld";
  if (data.serverId !== "palworld" && data.serverId !== "dragonwilds") {
    throw new Error("A valid game server is required.");
  }
  return data.serverId;
}

export function parseMockCatalogServerIds(data: Record<string, unknown>): GameServerId[] {
  if (!("includeDragonwilds" in data)) return ["palworld"];
  if (typeof data.includeDragonwilds !== "boolean") throw new Error("includeDragonwilds must be a boolean.");
  return data.includeDragonwilds ? ["palworld", "dragonwilds"] : ["palworld"];
}

type Actor = { discordUserId: string; characterName: string; isAdmin: boolean };
type Storage = { read: (feature: string) => string | null; write: (feature: string, value: string) => void };

// Shared mechanics keep direct stubs and persona callables consistent. Only persona
// state is persisted; the three legacy Palworld keys migrate independently.
export function createGameServerMockState(profile: "direct" | "persona", storage?: Storage) {
  const memory = new Map<string, string>();
  const read = storage?.read ?? ((key: string) => memory.get(key) ?? null);
  const write = storage?.write ?? ((key: string, value: string) => { memory.set(key, value); });
  function readMap<T>(feature: string): Partial<Record<GameServerId, T>> {
    const raw = read(feature);
    if (raw === null) return {};
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    const legacy = feature === "game-server-status" ? typeof parsed === "string"
      : feature === "game-server-audit" ? Array.isArray(parsed)
      : parsed && typeof parsed === "object" && "enabled" in parsed;
    if (legacy) {
      const migrated = { palworld: parsed };
      write(feature, JSON.stringify(migrated));
      return migrated;
    }
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }
  function set<T>(feature: string, serverId: GameServerId, value: T) {
    write(feature, JSON.stringify({ ...readMap<T>(feature), [serverId]: value }));
  }
  function settings(serverId: GameServerId): GameServerSettings {
    parseMockServerId({ serverId });
    const saved = readMap<GameServerSettings>("game-server-settings")[serverId];
    return {
      serverId,
      enabled: typeof saved?.enabled === "boolean" ? saved.enabled : serverId === "palworld",
      disabledMessage: saved?.disabledMessage ?? null,
      updatedAt: saved?.updatedAt ?? 0,
      updatedBy: saved?.updatedBy ?? null,
    };
  }
  function status<T extends GameServerId>(serverId: T): GameServerStatusResponse<T> {
    const config = settings(serverId);
    const scenario = config.enabled
      ? readMap<GameServerFixture>("game-server-status")[serverId] ??
        (serverId === "palworld" && profile === "direct" ? "running" : "stopped")
      : "disabled";
    const current = gameServerFixture(serverId, scenario, Date.now());
    current.disabledMessage = config.disabledMessage;
    if (!config.enabled && config.disabledMessage) current.message = config.disabledMessage;
    if (profile === "persona" && serverId === "palworld" && config.enabled && current.status !== "unavailable") {
      const running = current.status === "running";
      current.host = running ? "127.0.0.1" : null;
      current.connectAddress = running ? "127.0.0.1:8211" : null;
      current.instanceId = "i-local-palworld";
      current.maxPlayers = null;
      const now = new Date(current.checkedAt);
      current.monthlyCost = {
        monthKey: now.toISOString().slice(0, 7), estimatedComputeAud: 4.25,
        runningHours: 28.3, hourlyRateAud: 0.15, instanceType: "t3a.large", updatedAt: current.checkedAt,
      };
      current.previousMonthCost = {
        monthKey: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7),
        estimatedComputeAud: 12.75, runningHours: 85, hourlyRateAud: 0.15,
        instanceType: "t3a.large", updatedAt: current.checkedAt - 24 * 60 * 60 * 1000,
      };
      if (scenario !== "telemetry-failure") {
        current.playerCount = running ? 1 : null;
        // Preserve the existing persona Palworld row and all its fields.
        Object.assign(current, { players: running ? [{ name: "Chow", accountName: "chow",
          playerId: "626327D9000000000000000000000000", userId: "steam_76561198069906492",
          ping: 19.6, level: 8 }] : [], memoryUsedPercent: running ? 41.8 : null,
          diskUsedPercent: running ? 63.2 : null });
      }
    }
    return current;
  }
  function telemetry<T extends GameServerId>(serverId: T): GameServerTelemetryResponse<T> {
    const current = status(serverId);
    return { ok: true, serverId, playerCount: current.playerCount, maxPlayers: current.maxPlayers,
      players: current.players, memoryUsedPercent: current.memoryUsedPercent,
      diskUsedPercent: current.diskUsedPercent, telemetryCheckedAt: Date.now(),
      telemetryMessage: current.telemetryMessage };
  }
  function events(serverId: GameServerId, limit: number) {
    parseMockServerId({ serverId });
    const saved = readMap<GameServerAuditLogEntry[]>("game-server-audit")[serverId];
    const initial: GameServerAuditLogEntry[] = profile === "direct" && serverId === "palworld" ? [{
      id: "stub-start", serverId, action: "start", result: "requested", statusBefore: "stopped",
      statusAfter: "running", message: "Palworld started in stub mode.",
      requestedByDiscordUserId: "local-dev", requestedByDisplayName: "Local Admin", isAdmin: true,
      createdAt: GAME_SERVER_FIXTURE_TIME - 12 * 60 * 1000,
    }] : [];
    return { ok: true as const, entries: (saved ?? initial).slice(0, limit) };
  }
  function append(serverId: GameServerId, actor: Actor,
    entry: Pick<GameServerAuditLogEntry, "action" | "result" | "statusBefore" | "statusAfter" | "message">) {
    set("game-server-audit", serverId, [{
      id: `local-${crypto.randomUUID()}`, serverId, ...entry,
      requestedByDiscordUserId: actor.discordUserId, requestedByDisplayName: actor.characterName,
      isAdmin: actor.isAdmin, createdAt: Date.now(),
    }, ...events(serverId, 50).entries].slice(0, 50));
  }
  function updateSettings(serverId: GameServerId, enabled: boolean, disabledMessage: string | null, actor: Actor) {
    parseMockServerId({ serverId });
    if (!actor.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    const value: GameServerSettings = { serverId, enabled, disabledMessage: disabledMessage?.trim().slice(0, 240) || null,
      updatedAt: Date.now(), updatedBy: actor.discordUserId };
    set("game-server-settings", serverId, value);
    append(serverId, actor, { action: "settings", result: "requested", statusBefore: "unknown",
      statusAfter: enabled ? "unknown" : "disabled", message: `${serverId} ${enabled ? "enabled" : "disabled"} locally.` });
    return { ok: true as const, settings: value };
  }
  function action<T extends GameServerId>(serverId: T, action: "start" | "stop", actor: Actor) {
    const before = status(serverId);
    if (!before.enabled) throw new Error(before.message);
    const noop = action === "start" ? ["running", "pending"].includes(before.status)
      : ["stopped", "stopping"].includes(before.status);
    const allowed = action === "start" ? before.status === "stopped" : before.status === "running";
    const message = !noop && !allowed ? `${serverId} cannot ${action} from ${before.status}.`
      : `${serverId} ${action} ${noop ? "already satisfied" : "completed"} locally.`;
    append(serverId, actor, { action, result: noop ? "noop" : allowed ? "requested" : "blocked",
      statusBefore: before.status, statusAfter: allowed ? (action === "start" ? "running" : "stopped") : before.status, message });
    if (!noop && !allowed) throw new Error(message);
    // Local actions complete immediately; pending/stopping are explicit fixtures.
    if (allowed) set("game-server-status", serverId, action === "start" ? "running" : "stopped");
    return status(serverId);
  }
  function catalog(allowedIds: GameServerId[] = ["palworld", "dragonwilds"]): GameServersResponse {
    return { ok: true, servers: GAME_SERVERS.filter((definition) => allowedIds.includes(definition.id)).map((definition) => {
      const current = status(definition.id);
      return { ...definition, status: current.status, host: current.host, connectAddress: current.connectAddress,
        enabled: current.enabled, disabledMessage: current.disabledMessage,
        controlsAvailable: current.enabled && ["running", "stopped"].includes(current.status), phase: "stub" };
    }) };
  }
  function fixture(serverId: GameServerId, scenario: GameServerFixture) {
    parseMockServerId({ serverId });
    set("game-server-status", serverId, scenario === "disabled" ? "stopped" : scenario);
    set("game-server-settings", serverId, { ...settings(serverId), enabled: scenario !== "disabled" });
  }
  return { settings, updateSettings, status, telemetry, events, action, catalog, fixture };
}
