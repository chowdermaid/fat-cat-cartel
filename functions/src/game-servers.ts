import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { createHash, createHmac } from "node:crypto";
import {
  DescribeInstancesCommand,
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  type Instance,
  type InstanceStateName,
} from "@aws-sdk/client-ec2";
import {
  GetCommandInvocationCommand,
  SendCommandCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import type {
  VerifiedAdminSession,
  VerifiedAuthenticatedSession,
} from "./admin-auth";

export type GameServerId = "palworld" | "dragonwilds";
type GameServerStatus =
  | "unknown"
  | "disabled"
  | "pending"
  | "running"
  | "stopping"
  | "stopped"
  | "shutting-down"
  | "terminated"
  | "unavailable";

type GameServerDefinition = {
  id: GameServerId;
  name: string;
  description: string;
  provider: "aws-ec2";
  region: string;
  route: string;
  ports: Array<{
    label: string;
    protocol: "UDP" | "TCP";
    port: number;
  }>;
};

type GameServerAccessEntry = {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  expiresAt: number | null;
  notes: string | null;
  addedBy: string;
  addedAt: number;
  updatedBy: string;
  updatedAt: number;
};

type GameServerAccessCandidate = {
  lodestoneId: string;
  discordUserId: string;
  displayName: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  accessEntry: GameServerAccessEntry | null;
  implicitAccess: boolean;
};

type GameServerSettings = {
  serverId: GameServerId;
  enabled: boolean;
  disabledMessage: string | null;
  updatedAt: number;
  updatedBy: string | null;
};

type GameServerAuditAction = "start" | "stop" | "auto-stop" | "settings";
type GameServerAuditResult = "requested" | "noop" | "blocked" | "failed";

type GameServerAuditLogEntry = {
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
};

type PalworldTelemetry = {
  playerCount: number | null;
  maxPlayers: number | null;
  players: PalworldPlayer[];
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  telemetryCheckedAt: number;
  telemetryMessage: string | null;
};

type GameServerTelemetryResult = PalworldTelemetry & {
  ok: true;
  serverId: GameServerId;
};

type PalworldPlayer = {
  name: string;
  accountName: string;
  playerId: string;
  userId: string;
  ping: number | null;
  level: number | null;
};

type GameServerIdleState = {
  idleSince: number | null;
  autoStopEligibleAt: number | null;
  updatedAt: number;
};

type GameServerCostSnapshot = {
  monthKey: string;
  estimatedComputeAud: number;
  runningHours: number;
  hourlyRateAud: number | null;
  instanceType: string | null;
  updatedAt: number;
};

export type GameServerAwsConfig = {
  serverId: GameServerId;
  region: string;
  instanceId: string;
  accessKeyId: string;
  secretAccessKey: string;
  gamePort: number;
  queryPort: number | null;
  cloudWatchNamespace: string;
  adminPassword: string;
  worldName?: string;
  capacity?: number | null;
};

export type GameServerConfigResolver = (serverId: GameServerId) => GameServerAwsConfig;

type GameServerStatusResult = {
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
  players: PalworldPlayer[];
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  idleSince: number | null;
  autoStopEligibleAt: number | null;
  telemetryCheckedAt: number | null;
  telemetryMessage: string | null;
  monthlyCost: GameServerCostSnapshot | null;
  previousMonthCost: GameServerCostSnapshot | null;
  worldName?: string | null;
};

const GAME_SERVERS: GameServerDefinition[] = [
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
  },
  {
    id: "dragonwilds",
    name: "Dragonwilds",
    description: "Dedicated RuneScape: Dragonwilds server hosted on AWS EC2.",
    provider: "aws-ec2",
    region: "ap-southeast-2",
    route: "/gameserver/dragonwilds",
    ports: [{ label: "Server", protocol: "UDP", port: 7777 }],
  },
];

function serverName(serverId: GameServerId): string {
  return serverId === "palworld" ? "Palworld" : "Dragonwilds";
}

function resolveServerConfig(
  serverId: GameServerId,
  resolveConfig: GameServerConfigResolver,
): GameServerAwsConfig {
  const config = resolveConfig(serverId);
  if (config.serverId !== serverId) {
    throw new HttpsError("failed-precondition", "Game server configuration does not match the requested server.");
  }
  return config;
}

const DISCORD_ID_PATTERN = /^\d{16,24}$/;
const MAX_DISPLAY_NAME_LENGTH = 80;
const MAX_NOTES_LENGTH = 500;
const MAX_DISABLED_MESSAGE_LENGTH = 240;
const AUDIT_LOG_LIMIT = 50;
const AUDIT_LOG_ADMIN_LIMIT = 25;
const AUDIT_LOG_USER_LIMIT = 5;
const IDLE_AUTO_STOP_MS = 30 * 60 * 1000;
const SSM_COMMAND_TIMEOUT_SECONDS = 30;
const SSM_COMMAND_POLL_ATTEMPTS = 12;
const SSM_COMMAND_POLL_DELAY_MS = 1000;
const INSTANCE_PRICES_AUD: Record<string, number> = {
  "t3a.large": 0.15,
  "t3a.xlarge": 0.3,
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseServerId(data: unknown): GameServerId {
  const serverId =
    typeof data === "object" && data
      ? (data as { serverId?: unknown }).serverId
      : null;
  if (serverId !== "palworld" && serverId !== "dragonwilds") {
    throw new HttpsError("invalid-argument", "A valid game server is required.");
  }
  return serverId;
}

export function parseOptionalServerId(data: unknown): GameServerId {
  return typeof data === "object" && data && "serverId" in data
    ? parseServerId(data)
    : "palworld";
}

export function parseCatalogServerIds(data: unknown): GameServerId[] {
  if (typeof data !== "object" || !data || !("includeDragonwilds" in data)) return ["palworld"];
  const { includeDragonwilds } = data as { includeDragonwilds: unknown };
  if (typeof includeDragonwilds !== "boolean") {
    throw new HttpsError("invalid-argument", "includeDragonwilds must be a boolean.");
  }
  return includeDragonwilds ? ["palworld", "dragonwilds"] : ["palworld"];
}

function parsePort(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return fallback;
  return parsed;
}

function assertAwsConfig(config: GameServerAwsConfig): void {
  if (!config.region.trim()) {
    throw new HttpsError("failed-precondition", "AWS region is not configured.");
  }
  if (!config.instanceId.trim()) {
    throw new HttpsError(
      "failed-precondition",
      `${serverName(config.serverId)} instance ID is not configured.`,
    );
  }
  if (!config.accessKeyId.trim() || !config.secretAccessKey.trim()) {
    throw new HttpsError(
      "failed-precondition",
      "AWS credentials are not configured.",
    );
  }
}

function ec2Client(config: GameServerAwsConfig): EC2Client {
  assertAwsConfig(config);
  return new EC2Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function ssmClient(config: GameServerAwsConfig): SSMClient {
  assertAwsConfig(config);
  return new SSMClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function normalizeState(state: InstanceStateName | string | undefined): GameServerStatus {
  if (
    state === "pending" ||
    state === "running" ||
    state === "stopping" ||
    state === "stopped" ||
    state === "shutting-down" ||
    state === "terminated"
  ) {
    return state;
  }
  if (state === "disabled") return "disabled";
  return "unavailable";
}

function hostForInstance(instance: Instance): string | null {
  return instance.PublicDnsName || instance.PublicIpAddress || null;
}

function connectAddress(host: string | null, gamePort: number): string | null {
  return host ? `${host}:${gamePort}` : null;
}

function connectionAddressForInstance(instance: Instance, gamePort: number): string | null {
  return connectAddress(instance.PublicIpAddress || instance.PublicDnsName || null, gamePort);
}

function monthKeyForTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 2, 1));
  return monthKeyForTimestamp(date.getTime());
}

