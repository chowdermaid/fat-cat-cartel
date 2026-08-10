import type {
  GameServerActionResponse,
  GameServerAuditLogEntry,
  GameServerAuditLogResponse,
  GameServerStatus,
  GameServerStatusResponse,
  GameServerTelemetryResponse,
  GameServersResponse,
} from "../types";

let status: GameServerStatus = "running";
let checkedAt = Date.now();
let events: GameServerAuditLogEntry[] = [
  {
    id: "stub-start",
    serverId: "palworld",
    action: "start",
    result: "requested",
    statusBefore: "stopped",
    statusAfter: "running",
    message: "Palworld started in stub mode.",
    requestedByDiscordUserId: "local-dev",
    requestedByDisplayName: "Local Admin",
    isAdmin: true,
    createdAt: checkedAt - 12 * 60 * 1000,
  },
];

function statusResponse(): GameServerStatusResponse {
  const running = status === "running";
  return {
    ok: true,
    serverId: "palworld",
    status,
    checkedAt,
    host: running ? "palworld.stub.local" : null,
    connectAddress: running ? "palworld.stub.local:8211" : null,
    message: running ? "Ready to join." : "Offline.",
    enabled: true,
    disabledMessage: null,
    instanceId: "i-stub-palworld",
    instanceType: "t3a.large",
    launchTime: running
      ? new Date(checkedAt - 2 * 60 * 60 * 1000).toISOString()
      : null,
    playerCount: running ? 2 : 0,
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
      monthKey: new Date().toISOString().slice(0, 7),
      estimatedComputeAud: 12.4,
      runningHours: 82.67,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: checkedAt,
    },
    previousMonthCost: {
      monthKey: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 7),
      estimatedComputeAud: 18.75,
      runningHours: 125,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: checkedAt,
    },
  };
}

export function stubGameServerAccessStatus() {
  return Promise.resolve({
    ok: true as const,
    canUseGameServers: true,
    isAdmin: true,
    expiresAt: null,
  });
}

export function stubGameServers(): Promise<GameServersResponse> {
  const current = statusResponse();
  return Promise.resolve({
    ok: true,
    servers: [
      {
        id: "palworld",
        name: "Palworld",
        description: "Dedicated Palworld server hosted on AWS EC2.",
        provider: "aws-ec2",
        region: "ap-southeast-2",
        route: "/gameserver/palworld",
        ports: [
          { label: "Server", protocol: "UDP", port: 8211 },
          { label: "Query", protocol: "UDP", port: 27015 },
        ],
        status: current.status,
        host: current.host,
        connectAddress: current.connectAddress,
        enabled: true,
        disabledMessage: null,
        controlsAvailable:
          current.status === "running" || current.status === "stopped",
        phase: "stub",
      },
    ],
  });
}

export function stubGameServerStatus(): Promise<GameServerStatusResponse> {
  checkedAt = Date.now();
  return Promise.resolve(statusResponse());
}

export function stubGameServerTelemetry(): Promise<GameServerTelemetryResponse> {
  const current = statusResponse();
  return Promise.resolve({
    ok: true,
    serverId: current.serverId,
    playerCount: current.playerCount,
    maxPlayers: current.maxPlayers,
    players: current.players,
    memoryUsedPercent: current.memoryUsedPercent,
    diskUsedPercent: current.diskUsedPercent,
    telemetryCheckedAt: current.telemetryCheckedAt ?? Date.now(),
    telemetryMessage: current.telemetryMessage,
  });
}

export function stubGameServerAction(
  action: "start" | "stop",
): Promise<GameServerActionResponse> {
  const statusBefore = status;
  status = action === "start" ? "running" : "stopped";
  checkedAt = Date.now();
  const event: GameServerAuditLogEntry = {
    id: `stub-${action}-${checkedAt}`,
    serverId: "palworld",
    action,
    result: "requested",
    statusBefore,
    statusAfter: status,
    message:
      action === "start"
        ? "Palworld started in stub mode."
        : "Palworld stopped in stub mode.",
    requestedByDiscordUserId: "local-dev",
    requestedByDisplayName: "Local Admin",
    isAdmin: true,
    createdAt: checkedAt,
  };
  events = [event, ...events].slice(0, 5);
  return Promise.resolve(statusResponse());
}

export function stubGameServerEvents(): Promise<GameServerAuditLogResponse> {
  return Promise.resolve({ ok: true, entries: events });
}
