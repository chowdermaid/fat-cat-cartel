import type { GameServerId } from "../types";
import { createGameServerMockState, parseMockCatalogServerIds, parseMockServerId } from "./gameServerMockState";
import type { GameServerFixture } from "./gameServerFixtures";

const state = createGameServerMockState("direct");
const actor = { discordUserId: "local-dev", characterName: "Local Admin", isAdmin: true };

export async function stubGameServerAccessStatus(serverId: GameServerId = "palworld") {
  parseMockServerId({ serverId });
  return { ok: true as const, canUseGameServers: true, isAdmin: true, expiresAt: null };
}
export async function stubGameServers(data: { includeDragonwilds?: boolean } = {}) {
  return state.catalog(parseMockCatalogServerIds(data));
}
export async function stubGameServerStatus<T extends GameServerId>(serverId: T) { return state.status(serverId); }
export async function stubGameServerTelemetry<T extends GameServerId>(serverId: T) { return state.telemetry(serverId); }
export async function stubGameServerAction<T extends GameServerId>(action: "start" | "stop", serverId: T) {
  return state.action(serverId, action, actor);
}
export async function stubGameServerEvents(serverId: GameServerId) { return state.events(serverId, 5); }
export async function stubGameServerAuditLog(serverId: GameServerId) { return state.events(serverId, 25); }
export async function stubGameServerSettings(serverId: GameServerId) {
  return { ok: true as const, settings: state.settings(serverId) };
}
export async function stubUpdateGameServerSettings(input: { serverId: GameServerId; enabled: boolean; disabledMessage: string | null }) {
  return state.updateSettings(input.serverId, input.enabled, input.disabledMessage, actor);
}
// Explicit local scenario selection; synthetic count fixtures are future UI examples only.
export function setStubGameServerFixture(serverId: GameServerId, scenario: GameServerFixture) {
  state.fixture(serverId, scenario);
}