function monthStartUtc(monthKey: string): number {
  const [year, month] = monthKey.split("-").map((part) => Number(part));
  return Date.UTC(year, month - 1, 1);
}

function costSnapshotFromValue(
  monthKey: string,
  value: Partial<GameServerCostSnapshot> | null,
): GameServerCostSnapshot | null {
  if (!value || typeof value !== "object") return null;
  return {
    monthKey,
    estimatedComputeAud:
      typeof value.estimatedComputeAud === "number"
        ? value.estimatedComputeAud
        : 0,
    runningHours:
      typeof value.runningHours === "number" ? value.runningHours : 0,
    hourlyRateAud:
      typeof value.hourlyRateAud === "number" ? value.hourlyRateAud : null,
    instanceType:
      typeof value.instanceType === "string" && value.instanceType
        ? value.instanceType
        : null,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  };
}

async function readCostSnapshot(
  serverId: GameServerId,
  monthKey: string,
): Promise<GameServerCostSnapshot | null> {
  const snapshot = await admin
    .database()
    .ref(`gameServerCost/${serverId}/monthly/${monthKey}`)
    .get();
  return costSnapshotFromValue(
    monthKey,
    snapshot.val() as Partial<GameServerCostSnapshot> | null,
  );
}

async function updateMonthlyCostSnapshot(input: {
  serverId: GameServerId;
  status: GameServerStatus;
  launchTime: string | null;
  instanceType: string | null;
}): Promise<{
  current: GameServerCostSnapshot | null;
  previous: GameServerCostSnapshot | null;
}> {
  const now = Date.now();
  const currentMonth = monthKeyForTimestamp(now);
  const previousMonth = previousMonthKey(currentMonth);
  const previous = await readCostSnapshot(input.serverId, previousMonth);
  const existingCurrent = await readCostSnapshot(input.serverId, currentMonth);
  if (input.status !== "running" || !input.launchTime || !input.instanceType) {
    return {
      current: existingCurrent,
      previous,
    };
  }

  const hourlyRateAud = INSTANCE_PRICES_AUD[input.instanceType] ?? null;
  if (hourlyRateAud === null) {
    return {
      current: existingCurrent,
      previous,
    };
  }

  const launchedAt = new Date(input.launchTime).getTime();
  const monthStart = monthStartUtc(currentMonth);
  const lastCountedAt =
    existingCurrent && existingCurrent.updatedAt > 0
      ? existingCurrent.updatedAt
      : Math.max(launchedAt, monthStart);
  const countedFrom = Math.max(launchedAt, monthStart, lastCountedAt);
  const deltaHours = Math.max(0, (now - countedFrom) / 1000 / 60 / 60);
  const runningHours = (existingCurrent?.runningHours ?? 0) + deltaHours;
  const current: GameServerCostSnapshot = {
    monthKey: currentMonth,
    estimatedComputeAud: Math.round(runningHours * hourlyRateAud * 100) / 100,
    runningHours: Math.round(runningHours * 100) / 100,
    hourlyRateAud,
    instanceType: input.instanceType,
    updatedAt: now,
  };
  await admin
    .database()
    .ref(`gameServerCost/${input.serverId}/monthly/${currentMonth}`)
    .set(current);
  return { current, previous };
}

function statusMessage(status: GameServerStatus, enabled: boolean, serverId: GameServerId): string {
  if (!enabled || status === "disabled") return `${serverName(serverId)} is disabled by admins.`;
  if (status === "running") return serverId === "palworld" ? "Ready to join." : "Host is running. Game readiness is not verified.";
  if (status === "stopped") return "Offline.";
  if (status === "pending") return "Starting.";
  if (status === "stopping") return "Stopping.";
  if (status === "shutting-down") return "Shutting down.";
  if (status === "terminated") return "Needs admin attention. EC2 instance is terminated.";
  return "Needs admin attention. Status is unavailable.";
}

type AuthorizedGameServerSession = VerifiedAuthenticatedSession & {
  gameServerAccessById: Record<GameServerId, boolean>;
};

export function gameServerGrantRoot(serverId: GameServerId): string {
  return parseServerId({ serverId }) === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess";
}

function assertGameServerScope(session: AuthorizedGameServerSession, serverId: GameServerId): void {
  if (session.gameServerAccessById[serverId] !== true) {
    throw new HttpsError("permission-denied", "Game server whitelist required.");
  }
}

function sessionDisplayName(
  session: VerifiedAuthenticatedSession,
): string | undefined {
  return (
    session.characterName ||
    session.discordDisplayName ||
    session.discordUsername ||
    undefined
  );
}

function systemSession(): VerifiedAdminSession {
  const now = Date.now();
  return {
    discordUserId: "system",
    lodestoneId: "",
    characterName: "System",
    fcRank: null,
    avatarUrl: null,
    roleIds: [],
    isAdmin: true,
    createdAt: now,
    expiresAt: Number.MAX_SAFE_INTEGER,
    lastSeenAt: now,
    sessionHash: "system",
  };
}

function settingsFromValue(serverId: GameServerId, value: Partial<GameServerSettings> | null): GameServerSettings {
  return {
    serverId,
    enabled: serverId === "palworld" ? value?.enabled !== false : value?.enabled === true,
    disabledMessage:
      typeof value?.disabledMessage === "string" && value.disabledMessage
        ? value.disabledMessage
        : null,
    updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : 0,
    updatedBy: typeof value?.updatedBy === "string" && value.updatedBy ? value.updatedBy : null,
  };
}

async function readGameServerSettings(serverId: GameServerId): Promise<GameServerSettings> {
  const snapshot = await admin.database().ref(`gameServerSettings/${serverId}`).get();
  return settingsFromValue(serverId, snapshot.val() as Partial<GameServerSettings> | null);
}

