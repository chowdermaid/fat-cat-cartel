import type { GameServerId, GameServerStatusResponse } from "../types";

export const GAME_SERVER_FIXTURE_TIME = Date.UTC(2026, 8, 29, 0, 0, 0);
export type GameServerFixture = "stopped" | "pending" | "running" | "stopping" |
  "disabled" | "unavailable" | "telemetry-failure" | "synthetic-zero" | "synthetic-count-only";

export function gameServerFixture<T extends GameServerId>(
  serverId: T,
  scenario: GameServerFixture,
  checkedAt = GAME_SERVER_FIXTURE_TIME,
): GameServerStatusResponse<T> {
  const status = scenario === "telemetry-failure" || scenario === "synthetic-zero" || scenario === "synthetic-count-only" ? "running" : scenario;
  const enabled = status !== "disabled";
  const palworld = serverId === "palworld";
  const running = status === "running";
  const response: GameServerStatusResponse = {
    ok: true,
    serverId,
    status,
    checkedAt,
    host: running ? "palworld.stub.local" : null,
    connectAddress: running ? "palworld.stub.local:8211" : null,
    message: running ? "Ready to join." : status === "pending" ? "Starting."
      : status === "stopping" ? "Stopping." : "Offline.",
    enabled,
    disabledMessage: null,
    instanceId: "i-stub-palworld",
    instanceType: "t3a.large",
    launchTime: running
      ? new Date(checkedAt - 2 * 60 * 60 * 1000).toISOString()
      : null,
    playerCount: running ? 2 : status === "stopped" ? 0 : null,
    maxPlayers: 8,
    players: running
      ? [
          {
            name: "Stub Cat",
            accountName: "stub-cat",
            playerId: "stub-player-1",
            userId: "stub-user-1",
            ping: 42,
            level: 38,
          },
          {
            name: "Test Pal",
            accountName: "test-pal",
            playerId: "stub-player-2",
            userId: "stub-user-2",
            ping: 61,
            level: 24,
          },
        ]
      : [],
    memoryUsedPercent: running ? 47 : null,
    diskUsedPercent: 36,
    idleSince: null,
    autoStopEligibleAt: null,
    telemetryCheckedAt: checkedAt,
    telemetryMessage: null,
    monthlyCost: {
      monthKey: new Date(checkedAt).toISOString().slice(0, 7),
      estimatedComputeAud: 12.4,
      runningHours: 82.67,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: checkedAt,
    },
    previousMonthCost: {
      monthKey: new Date(checkedAt - 31 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 7),
      estimatedComputeAud: 18.75,
      runningHours: 125,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: checkedAt,
    },
  };
  if (!palworld) {
    Object.assign(response, {
      host: running ? "dragonwilds.stub.local" : null,
      connectAddress: running ? "dragonwilds.stub.local:7777" : null,
      ...(enabled && status !== "unavailable" ? { worldName: "Synthetic Dragonwilds World" } : {}),
      instanceId: "i-stub-dragonwilds", instanceType: null,
      playerCount: scenario === "synthetic-zero" ? 0 : scenario === "synthetic-count-only" ? 2 : null,
      maxPlayers: null, players: [], diskUsedPercent: null,
      monthlyCost: null, previousMonthCost: null,
      message: running ? "Dragonwilds host is running. Game readiness is not verified." : status,
      telemetryMessage: scenario.startsWith("synthetic-")
        ? "Synthetic future-UI fixture only; not current live telemetry."
        : "Dragonwilds live player telemetry is not implemented.",
    });
  }
  if (!enabled || status === "unavailable" || scenario === "telemetry-failure") {
    Object.assign(response, {
      playerCount: null, maxPlayers: null, players: [], memoryUsedPercent: null, diskUsedPercent: null,
      telemetryMessage: scenario === "telemetry-failure" ? "Synthetic telemetry request failed." : "Telemetry unavailable.",
    });
  }
  if (!enabled || status === "unavailable") {
    Object.assign(response, { host: null, connectAddress: null, instanceId: null, instanceType: null,
      launchTime: null, monthlyCost: null, previousMonthCost: null, telemetryCheckedAt: null,
      message: enabled ? "Server unavailable." : "Server disabled by admins." });
  }
  return response as GameServerStatusResponse<T>;
}

