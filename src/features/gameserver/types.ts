import type { AdminSession } from "@/features/admin/types";

export type GameServerId = "palworld" | "dragonwilds";

export type GameServerStatus =
  | "unknown"
  | "disabled"
  | "stopped"
  | "pending"
  | "running"
  | "stopping"
  | "shutting-down"
  | "terminated"
  | "unavailable"
  | "not-implemented";

export interface GameServerDefinition {
  id: GameServerId;
  name: string;
  description: string;
  route: string;
  provider: "aws-ec2";
  region: string;
  ports: GameServerPort[];
}

export interface GameServerPort {
  label: string;
  protocol: "UDP" | "TCP";
  port: number;
}

export type GameServerSession = AdminSession;

export interface GameServerAccessState {
  authed: boolean;
  checking: boolean;
  canUseGameServers: boolean;
  sessionWasAllowedGameServers: boolean;
  sessionToken: string | null;
  session: GameServerSession | null;
  login: () => void;
  logout: () => Promise<void>;
  error: string | null;
}

export interface GameServerAccessStatusResponse {
  ok: true;
  canUseGameServers: boolean;
  isAdmin: boolean;
  expiresAt: number | null;
}

export interface GameServerAccessEntry {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  expiresAt: number | null;
  notes: string | null;
  addedBy: string;
  addedAt: number;
  updatedBy: string;
  updatedAt: number;
}

export interface GameServerAccessListResponse {
  ok: true;
  entries: GameServerAccessEntry[];
}

export interface GameServerAccessCandidate {
  lodestoneId: string;
  discordUserId: string;
  displayName: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  accessEntry: GameServerAccessEntry | null;
  implicitAccess: boolean;
}

export interface GameServerAccessCandidatesResponse {
  ok: true;
  candidates: GameServerAccessCandidate[];
  legacyEntries: GameServerAccessEntry[];
}

export interface GameServerAccessUpsertResponse {
  ok: true;
  entry: GameServerAccessEntry;
}

export type GameServerAuditAction = "start" | "stop" | "auto-stop" | "settings";
export type GameServerAuditResult = "requested" | "noop" | "blocked" | "failed";

export interface GameServerAuditLogEntry {
  id: string;
  serverId: GameServerId;
  action: GameServerAuditAction;
  result: GameServerAuditResult;
  statusBefore: GameServerStatus;
  statusAfter?: GameServerStatus;
  message: string;
  requestedByDiscordUserId: string;
  requestedByDisplayName?: string;
  isAdmin: boolean;
  instanceId?: string;
  createdAt: number;
}

export interface GameServerAuditLogResponse {
  ok: true;
  entries: GameServerAuditLogEntry[];
}

export interface GameServerSettings {
  serverId: GameServerId;
  enabled: boolean;
  disabledMessage: string | null;
  updatedAt: number;
  updatedBy: string | null;
}

export interface GameServerSettingsResponse {
  ok: true;
  settings: GameServerSettings;
}

export interface GameServerCostSnapshot {
  monthKey: string;
  estimatedComputeAud: number;
  runningHours: number;
  hourlyRateAud: number | null;
  instanceType: string | null;
  updatedAt: number;
}

export interface PalworldPlayer {
  name: string;
  accountName: string;
  playerId: string;
  userId: string;
  ping: number | null;
  level: number | null;
}

// Names are optional telemetry; count-only snapshots have no player rows.
export interface DragonwildsPlayer {
  name: string;
}

export type GameServerPlayer<T extends GameServerId> =
  T extends "palworld" ? PalworldPlayer : DragonwildsPlayer;

export interface GameServersResponse {
  ok: true;
  servers: Array<GameServerDefinition & {
    status: GameServerStatus;
    host?: string | null;
    connectAddress?: string | null;
    enabled?: boolean;
    disabledMessage?: string | null;
    controlsAvailable: boolean;
    phase: "stub" | "live";
  }>;
}

export interface GameServerStatusResponse<T extends GameServerId = GameServerId> {
  ok: true;
  serverId: T;
  status: GameServerStatus;
  checkedAt: number;
  host: string | null;
  connectAddress: string | null;
  worldName?: string | null;
  message: string;
  enabled: boolean;
  disabledMessage: string | null;
  instanceId: string | null;
  instanceType: string | null;
  launchTime: string | null;
  playerCount: number | null;
  maxPlayers: number | null;
  players: GameServerPlayer<T>[];
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  idleSince: number | null;
  autoStopEligibleAt: number | null;
  telemetryCheckedAt: number | null;
  telemetryMessage: string | null;
  monthlyCost: GameServerCostSnapshot | null;
  previousMonthCost: GameServerCostSnapshot | null;
}

export interface GameServerTelemetryResponse<T extends GameServerId = GameServerId> {
  ok: true;
  serverId: T;
  playerCount: number | null;
  maxPlayers: number | null;
  players: GameServerPlayer<T>[];
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  telemetryCheckedAt: number;
  telemetryMessage: string | null;
}

export interface GameServerActionResponse<T extends GameServerId = GameServerId> {
  ok: boolean;
  serverId: T;
  status: GameServerStatus;
  message: string;
  checkedAt?: number;
  host?: string | null;
  connectAddress?: string | null;
  worldName?: string | null;
  enabled?: boolean;
  disabledMessage?: string | null;
  instanceId?: string | null;
  instanceType?: string | null;
  launchTime?: string | null;
  playerCount?: number | null;
  maxPlayers?: number | null;
  players?: GameServerPlayer<T>[];
  memoryUsedPercent?: number | null;
  diskUsedPercent?: number | null;
  idleSince?: number | null;
  autoStopEligibleAt?: number | null;
  telemetryCheckedAt?: number | null;
  telemetryMessage?: string | null;
  monthlyCost?: GameServerCostSnapshot | null;
  previousMonthCost?: GameServerCostSnapshot | null;
}

export interface DragonwildsServerState {
  identity: string;
  status: GameServerStatusResponse<"dragonwilds"> | null;
  telemetry: GameServerTelemetryResponse<"dragonwilds"> | null;
  events: GameServerAuditLogEntry[];
  loadingStatus: boolean;
  loadingTelemetry: boolean;
  loadingEvents: boolean;
  action: "start" | "stop" | null;
  waitingForHost: boolean;
  accessDenied: boolean;
  error: string | null;
  telemetryError: string | null;
  eventsError: string | null;
  notice: string | null;
}