function disabledStatus(settings: GameServerSettings): GameServerStatusResult {
  return {
    ok: true,
    serverId: settings.serverId,
    status: "disabled",
    checkedAt: Date.now(),
    host: null,
    connectAddress: null,
    message: settings.disabledMessage || statusMessage("disabled", false, settings.serverId),
    enabled: false,
    disabledMessage: settings.disabledMessage,
    instanceId: null,
    instanceType: null,
    launchTime: null,
    playerCount: null,
    maxPlayers: null,
    players: [],
    memoryUsedPercent: null,
    diskUsedPercent: null,
    idleSince: null,
    autoStopEligibleAt: null,
    telemetryCheckedAt: null,
    telemetryMessage: null,
    monthlyCost: null,
    previousMonthCost: null,
  };
}

async function trimAuditLog(serverId: GameServerId): Promise<void> {
  const ref = admin.database().ref(`gameServerAuditLog/${serverId}`);
  const snapshot = await ref.get();
  const value = snapshot.val() as Record<string, Partial<GameServerAuditLogEntry>> | null;
  const entries = Object.entries(value ?? {})
    .map(([id, entry]) => ({
      id,
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  const stale = entries.slice(AUDIT_LOG_LIMIT);
  await Promise.all(stale.map((entry) => ref.child(entry.id).remove()));
}

async function writeGameServerAuditLog(input: {
  serverId: GameServerId;
  action: GameServerAuditAction;
  result: GameServerAuditResult;
  statusBefore: GameServerStatus;
  statusAfter?: GameServerStatus;
  message: string;
  session: VerifiedAuthenticatedSession;
  instanceId?: string | null;
}): Promise<void> {
  try {
    const ref = admin.database().ref(`gameServerAuditLog/${input.serverId}`).push();
    const entry: Omit<GameServerAuditLogEntry, "id"> = {
      serverId: input.serverId,
      action: input.action,
      result: input.result,
      statusBefore: input.statusBefore,
      ...(input.statusAfter ? { statusAfter: input.statusAfter } : {}),
      message: input.message,
      requestedByDiscordUserId: input.session.discordUserId,
      ...(sessionDisplayName(input.session)
        ? { requestedByDisplayName: sessionDisplayName(input.session) }
        : {}),
      isAdmin: input.session.isAdmin === true,
      ...(input.instanceId ? { instanceId: input.instanceId } : {}),
      createdAt: Date.now(),
    };
    await ref.set(entry);
    await trimAuditLog(input.serverId);
  } catch (error) {
    console.error("Failed to write game server audit log", error);
  }
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function palworldPlayerFromValue(value: unknown): PalworldPlayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return {
    name: safeString(input.name),
    accountName: safeString(input.accountName),
    playerId: safeString(input.playerId),
    userId: safeString(input.userId),
    ping: safeNumber(input.ping),
    level: safeNumber(input.level),
  };
}

function parsePalworldPlayersResponse(text: string): PalworldPlayer[] | null {
  try {
    const parsed = JSON.parse(text) as { players?: unknown };
    if (!Array.isArray(parsed.players)) return null;
    const players = parsed.players.map((player) => palworldPlayerFromValue(player));
    // Dropping malformed rows could turn an unknown population into false zero.
    return players.every((player): player is PalworldPlayer => player !== null)
      ? players
      : null;
  } catch {
    return null;
  }
}

function isSsmInvocationPendingError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "InvocationDoesNotExist" ||
      error.message.includes("InvocationDoesNotExist"))
  );
}

async function queryPalworldPlayersViaSsm(config: GameServerAwsConfig): Promise<{
  playerCount: number | null;
  maxPlayers: number | null;
  players: PalworldPlayer[];
  message: string | null;
}> {
  if (!config.adminPassword.trim()) {
    return {
      playerCount: null,
      maxPlayers: null,
      players: [],
      message: "Player count unavailable. Palworld admin password is not configured.",
    };
  }

  const client = ssmClient(config);
  const password = shellSingleQuote(config.adminPassword);
  const command = [
    `PALWORLD_ADMIN_PASSWORD=${password}`,
    "docker exec palworld-server curl -sS --fail --max-time 5 " +
      '"http://127.0.0.1:8212/v1/api/players" ' +
      '-u "admin:${PALWORLD_ADMIN_PASSWORD}"',
  ].join("\n");

  try {
    const sent = await client.send(
      new SendCommandCommand({
        InstanceIds: [config.instanceId],
        DocumentName: "AWS-RunShellScript",
        TimeoutSeconds: SSM_COMMAND_TIMEOUT_SECONDS,
        Parameters: {
          commands: [command],
        },
      }),
    );
    const commandId = sent.Command?.CommandId;
    if (!commandId) {
      return {
        playerCount: null,
        maxPlayers: null,
        players: [],
        message: "Player count unavailable. SSM did not return a command id.",
      };
    }

    for (let attempt = 0; attempt < SSM_COMMAND_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await sleep(SSM_COMMAND_POLL_DELAY_MS);
      let invocation;
      try {
        invocation = await client.send(
          new GetCommandInvocationCommand({
            CommandId: commandId,
            InstanceId: config.instanceId,
          }),
        );
      } catch (error) {
        if (isSsmInvocationPendingError(error)) continue;
        throw error;
      }
      if (
        invocation.Status === "Pending" ||
        invocation.Status === "InProgress" ||
        invocation.Status === "Delayed"
      ) {
        continue;
      }
      if (invocation.Status !== "Success") {
        console.error("Palworld REST SSM command failed", {
          status: invocation.Status,
          statusDetails: invocation.StatusDetails,
          stderr: invocation.StandardErrorContent?.slice(0, 500),
        });
        return {
          playerCount: null,
          maxPlayers: null,
          players: [],
          message: "Player count unavailable. SSM command did not complete successfully.",
        };
      }

      const players = parsePalworldPlayersResponse(
        invocation.StandardOutputContent ?? "",
      );
      if (!players) {
        return {
          playerCount: null,
          maxPlayers: null,
          players: [],
          message: "Player count unavailable. Palworld REST response could not be parsed.",
        };
      }
      return {
        playerCount: players.length,
        maxPlayers: null,
        players,
        message: null,
      };
    }

    return {
      playerCount: null,
      maxPlayers: null,
      players: [],
      message: "Player count unavailable. SSM command timed out.",
    };
  } catch (error) {
    console.error("Failed to query Palworld players via SSM", error);
    return {
      playerCount: null,
      maxPlayers: null,
      players: [],
      message: "Player count unavailable. SSM player query failed.",
    };
  }
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hashHex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function amzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function signingKey(secretAccessKey: string, date: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secretAccessKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "monitoring");
  return hmac(serviceKey, "aws4_request");
}

