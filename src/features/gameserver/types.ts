import type { AdminSession } from "@/features/admin/types";

export type GameServerId = "palworld";

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
  sessionToken: string | null;
  session: GameServerSession | null;
  login: () => void;
  logout: () => Promise<void>;
  error: string | null;
}

export interface GameServerAccessEntry {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  notes: string | null;
  addedBy: string;
  addedAt: number;
  updatedAt: number;
}

export interface GameServerAccessListResponse {
  ok: true;
  entries: GameServerAccessEntry[];
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

export interface GameServerStatusResponse {
  ok: true;
  serverId: GameServerId;
  status: GameServerStatus;
  checkedAt: number;
  host: string | null;
  connectAddress: string | null;
  message: string;
  enabled: boolean;
  disabledMessage: string | null;
  instanceId: string | null;
  instanceType: string | null;
  launchTime: string | null;
  playerCount: number | null;
  maxPlayers: number | null;
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  idleSince: number | null;
  autoStopEligibleAt: number | null;
  telemetryCheckedAt: number | null;
  telemetryMessage: string | null;
}

export interface GameServerActionResponse {
  ok: boolean;
  serverId: GameServerId;
  status: GameServerStatus;
  message: string;
  checkedAt?: number;
  host?: string | null;
  connectAddress?: string | null;
  enabled?: boolean;
  disabledMessage?: string | null;
  instanceId?: string | null;
  instanceType?: string | null;
  launchTime?: string | null;
  playerCount?: number | null;
  maxPlayers?: number | null;
  memoryUsedPercent?: number | null;
  diskUsedPercent?: number | null;
  idleSince?: number | null;
  autoStopEligibleAt?: number | null;
  telemetryCheckedAt?: number | null;
  telemetryMessage?: string | null;
}
