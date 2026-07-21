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
import type { VerifiedAdminSession } from "./admin-auth";

type GameServerId = "palworld";
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
  notes: string | null;
  addedBy: string;
  addedAt: number;
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
  region: string;
  instanceId: string;
  accessKeyId: string;
  secretAccessKey: string;
  gamePort: number;
  queryPort: number;
  cloudWatchNamespace: string;
  adminPassword: string;
};

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
];

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

function parseServerId(data: unknown): GameServerId {
  const serverId =
    typeof data === "object" && data
      ? (data as { serverId?: unknown }).serverId
      : null;
  if (serverId !== "palworld") {
    throw new HttpsError("invalid-argument", "A valid game server is required.");
  }
  return serverId;
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
      "Palworld instance ID is not configured.",
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

function statusMessage(status: GameServerStatus, enabled: boolean): string {
  if (!enabled || status === "disabled") return "Palworld is disabled by admins.";
  if (status === "running") return "Ready to join.";
  if (status === "stopped") return "Offline.";
  if (status === "pending") return "Starting.";
  if (status === "stopping") return "Stopping.";
  if (status === "shutting-down") return "Shutting down.";
  if (status === "terminated") return "Needs admin attention. EC2 instance is terminated.";
  return "Needs admin attention. Status is unavailable.";
}

function sessionDisplayName(session: VerifiedAdminSession): string | undefined {
  return session.characterName || undefined;
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

function settingsFromValue(value: Partial<GameServerSettings> | null): GameServerSettings {
  return {
    serverId: "palworld",
    enabled: value?.enabled !== false,
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
  return settingsFromValue(snapshot.val() as Partial<GameServerSettings> | null);
}

function disabledStatus(settings: GameServerSettings): GameServerStatusResult {
  return {
    ok: true,
    serverId: "palworld",
    status: "disabled",
    checkedAt: Date.now(),
    host: null,
    connectAddress: null,
    message: settings.disabledMessage || statusMessage("disabled", false),
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
  session: VerifiedAdminSession;
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
  if (!value || typeof value !== "object") return null;
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
    return parsed.players
      .map((player) => palworldPlayerFromValue(player))
      .filter((player): player is PalworldPlayer => player !== null);
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
    console.error("Failed to read Palworld CloudWatch telemetry", error);
    return {
      memoryUsedPercent: null,
      diskUsedPercent: null,
      message: "RAM metric is unavailable from CloudWatch.",
    };
  }
}

async function readPalworldTelemetry(
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

async function describePalworldInstance(
  config: GameServerAwsConfig,
  options: { includeTelemetry: boolean } = { includeTelemetry: true },
): Promise<GameServerStatusResult> {
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
    console.error("Failed to describe Palworld EC2 instance", error);
    throw new HttpsError(
      "unavailable",
      "Could not read Palworld EC2 status.",
    );
  }

  if (!instance) {
    throw new HttpsError("not-found", "Palworld EC2 instance was not found.");
  }

  const status = normalizeState(instance.State?.Name);
  const host = hostForInstance(instance);
  const instanceType = instance.InstanceType ?? null;
  const launchTime = instance.LaunchTime?.toISOString() ?? null;
  const telemetry = options.includeTelemetry
    ? await readPalworldTelemetry(config, host, status)
    : {
        playerCount: null,
        maxPlayers: null,
        players: [],
        memoryUsedPercent: null,
        diskUsedPercent: null,
        telemetryCheckedAt: Date.now(),
        telemetryMessage: null,
      };
  const idleState = await readIdleState("palworld");
  const cost = await updateMonthlyCostSnapshot({
    serverId: "palworld",
    status,
    launchTime,
    instanceType,
  });
  return {
    ok: true,
    serverId: "palworld",
    status,
    checkedAt: Date.now(),
    host,
    connectAddress: status === "running" ? connectAddress(host, config.gamePort) : null,
    message: statusMessage(status, true),
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
  config: GameServerAwsConfig,
  options?: { includeTelemetry: boolean },
): Promise<GameServerStatusResult> {
  const settings = await readGameServerSettings("palworld");
  if (!settings.enabled) return disabledStatus(settings);
  return describePalworldInstance(config, options);
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
  return {
    discordUserId,
    displayName:
      typeof entry.displayName === "string" ? entry.displayName : discordUserId,
    enabled: entry.enabled === true,
    notes: typeof entry.notes === "string" && entry.notes ? entry.notes : null,
    addedBy: typeof entry.addedBy === "string" ? entry.addedBy : "",
    addedAt: typeof entry.addedAt === "number" ? entry.addedAt : 0,
    updatedAt: typeof entry.updatedAt === "number" ? entry.updatedAt : 0,
  };
}

async function readAccessEntry(
  discordUserId: string,
): Promise<GameServerAccessEntry | null> {
  const snapshot = await admin
    .database()
    .ref(`gameServerAccess/${discordUserId}`)
    .get();
  const entry = snapshot.val() as Partial<GameServerAccessEntry> | null;
  return accessEntryFromValue(discordUserId, entry);
}

export async function requireGameServerAccess(
  session: VerifiedAdminSession,
): Promise<VerifiedAdminSession & { gameServerAccess: GameServerAccessEntry | null }> {
  if (session.isAdmin === true) {
    return { ...session, gameServerAccess: null };
  }

  const entry = await readAccessEntry(session.discordUserId);
  if (entry?.enabled) {
    return { ...session, gameServerAccess: entry };
  }

  throw new HttpsError(
    "permission-denied",
    "Game server whitelist required.",
  );
}

export async function getGameServerAccessStatusForSession(
  session: VerifiedAdminSession,
): Promise<{ ok: true; canUseGameServers: boolean; isAdmin: boolean }> {
  if (session.isAdmin === true) {
    return { ok: true, canUseGameServers: true, isAdmin: true };
  }

  const entry = await readAccessEntry(session.discordUserId);
  return {
    ok: true,
    canUseGameServers: entry?.enabled === true,
    isAdmin: false,
  };
}

export async function listGameServersForSession(
  _session: VerifiedAdminSession,
  config: GameServerAwsConfig,
) {
  const status = await statusForEnabledServer(config);
  return {
    ok: true,
    servers: GAME_SERVERS.map((server) => ({
      ...server,
      status: server.id === "palworld" ? status.status : "unknown",
      host: server.id === "palworld" ? status.host : null,
      connectAddress: server.id === "palworld" ? status.connectAddress : null,
      enabled: server.id === "palworld" ? status.enabled : true,
      disabledMessage: server.id === "palworld" ? status.disabledMessage : null,
      controlsAvailable:
        server.id === "palworld" &&
        status.enabled &&
        (status.status === "running" || status.status === "stopped"),
      phase: "live",
    })),
  };
}

export async function getGameServerStatusForSession(
  data: unknown,
  _session: VerifiedAdminSession,
  config: GameServerAwsConfig,
) {
  const serverId = parseServerId(data);
  const server = GAME_SERVERS.find((item) => item.id === serverId);
  if (!server) {
    throw new HttpsError("not-found", "Game server was not found.");
  }
  return statusForEnabledServer(config);
}

async function assertServerEnabled(serverId: GameServerId): Promise<void> {
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) {
    throw new HttpsError(
      "failed-precondition",
      settings.disabledMessage || "Palworld is disabled by admins.",
    );
  }
}

export async function startGameServerForSession(
  data: unknown,
  session: VerifiedAdminSession,
  config: GameServerAwsConfig,
) {
  const serverId = parseServerId(data);
  await assertServerEnabled(serverId);
  let status: GameServerStatusResult;
  try {
    status = await describePalworldInstance(config, { includeTelemetry: false });
  } catch (error) {
    await writeGameServerAuditLog({
      serverId,
      action: "start",
      result: "failed",
      statusBefore: "unavailable",
      message: error instanceof Error ? error.message : "Failed to read Palworld status before start.",
      session,
      instanceId: config.instanceId,
    });
    throw error;
  }

  if (status.status === "running" || status.status === "pending") {
    const message =
      status.status === "running"
        ? "Palworld is already ready to join."
        : "Palworld is already starting.";
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
    const message = "Palworld is stopping. Refresh and try again once it is stopped.";
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
    const message = "Palworld cannot be started from its current state.";
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
    const message = "Palworld is not ready to start.";
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
    const message = "Palworld EC2 instance start request failed.";
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
    message: "Palworld start requested.",
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
    message: "Palworld start requested.",
    instanceId: config.instanceId,
  };
}

export async function stopGameServerForSession(
  data: unknown,
  session: VerifiedAdminSession,
  config: GameServerAwsConfig,
) {
  const serverId = parseServerId(data);
  await assertServerEnabled(serverId);
  let status: GameServerStatusResult;
  try {
    status = await describePalworldInstance(config);
  } catch (error) {
    await writeGameServerAuditLog({
      serverId,
      action: "stop",
      result: "failed",
      statusBefore: "unavailable",
      message: error instanceof Error ? error.message : "Failed to read Palworld status before stop.",
      session,
      instanceId: config.instanceId,
    });
    throw error;
  }

  if (status.status === "stopped" || status.status === "stopping") {
    const message =
      status.status === "stopped"
        ? "Palworld is already offline."
        : "Palworld is already stopping.";
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
    const message = "Palworld is starting. Refresh and try again once it is running.";
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
    const message = "Palworld cannot be stopped from its current state.";
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
    const message = "Palworld is not ready to stop.";
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
    const message = "Palworld EC2 instance stop request failed.";
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
    message: "Palworld stop requested.",
    session,
    instanceId: config.instanceId,
  });
  return {
    ...status,
    ok: true,
    serverId,
    status: "stopping",
    checkedAt: Date.now(),
    message: "Palworld stop requested.",
    instanceId: config.instanceId,
  };
}

export async function listGameServerAccessForAdmin(): Promise<{
  ok: true;
  entries: GameServerAccessEntry[];
}> {
  const snapshot = await admin.database().ref("gameServerAccess").get();
  const value = snapshot.val() as Record<string, GameServerAccessEntry> | null;
  const entries = Object.entries(value ?? {})
    .map(([discordUserId, entry]) => accessEntryFromValue(discordUserId, entry))
    .filter((entry): entry is GameServerAccessEntry => entry !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { ok: true, entries };
}

export async function listGameServerAccessCandidatesForAdmin(): Promise<{
  ok: true;
  candidates: GameServerAccessCandidate[];
  legacyEntries: GameServerAccessEntry[];
}> {
  const [membersSnapshot, linksSnapshot, accessSnapshot] = await Promise.all([
    admin.database().ref("members").get(),
    admin.database().ref("discordLinksByLodestone").get(),
    admin.database().ref("gameServerAccess").get(),
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
  const input = typeof data === "object" && data ? data as Record<string, unknown> : {};
  const discordUserId = parseDiscordId(input.discordUserId);
  const displayName = parseDisplayName(input.displayName);
  const notes = parseNotes(input.notes);
  const enabled = parseEnabled(input.enabled);
  const ref = admin.database().ref(`gameServerAccess/${discordUserId}`);
  const existing = (await ref.get()).val() as Partial<GameServerAccessEntry> | null;
  const now = Date.now();
  const entry: GameServerAccessEntry = {
    discordUserId,
    displayName,
    enabled,
    notes,
    addedBy:
      typeof existing?.addedBy === "string" && existing.addedBy
        ? existing.addedBy
        : adminSession.discordUserId,
    addedAt:
      typeof existing?.addedAt === "number" && existing.addedAt > 0
        ? existing.addedAt
        : now,
    updatedAt: now,
  };
  await ref.set(entry);
  return { ok: true, entry };
}

export async function deleteGameServerAccessForAdmin(
  data: unknown,
): Promise<{ ok: true }> {
  const input = typeof data === "object" && data ? data as Record<string, unknown> : {};
  const discordUserId = parseDiscordId(input.discordUserId);
  await admin.database().ref(`gameServerAccess/${discordUserId}`).remove();
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
  const serverId =
    typeof data === "object" && data && "serverId" in data
      ? parseServerId(data)
      : "palworld";
  return { ok: true, entries: await listGameServerAuditLog(serverId, AUDIT_LOG_ADMIN_LIMIT) };
}

export async function listGameServerAuditLogForSession(
  data: unknown,
  _session: VerifiedAdminSession,
): Promise<{ ok: true; entries: GameServerAuditLogEntry[] }> {
  const serverId =
    typeof data === "object" && data && "serverId" in data
      ? parseServerId(data)
      : "palworld";
  return { ok: true, entries: await listGameServerAuditLog(serverId, AUDIT_LOG_USER_LIMIT) };
}

export async function getGameServerSettingsForAdmin(): Promise<{
  ok: true;
  settings: GameServerSettings;
}> {
  return { ok: true, settings: await readGameServerSettings("palworld") };
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
    message: enabled ? "Palworld enabled by admin." : "Palworld disabled by admin.",
    session: adminSession,
  });
  return { ok: true, settings };
}

export async function runAutoStopIdleGameServers(
  config: GameServerAwsConfig,
): Promise<{ ok: true; skipped: boolean; stopped: boolean; reason: string }> {
  const serverId: GameServerId = "palworld";
  const settings = await readGameServerSettings(serverId);
  if (!settings.enabled) {
    return { ok: true, skipped: true, stopped: false, reason: "Palworld disabled." };
  }

  const status = await describePalworldInstance(config, { includeTelemetry: true });
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