async function cloudWatchQuery(
  config: GameServerAwsConfig,
  params: URLSearchParams,
): Promise<string> {
  assertAwsConfig(config);
  const body = params.toString();
  const now = new Date();
  const currentAmzDate = amzDate(now);
  const currentDateStamp = dateStamp(now);
  const host = `monitoring.${config.region}.amazonaws.com`;
  const payloadHash = hashHex(body);
  const canonicalHeaders =
    `content-type:application/x-www-form-urlencoded; charset=utf-8\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${currentAmzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${currentDateStamp}/${config.region}/monitoring/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    currentAmzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(config.secretAccessKey, currentDateStamp, config.region),
  )
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}/`, {
    method: "POST",
    signal: AbortSignal.timeout(5_000),
    headers: {
      Authorization: authorization,
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": currentAmzDate,
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`CloudWatch request failed with ${response.status}: ${text.slice(0, 240)}`);
  }
  return text;
}

function escapeCloudWatchSearch(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseCloudWatchValues(xml: string): number[] {
  const values: number[] = [];
  const pattern = /<Values>\s*((?:<member>[-.\d]+<\/member>\s*)+)<\/Values>/g;
  let match = pattern.exec(xml);
  while (match) {
    const member = /<member>([-.\d]+)<\/member>/.exec(match[1]);
    if (member) {
      const value = Number(member[1]);
      if (Number.isFinite(value)) values.push(value);
    }
    match = pattern.exec(xml);
  }
  return values;
}

async function metricPercent(
  config: GameServerAwsConfig,
  metricName: string,
  mode: "average" | "maximum",
): Promise<number | null> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 20 * 60 * 1000);
  const expression =
    `SEARCH('{${escapeCloudWatchSearch(config.cloudWatchNamespace)},InstanceId} ` +
    `MetricName="${escapeCloudWatchSearch(metricName)}" ` +
    `InstanceId="${escapeCloudWatchSearch(config.instanceId)}"', ` +
    `'${mode === "maximum" ? "Maximum" : "Average"}', 60)`;
  const params = new URLSearchParams({
    Action: "GetMetricData",
    Version: "2010-08-01",
    StartTime: startTime.toISOString(),
    EndTime: endTime.toISOString(),
    ScanBy: "TimestampDescending",
    "MetricDataQueries.member.1.Id": "q1",
    "MetricDataQueries.member.1.Expression": expression,
    "MetricDataQueries.member.1.ReturnData": "true",
  });
  const xml = await cloudWatchQuery(config, params);
  const values = parseCloudWatchValues(xml);
  if (!values.length) return null;
  return mode === "maximum"
    ? Math.max(...values)
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function readCloudWatchTelemetry(config: GameServerAwsConfig): Promise<{
  memoryUsedPercent: number | null;
  diskUsedPercent: number | null;
  message: string | null;
}> {
  try {
    const memoryUsedPercent = await metricPercent(config, "mem_used_percent", "average");
    return {
      memoryUsedPercent:
        memoryUsedPercent === null ? null : Math.round(memoryUsedPercent * 10) / 10,
      diskUsedPercent: null,
      message:
        memoryUsedPercent === null
          ? "RAM metric is unavailable from CloudWatch."
          : null,
    };
  } catch (error) {
    console.error("Failed to read game server CloudWatch telemetry", { serverId: config.serverId, error });
    return {
      memoryUsedPercent: null,
      diskUsedPercent: null,
      message: "RAM metric is unavailable from CloudWatch.",
    };
  }
}

async function readGameServerTelemetry(
  config: GameServerAwsConfig,
  host: string | null,
  status: GameServerStatus,
): Promise<PalworldTelemetry> {
  const checkedAt = Date.now();
  if (status !== "running" || !host) {
    return {
      playerCount: null,
      maxPlayers: null,
      players: [],
      memoryUsedPercent: null,
      diskUsedPercent: null,
      telemetryCheckedAt: checkedAt,
      telemetryMessage: null,
    };
  }

  // No verified Dragonwilds player source yet. Never query Palworld's API or
  // manufacture an empty snapshot; unknown membership must not enable auto-stop.
  if (config.serverId === "dragonwilds") {
    const cloudWatch = await readCloudWatchTelemetry(config);
    return {
      playerCount: null,
      maxPlayers: config.capacity ?? null,
      players: [],
      memoryUsedPercent: cloudWatch.memoryUsedPercent,
      diskUsedPercent: cloudWatch.diskUsedPercent,
      telemetryCheckedAt: checkedAt,
      telemetryMessage: [
        "Dragonwilds player telemetry is not configured. Automatic idle shutdown is inactive.",
        cloudWatch.message,
      ].filter(Boolean).join(" "),
    };
  }

  const [players, cloudWatch] = await Promise.all([
    queryPalworldPlayersViaSsm(config),
    readCloudWatchTelemetry(config),
  ]);
  return {
    playerCount: players.playerCount,
    maxPlayers: players.maxPlayers,
    players: players.players,
    memoryUsedPercent: cloudWatch.memoryUsedPercent,
    diskUsedPercent: cloudWatch.diskUsedPercent,
    telemetryCheckedAt: checkedAt,
    telemetryMessage: [players.message, cloudWatch.message].filter(Boolean).join(" ") || null,
  };
}

async function readIdleState(serverId: GameServerId): Promise<GameServerIdleState> {
  const snapshot = await admin.database().ref(`gameServerIdleState/${serverId}`).get();
  const value = snapshot.val() as Partial<GameServerIdleState> | null;
  return {
    idleSince: typeof value?.idleSince === "number" ? value.idleSince : null,
    autoStopEligibleAt:
      typeof value?.autoStopEligibleAt === "number" ? value.autoStopEligibleAt : null,
    updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : 0,
  };
}

async function writeIdleState(serverId: GameServerId, state: GameServerIdleState): Promise<void> {
  await admin.database().ref(`gameServerIdleState/${serverId}`).set(state);
}

async function readGameServerInstance(config: GameServerAwsConfig): Promise<Instance> {
  assertAwsConfig(config);
  let instance: Instance | undefined;
  try {
    const result = await ec2Client(config).send(
      new DescribeInstancesCommand({
        InstanceIds: [config.instanceId],
      }),
    );
    instance = result.Reservations?.flatMap((reservation) =>
      reservation.Instances ?? [],
    )[0];
  } catch (error) {
    console.error(`Failed to describe ${serverName(config.serverId)} EC2 instance`, error);
    throw new HttpsError(
      "unavailable",
      `Could not read ${serverName(config.serverId)} EC2 status.`,
    );
  }

  if (!instance) {
    throw new HttpsError("not-found", `${serverName(config.serverId)} EC2 instance was not found.`);
  }
  return instance;
}

async function describeGameServerInstance(
  config: GameServerAwsConfig,
  options: { includeTelemetry: boolean } = { includeTelemetry: true },
): Promise<GameServerStatusResult> {
  const instance = await readGameServerInstance(config);

  const status = normalizeState(instance.State?.Name);
  const host = hostForInstance(instance);
  const instanceType = instance.InstanceType ?? null;
  const launchTime = instance.LaunchTime?.toISOString() ?? null;
  const telemetry = options.includeTelemetry
    ? await readGameServerTelemetry(config, host, status)
    : {
        playerCount: null,
        maxPlayers: null,
        players: [],
        memoryUsedPercent: null,
        diskUsedPercent: null,
        telemetryCheckedAt: Date.now(),
        telemetryMessage: null,
      };
  const idleState = config.serverId === "palworld"
    ? await readIdleState(config.serverId)
    : { idleSince: null, autoStopEligibleAt: null };
  const cost = await updateMonthlyCostSnapshot({
    serverId: config.serverId,
    status,
    launchTime,
    instanceType,
  });
  return {
    ok: true,
    serverId: config.serverId,
    status,
    checkedAt: Date.now(),
    host,
    connectAddress: status === "running" ? connectionAddressForInstance(instance, config.gamePort) : null,
    ...(config.serverId === "dragonwilds" ? { worldName: config.worldName || null } : {}),
    message: statusMessage(status, true, config.serverId),
    enabled: true,
    disabledMessage: null,
    instanceId: instance.InstanceId ?? config.instanceId,
    instanceType,
    launchTime,
    playerCount: telemetry.playerCount,
    maxPlayers: telemetry.maxPlayers,
    players: telemetry.players,
    memoryUsedPercent: telemetry.memoryUsedPercent,
    diskUsedPercent: telemetry.diskUsedPercent,
    idleSince: idleState.idleSince,
    autoStopEligibleAt: idleState.autoStopEligibleAt,
    telemetryCheckedAt: telemetry.telemetryCheckedAt,
    telemetryMessage: telemetry.telemetryMessage,
    monthlyCost: cost.current,
    previousMonthCost: cost.previous,
  };
}

async function statusForEnabledServer(
  serverId: GameServerId,
  resolveConfig: GameServerConfigResolver,
  options?: { includeTelemetry: boolean },
): Promise<GameServerStatusResult> {
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) return disabledStatus(settings);
  const config = resolveServerConfig(serverId, resolveConfig);
  return describeGameServerInstance(config, options);
}

function parseDiscordId(value: unknown): string {
  const discordUserId = cleanText(value);
  if (!DISCORD_ID_PATTERN.test(discordUserId)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid Discord user ID is required.",
    );
  }
  return discordUserId;
}

function parseDisplayName(value: unknown): string {
  const displayName = cleanText(value).slice(0, MAX_DISPLAY_NAME_LENGTH);
  if (!displayName) {
    throw new HttpsError("invalid-argument", "Display name is required.");
  }
  return displayName;
}

function parseNotes(value: unknown): string | null {
  const notes = cleanText(value).slice(0, MAX_NOTES_LENGTH);
  return notes || null;
}

function parseEnabled(value: unknown): boolean {
  return value === undefined ? true : value === true;
}

function accessEntryFromValue(
  discordUserId: string,
  entry: Partial<GameServerAccessEntry> | null,
): GameServerAccessEntry | null {
  if (!entry || typeof entry !== "object") return null;
  if (entry.discordUserId && entry.discordUserId !== discordUserId) return null;
  const expiresAt =
    entry.expiresAt === null || entry.expiresAt === undefined
      ? null
      : typeof entry.expiresAt === "number" &&
          Number.isFinite(entry.expiresAt) &&
          entry.expiresAt > 0
        ? entry.expiresAt
        : undefined;
  if (expiresAt === undefined) return null;
  return {
    discordUserId,
    displayName:
      typeof entry.displayName === "string" ? entry.displayName : discordUserId,
    enabled: entry.enabled === true,
    expiresAt,
    notes: typeof entry.notes === "string" && entry.notes ? entry.notes : null,
    addedBy: typeof entry.addedBy === "string" ? entry.addedBy : "",
    addedAt: typeof entry.addedAt === "number" ? entry.addedAt : 0,
    updatedBy:
      typeof entry.updatedBy === "string" ? entry.updatedBy : "",
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
  };
}

export function isGameServerAccessEntryActive(
  entry: GameServerAccessEntry | null,
  now = Date.now(),
): boolean {
  return Boolean(
    entry?.enabled &&
      (entry.expiresAt === null || entry.expiresAt > now),
  );
}

async function readAccessEntry(
  discordUserId: string,
  serverId: GameServerId,
): Promise<GameServerAccessEntry | null> {
  const snapshot = await admin
    .database()
    .ref(`${gameServerGrantRoot(serverId)}/${discordUserId}`)
    .get();
  const entry = snapshot.val() as Partial<GameServerAccessEntry> | null;
  return accessEntryFromValue(discordUserId, entry);
}

export async function requireGameServerAccess(
  session: VerifiedAuthenticatedSession,
  serverId: GameServerId = "palworld",
): Promise<AuthorizedGameServerSession> {
  gameServerGrantRoot(serverId);
  const gameServerAccessById = { palworld: false, dragonwilds: false, [serverId]: true };
  if (session.isAdmin === true) {
    return { ...session, gameServerAccessById };
  }

  const entry = await readAccessEntry(session.discordUserId, serverId);
  if (isGameServerAccessEntryActive(entry)) {
    return { ...session, gameServerAccessById };
  }

  throw new HttpsError(
    "permission-denied",
    "Game server whitelist required.",
  );
}

export async function getGameServerAccessStatusForSession(
  session: VerifiedAuthenticatedSession,
  serverId: GameServerId = "palworld",
): Promise<{
  ok: true;
  canUseGameServers: boolean;
  isAdmin: boolean;
  expiresAt: number | null;
}> {
  return getGameServerAccessStatusForIdentity(
    session.discordUserId,
    session.isAdmin === true,
    serverId,
  );
}

export async function getGameServerAccessStatusForIdentity(
  discordUserId: string,
  isAdmin: boolean,
  serverId: GameServerId = "palworld",
): Promise<{
  ok: true;
  canUseGameServers: boolean;
  isAdmin: boolean;
  expiresAt: number | null;
}> {
  gameServerGrantRoot(serverId);
  if (isAdmin) {
    return {
      ok: true,
      canUseGameServers: true,
      isAdmin: true,
      expiresAt: null,
    };
  }

  const entry = await readAccessEntry(discordUserId, serverId);
  return {
    ok: true,
    canUseGameServers: isGameServerAccessEntryActive(entry),
    isAdmin: false,
    expiresAt: entry?.expiresAt ?? null,
  };
}

export async function listGameServersForSession(
  _session: AuthorizedGameServerSession,
  resolveConfig: GameServerConfigResolver,
  serverIds: GameServerId[],
) {
  return {
    ok: true,
    servers: await Promise.all(GAME_SERVERS.filter((server) => serverIds.includes(server.id) && _session.gameServerAccessById[server.id]).map(async (server) => {
      try {
        const status = await statusForEnabledServer(server.id, resolveConfig, { includeTelemetry: false });
        return {
          ...server,
          status: status.status,
          host: status.host,
          connectAddress: status.connectAddress,
          enabled: status.enabled,
          disabledMessage: status.disabledMessage,
          controlsAvailable: status.enabled && (status.status === "running" || status.status === "stopped"),
          phase: "live",
        };
      } catch (error) {
        console.error("Failed to read game server catalog entry", { serverId: server.id, error });
        return {
          ...server,
          status: "unavailable" as const,
          host: null,
          connectAddress: null,
          enabled: false,
          disabledMessage: null,
          controlsAvailable: false,
          phase: "live",
        };
      }
    })),
  };
}

export async function getGameServerStatusForSession(
  data: unknown,
  _session: AuthorizedGameServerSession,
  resolveConfig: GameServerConfigResolver,
) {
  const serverId = parseServerId(data);
  assertGameServerScope(_session, serverId);
  const server = GAME_SERVERS.find((item) => item.id === serverId);
  if (!server) {
    throw new HttpsError("not-found", "Game server was not found.");
  }
  return statusForEnabledServer(serverId, resolveConfig, { includeTelemetry: false });
}

export async function getGameServerTelemetryForSession(
  data: unknown,
  _session: AuthorizedGameServerSession,
  resolveConfig: GameServerConfigResolver,
): Promise<GameServerTelemetryResult> {
  void _session;
  const serverId = parseServerId(data);
  assertGameServerScope(_session, serverId);
  const server = GAME_SERVERS.find((item) => item.id === serverId);
  if (!server) {
    throw new HttpsError("not-found", "Game server was not found.");
  }
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) {
    return {
      ok: true,
      serverId,
      playerCount: null,
      maxPlayers: null,
      players: [],
      memoryUsedPercent: null,
      diskUsedPercent: null,
      telemetryCheckedAt: Date.now(),
      telemetryMessage: null,
    };
  }

  const config = resolveServerConfig(serverId, resolveConfig);
  const instance = await readGameServerInstance(config);
  const status = normalizeState(instance.State?.Name);
  const telemetry = await readGameServerTelemetry(
    config,
    hostForInstance(instance),
    status,
  );
  return { ok: true, serverId, ...telemetry };
}

async function assertServerEnabled(serverId: GameServerId): Promise<void> {
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) {
    throw new HttpsError(
      "failed-precondition",
      settings.disabledMessage || `${serverName(serverId)} is disabled by admins.`,
    );
  }
}

export async function startGameServerForSession(
  data: unknown,
  session: AuthorizedGameServerSession,
  resolveConfig: GameServerConfigResolver,
) {
  const serverId = parseServerId(data);
  assertGameServerScope(session, serverId);
  await assertServerEnabled(serverId);
  const config = resolveServerConfig(serverId, resolveConfig);
  let status: GameServerStatusResult;
  try {
    status = await describeGameServerInstance(config, { includeTelemetry: false });
  } catch (error) {
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "failed",
      statusBefore: "unavailable",
      message: error instanceof Error ? error.message : `Failed to read ${serverName(config.serverId)} status before start.`,
      session,
      instanceId: config.instanceId,
    });
    throw error;
  }

  if (status.status === "running" || status.status === "pending") {
    const message =
      status.status === "running"
        ? (serverId === "palworld" ? "Palworld is already ready to join." : "Dragonwilds host is already running. Game readiness is not verified.")
        : `${serverName(config.serverId)} is already starting.`;
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "noop",
      statusBefore: status.status,
      statusAfter: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    return {
      ...status,
      ok: true,
      message,
    };
  }
  if (status.status === "stopping") {
    const message = `${serverName(config.serverId)} is stopping. Refresh and try again once it is stopped.`;
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }
  if (status.status === "terminated" || status.status === "unavailable") {
    const message = `${serverName(config.serverId)} cannot be started from its current state.`;
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }
  if (status.status !== "stopped") {
    const message = `${serverName(config.serverId)} is not ready to start.`;
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }

  try {
    await ec2Client(config).send(
      new StartInstancesCommand({ InstanceIds: [config.instanceId] }),
    );
  } catch (error) {
    const message = `${serverName(config.serverId)} EC2 instance start request failed.`;
    console.error(message, error);
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "failed",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("unavailable", message);
  }
  await writeIdleState(serverId, {
    idleSince: null,
    autoStopEligibleAt: null,
    updatedAt: Date.now(),
  });
  await writeGameServerAuditLog({
    serverId,
    action: "start",
    result: "requested",
    statusBefore: status.status,
    statusAfter: "pending",
    message: `${serverName(config.serverId)} start requested.`,
    session,
    instanceId: config.instanceId,
  });
  return {
    ...status,
    ok: true,
    serverId,
    status: "pending",
    checkedAt: Date.now(),
    host: null,
    connectAddress: null,
    message: `${serverName(config.serverId)} start requested.`,
    instanceId: config.instanceId,
  };
}

export async function stopGameServerForSession(
  data: unknown,
  session: AuthorizedGameServerSession,
  resolveConfig: GameServerConfigResolver,
) {
  const serverId = parseServerId(data);
  assertGameServerScope(session, serverId);
  await assertServerEnabled(serverId);
  const config = resolveServerConfig(serverId, resolveConfig);
  let status: GameServerStatusResult;
  try {
    status = await describeGameServerInstance(config, { includeTelemetry: serverId === "palworld" });
  } catch (error) {
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "failed",
      statusBefore: "unavailable",
      message: error instanceof Error ? error.message : `Failed to read ${serverName(config.serverId)} status before stop.`,
      session,
      instanceId: config.instanceId,
    });
    throw error;
  }

  if (status.status === "stopped" || status.status === "stopping") {
    const message =
      status.status === "stopped"
        ? `${serverName(config.serverId)} is already offline.`
        : `${serverName(config.serverId)} is already stopping.`;
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "noop",
      statusBefore: status.status,
      statusAfter: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    return {
      ...status,
      ok: true,
      message,
    };
  }
  if (status.status === "pending") {
    const message = `${serverName(config.serverId)} is starting. Refresh and try again once it is running.`;
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }
  if (status.status === "terminated" || status.status === "unavailable") {
    const message = `${serverName(config.serverId)} cannot be stopped from its current state.`;
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }
  if (status.status !== "running") {
    const message = `${serverName(config.serverId)} is not ready to stop.`;
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "blocked",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("failed-precondition", message);
  }

  try {
    await ec2Client(config).send(
      new StopInstancesCommand({ InstanceIds: [config.instanceId] }),
    );
  } catch (error) {
    const message = `${serverName(config.serverId)} EC2 instance stop request failed.`;
    console.error(message, error);
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "failed",
      statusBefore: status.status,
      message,
      session,
      instanceId: status.instanceId,
    });
    throw new HttpsError("unavailable", message);
  }
  await writeIdleState(serverId, {
    idleSince: null,
    autoStopEligibleAt: null,
    updatedAt: Date.now(),
  });
  await writeGameServerAuditLog({
    serverId,
    action: "stop",
    result: "requested",
    statusBefore: status.status,
    statusAfter: "stopping",
    message: `${serverName(config.serverId)} stop requested.`,
    session,
    instanceId: config.instanceId,
  });
  return {
    ...status,
    ok: true,
    serverId,
    status: "stopping",
    checkedAt: Date.now(),
    message: `${serverName(config.serverId)} stop requested.`,
    instanceId: config.instanceId,
  };
}

export async function listGameServerAccessForAdmin(data?: unknown): Promise<{
  ok: true;
  entries: GameServerAccessEntry[];
}> {
  const serverId = parseOptionalServerId(data);
  const snapshot = await admin.database().ref(gameServerGrantRoot(serverId)).get();
  const value = snapshot.val() as Record<string, GameServerAccessEntry> | null;
  const entries = Object.entries(value ?? {})
    .map(([discordUserId, entry]) => accessEntryFromValue(discordUserId, entry))
    .filter((entry): entry is GameServerAccessEntry => entry !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, entries };
}

export async function listGameServerAccessCandidatesForAdmin(data?: unknown): Promise<{
  ok: true;
  candidates: GameServerAccessCandidate[];
  legacyEntries: GameServerAccessEntry[];
}> {
  const serverId = parseOptionalServerId(data);
  const [membersSnapshot, linksSnapshot, accessSnapshot] = await Promise.all([
    admin.database().ref("members").get(),
    admin.database().ref("discordLinksByLodestone").get(),
    admin.database().ref(gameServerGrantRoot(serverId)).get(),
  ]);
  const members = (membersSnapshot.val() ?? {}) as Record<
    string,
    {
      name?: unknown;
      fcRank?: unknown;
      avatarUrl?: unknown;
    }
  >;
  const links = (linksSnapshot.val() ?? {}) as Record<string, unknown>;
  const accessValue = (accessSnapshot.val() ?? {}) as Record<
    string,
    Partial<GameServerAccessEntry>
  >;
  const accessEntries = new Map(
    Object.entries(accessValue)
      .map(([discordUserId, entry]) => [
        discordUserId,
        accessEntryFromValue(discordUserId, entry),
      ] as const)
      .filter(
        (item): item is readonly [string, GameServerAccessEntry] =>
          item[1] !== null,
      ),
  );
  const linkedDiscordIds = new Set<string>();
  const candidates = Object.entries(members)
    .flatMap(([lodestoneId, member]): GameServerAccessCandidate[] => {
      const discordUserId = cleanText(links[lodestoneId]);
      if (!DISCORD_ID_PATTERN.test(discordUserId)) return [];
      const characterName = cleanText(member.name);
      if (!characterName) return [];
      const fcRank = cleanText(member.fcRank) || null;
      const accessEntry = accessEntries.get(discordUserId) ?? null;
      linkedDiscordIds.add(discordUserId);
      return [{
        lodestoneId,
        discordUserId,
        displayName: accessEntry?.displayName || characterName,
        characterName,
        fcRank,
        avatarUrl: cleanText(member.avatarUrl) || null,
        accessEntry,
        implicitAccess: fcRank === "Boss" || fcRank === "Underpaw",
      }];
    })
    .sort((a, b) => a.characterName.localeCompare(b.characterName));
  const legacyEntries = [...accessEntries.values()]
    .filter((entry) => !linkedDiscordIds.has(entry.discordUserId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, candidates, legacyEntries };
}

export async function upsertGameServerAccessForAdmin(
  data: unknown,
  adminSession: VerifiedAdminSession,
): Promise<{ ok: true; entry: GameServerAccessEntry }> {
  const serverId = parseOptionalServerId(data);
  const input = typeof data === "object" && data ? data as Record<string, unknown> : {};
  const discordUserId = parseDiscordId(input.discordUserId);
  const displayName = parseDisplayName(input.displayName);
  const notes = parseNotes(input.notes);
  const enabled = parseEnabled(input.enabled);
  const expiresAt =
    input.expiresAt === null || input.expiresAt === undefined
      ? null
      : typeof input.expiresAt === "number" &&
          Number.isInteger(input.expiresAt) &&
          input.expiresAt > 0
        ? input.expiresAt
        : (() => {
            throw new HttpsError(
              "invalid-argument",
              "Expiry must be a timestamp or null.",
            );
          })();
  if (enabled && expiresAt !== null && expiresAt <= Date.now()) {
    throw new HttpsError(
      "invalid-argument",
      "Enabled access must expire in the future.",
    );
  }
  const ref = admin.database().ref(`${gameServerGrantRoot(serverId)}/${discordUserId}`);
  const existing = (await ref.get()).val() as Partial<GameServerAccessEntry> | null;
  const now = Date.now();
  const entry: GameServerAccessEntry = {
    discordUserId,
    displayName,
    enabled,
    expiresAt,
    notes,
    addedBy:
      typeof existing?.addedBy === "string" && existing.addedBy
        ? existing.addedBy
        : adminSession.discordUserId,
    addedAt:
      typeof existing?.addedAt === "number" && existing.addedAt > 0
        ? existing.addedAt
        : now,
    updatedBy: adminSession.discordUserId,
    updatedAt: now,
  };
  await ref.set(entry);
  return { ok: true, entry };
}

export async function deleteGameServerAccessForAdmin(
  data: unknown,
): Promise<{ ok: true }> {
  const serverId = parseOptionalServerId(data);
  const input = typeof data === "object" && data ? data as Record<string, unknown> : {};
  const discordUserId = parseDiscordId(input.discordUserId);
  await admin.database().ref(`${gameServerGrantRoot(serverId)}/${discordUserId}`).remove();
  return { ok: true };
}

function auditEntryFromValue(
  id: string,
  serverId: GameServerId,
  entry: Partial<GameServerAuditLogEntry>,
): GameServerAuditLogEntry {
  const action: GameServerAuditAction =
    entry.action === "stop" ||
    entry.action === "auto-stop" ||
    entry.action === "settings"
      ? entry.action
      : "start";
  const result: GameServerAuditResult =
    entry.result === "noop" ||
    entry.result === "blocked" ||
    entry.result === "failed"
      ? entry.result
      : "requested";
  return {
    id,
    serverId,
    action,
    result,
    statusBefore: normalizeState(entry.statusBefore),
    ...(entry.statusAfter ? { statusAfter: normalizeState(entry.statusAfter) } : {}),
    message: typeof entry.message === "string" ? entry.message : "",
    requestedByDiscordUserId:
      typeof entry.requestedByDiscordUserId === "string"
        ? entry.requestedByDiscordUserId
        : "",
    ...(typeof entry.requestedByDisplayName === "string" &&
    entry.requestedByDisplayName
      ? { requestedByDisplayName: entry.requestedByDisplayName }
      : {}),
    isAdmin: entry.isAdmin === true,
    ...(typeof entry.instanceId === "string" && entry.instanceId
      ? { instanceId: entry.instanceId }
      : {}),
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : 0,
  };
}

async function listGameServerAuditLog(
  serverId: GameServerId,
  limit: number,
): Promise<GameServerAuditLogEntry[]> {
  const snapshot = await admin.database().ref(`gameServerAuditLog/${serverId}`).get();
  const value = snapshot.val() as Record<string, Partial<GameServerAuditLogEntry>> | null;
  return Object.entries(value ?? {})
    .map(([id, entry]) => auditEntryFromValue(id, serverId, entry))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function listGameServerAuditLogForAdmin(
  data: unknown,
): Promise<{ ok: true; entries: GameServerAuditLogEntry[] }> {
  const serverId = parseOptionalServerId(data);
  return { ok: true, entries: await listGameServerAuditLog(serverId, AUDIT_LOG_ADMIN_LIMIT) };
}

export async function listGameServerAuditLogForSession(
  data: unknown,
  _session: AuthorizedGameServerSession,
): Promise<{ ok: true; entries: GameServerAuditLogEntry[] }> {
  void _session;
  const serverId = parseOptionalServerId(data);
  assertGameServerScope(_session, serverId);
  return { ok: true, entries: await listGameServerAuditLog(serverId, AUDIT_LOG_USER_LIMIT) };
}

export async function getGameServerSettingsForAdmin(data?: unknown): Promise<{
  ok: true;
  settings: GameServerSettings;
}> {
  return { ok: true, settings: await readGameServerSettings(parseOptionalServerId(data)) };
}

export async function updateGameServerSettingsForAdmin(
  data: unknown,
  adminSession: VerifiedAdminSession,
): Promise<{ ok: true; settings: GameServerSettings }> {
  const input = typeof data === "object" && data ? data as Record<string, unknown> : {};
  const serverId = parseServerId(input);
  const existing = await readGameServerSettings(serverId);
  const enabled = input.enabled === true;
  const disabledMessage = cleanText(input.disabledMessage)
    .slice(0, MAX_DISABLED_MESSAGE_LENGTH) || null;
  const settings: GameServerSettings = {
    serverId,
    enabled,
    disabledMessage,
    updatedAt: Date.now(),
    updatedBy: adminSession.discordUserId,
  };
  await admin.database().ref(`gameServerSettings/${serverId}`).set(settings);
  await writeGameServerAuditLog({
    serverId,
    action: "settings",
    result: "requested",
    statusBefore: existing.enabled ? "running" : "disabled",
    statusAfter: enabled ? "unknown" : "disabled",
    message: `${serverName(serverId)} ${enabled ? "enabled" : "disabled"} by admin.`,
    session: adminSession,
  });
  return { ok: true, settings };
}

export async function runAutoStopIdleGameServers(
  resolveConfig: GameServerConfigResolver,
) {
  const results = await Promise.all(GAME_SERVERS.map(async ({ id: serverId }) => {
    try {
      return { serverId, ...await autoStopIdleServer(serverId, resolveConfig) };
    } catch (error) {
      console.error("Game server idle check failed", { serverId, error });
      return { serverId, ok: false, skipped: true, stopped: false, reason: "Idle check failed." };
    }
  }));
  return { ok: results.every((result) => result.ok), results };
}

async function autoStopIdleServer(
  serverId: GameServerId,
  resolveConfig: GameServerConfigResolver,
): Promise<{ ok: true; skipped: boolean; stopped: boolean; reason: string }> {
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) {
    return { ok: true, skipped: true, stopped: false, reason: `${serverName(serverId)} disabled.` };
  }
  const config = resolveServerConfig(serverId, resolveConfig);
  if (!config.instanceId.trim()) {
    return { ok: true, skipped: true, stopped: false, reason: `${serverName(serverId)} is not configured.` };
  }
  // Deliberately gate by game, not by a configurable capacity or an empty list.
  // A verified player adapter and lifecycle contract are required to remove this.
  if (serverId === "dragonwilds") {
    const idle = await readIdleState(serverId);
    if (idle.idleSince !== null || idle.autoStopEligibleAt !== null) {
      await writeIdleState(serverId, { idleSince: null, autoStopEligibleAt: null, updatedAt: Date.now() });
    }
    return { ok: true, skipped: true, stopped: false, reason: "Dragonwilds automatic idle shutdown is inactive: player telemetry is unverified." };
  }

  const status = await describeGameServerInstance(config, { includeTelemetry: true });
  if (status.status !== "running") {
    await writeIdleState(serverId, {
      idleSince: null,
      autoStopEligibleAt: null,
      updatedAt: Date.now(),
    });
    return { ok: true, skipped: true, stopped: false, reason: "Palworld is not running." };
  }
  if (status.playerCount === null) {
    await writeIdleState(serverId, {
      idleSince: null,
      autoStopEligibleAt: null,
      updatedAt: Date.now(),
    });
    return { ok: true, skipped: true, stopped: false, reason: "Player count unavailable." };
  }
  if (status.playerCount > 0) {
    await writeIdleState(serverId, {
      idleSince: null,
      autoStopEligibleAt: null,
      updatedAt: Date.now(),
    });
    return { ok: true, skipped: true, stopped: false, reason: "Players online." };
  }

  const now = Date.now();
  const previousIdleState = await readIdleState(serverId);
  const idleSince = previousIdleState.idleSince ?? now;
  const autoStopEligibleAt = idleSince + IDLE_AUTO_STOP_MS;
  await writeIdleState(serverId, { idleSince, autoStopEligibleAt, updatedAt: now });
  if (now < autoStopEligibleAt) {
    return { ok: true, skipped: true, stopped: false, reason: "Idle threshold not reached." };
  }

  try {
    await ec2Client(config).send(
      new StopInstancesCommand({ InstanceIds: [config.instanceId] }),
    );
  } catch (error) {
    console.error("Palworld auto-stop failed", error);
    await writeGameServerAuditLog({
      serverId,
      action: "auto-stop",
      result: "failed",
      statusBefore: status.status,
      message: "Palworld auto-stop failed.",
      session: systemSession(),
      instanceId: config.instanceId,
    });
    throw new HttpsError("unavailable", "Palworld auto-stop failed.");
  }

  await writeIdleState(serverId, {
    idleSince: null,
    autoStopEligibleAt: null,
    updatedAt: Date.now(),
  });
  await writeGameServerAuditLog({
    serverId,
    action: "auto-stop",
    result: "requested",
    statusBefore: status.status,
    statusAfter: "stopping",
    message: "Palworld auto-stopped after 30 minutes with no players.",
    session: systemSession(),
    instanceId: config.instanceId,
  });
  return { ok: true, skipped: false, stopped: true, reason: "Auto-stop requested." };
}

export { parsePort };
