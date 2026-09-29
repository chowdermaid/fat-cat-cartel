import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { test, type TestContext } from "node:test";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";
import * as callables from "./index";
import {
  getGameServerSettingsForAdmin,
  getGameServerStatusForSession,
  getGameServerTelemetryForSession,
  listGameServerAuditLogForAdmin,
  listGameServerAuditLogForSession,
  listGameServersForSession,
  requireGameServerAccess,
  runAutoStopIdleGameServers,
  startGameServerForSession,
  stopGameServerForSession,
  updateGameServerSettingsForAdmin,
  type GameServerAwsConfig,
  type GameServerId,
} from "./game-servers";
import type { VerifiedAuthenticatedSession } from "./admin-auth";

const identity = "123456789012345678";
const token = "synthetic-game-server-test-session";
const sessionPath = `adminSessions/${createHash("sha256").update(token).digest("hex")}`;
const ids: GameServerId[] = ["palworld", "dragonwilds"];
const session: VerifiedAuthenticatedSession & { gameServerAccessById: Record<GameServerId, boolean> } = {
  discordUserId: identity,
  lodestoneId: null,
  characterName: null,
  fcRank: null,
  avatarUrl: null,
  roleIds: [],
  isAdmin: false,
  createdAt: 1,
  expiresAt: Number.MAX_SAFE_INTEGER,
  lastSeenAt: 1,
  sessionHash: "synthetic",
  gameServerAccessById: { palworld: true, dragonwilds: true },
};

function fixture(t: TestContext) {
  const data = new Map<string, unknown>();
  const reads: string[] = [];
  const writes: string[] = [];
  let sequence = 0;
  const read = (path: string): unknown => {
    if (data.has(path)) return data.get(path);
    const children = [...data.entries()]
      .filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/"))
      .map(([key, value]) => [key.slice(path.length + 1), value]);
    return children.length ? Object.fromEntries(children) : null;
  };
  const ref = (path: string): unknown => ({
    get: async () => { reads.push(path); return { val: () => read(path) }; },
    set: async (value: unknown) => { writes.push(path); data.set(path, value); },
    update: async (value: object) => { writes.push(path); data.set(path, { ...read(path) as object, ...value }); },
    remove: async () => { writes.push(path); data.delete(path); },
    child: (key: string) => ref(`${path}/${key}`),
    push: () => ref(`${path}/entry-${++sequence}`),
  });
  t.mock.getter(admin, "database", () => (() => ({ ref })) as typeof admin.database);
  const state = {
    now: Date.UTC(2026, 8, 29, 12),
    instanceStates: { palworld: "running", dragonwilds: "running" },
    failInstance: "",
    failAction: "",
    playerOutput: '{"players":[]}',
    failSsm: false,
    failMetrics: false,
    roles: [] as string[],
  };
  t.mock.method(Date, "now", () => state.now);
  const aws: Array<{ kind: string; instanceId?: string }> = [];
  t.mock.method(EC2Client.prototype, "send", async (command: unknown) => {
    assert(command instanceof DescribeInstancesCommand || command instanceof StartInstancesCommand || command instanceof StopInstancesCommand);
    const instanceId = command.input.InstanceIds?.[0];
    aws.push({ kind: command.constructor.name, instanceId });
    if (state.failInstance === instanceId || state.failAction === command.constructor.name) throw new Error("Synthetic EC2 failure");
    const id = ids.find((candidate) => instanceId === `i-${candidate}`);
    assert(id, "Unexpected target; test must never reach AWS");
    return command instanceof DescribeInstancesCommand ? {
      Reservations: [{ Instances: [{
        InstanceId: instanceId,
        State: { Name: state.instanceStates[id] },
        PublicDnsName: `${id}.example.invalid`,
        PublicIpAddress: id === "dragonwilds" ? "203.0.113.77" : undefined,
        InstanceType: "t3a.large",
        LaunchTime: new Date(state.now - 3_600_000),
      }] }],
    } : {};
  });
  const ssm: unknown[] = [];
  t.mock.method(SSMClient.prototype, "send", async (command: unknown) => {
    ssm.push(command);
    if (state.failSsm) throw new Error("Synthetic SSM failure");
    return command instanceof SendCommandCommand
      ? { Command: { CommandId: "synthetic-command" } }
      : { Status: "Success", StandardOutputContent: state.playerOutput };
  });
  const http: Array<{ url: string; body: string }> = [];
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    http.push({ url, body: String(init?.body ?? "") });
    if (url.startsWith("https://discord.com/api/")) {
      return new Response(JSON.stringify({ roles: state.roles }), { status: 200 });
    }
    assert.equal(url, "https://monitoring.ap-southeast-2.amazonaws.com/");
    if (state.failMetrics) throw new Error("Synthetic metric failure");
    return new Response("<Values><member>42</member></Values>", { status: 200 });
  });
  t.mock.method(console, "error", () => {});
  const configs = Object.fromEntries(ids.map((serverId) => [serverId, {
    serverId,
    instanceId: `i-${serverId}`,
    region: "ap-southeast-2",
    accessKeyId: "synthetic-key",
    secretAccessKey: "synthetic-secret",
    gamePort: serverId === "palworld" ? 8211 : 7777,
    queryPort: serverId === "palworld" ? 27015 : null,
    cloudWatchNamespace: "CWAgent",
    adminPassword: serverId === "palworld" ? "synthetic-password" : "",
    worldName: "Synthetic World",
    capacity: null,
  }])) as Record<GameServerId, GameServerAwsConfig>;
  const resolved: GameServerId[] = [];
  const resolve = (id: GameServerId) => { resolved.push(id); return configs[id]; };
  data.set(sessionPath, { ...session, lastSeenAt: state.now });
  return { data, reads, writes, state, aws, ssm, http, configs, resolved, resolve };
}

function expectCode(code: string) {
  return (error: unknown) => error instanceof HttpsError && error.code === code;
}

function callableEnvironment(t: TestContext) {
  const values: Record<string, string> = {
    AWS_REGION: "ap-southeast-2", AWS_ACCESS_KEY_ID: "synthetic-key", AWS_SECRET_ACCESS_KEY: "synthetic-secret",
    PALWORLD_INSTANCE_ID: "i-palworld", PALWORLD_ADMIN_PASSWORD: "synthetic-password",
    DRAGONWILDS_INSTANCE_ID: "i-dragonwilds", DRAGONWILDS_WORLD_NAME: "Synthetic World", DRAGONWILDS_CAPACITY: "",
    DISCORD_GUILD_ID: "synthetic-guild", DISCORD_BOT_TOKEN: "synthetic-bot", DISCORD_ADMIN_ROLE_IDS: "boss,underpaw",
    DISCORD_MEMBER_ROLE_IDS: "member", FUNCTIONS_EMULATOR: "false", DEV_AUTH_ROLE_OVERRIDE: "",
  };
  for (const [key, value] of Object.entries(values)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
}

test("settings default Dragonwilds disabled and preserve omitted-ID Palworld compatibility", async (t) => {
  const f = fixture(t);
  assert.equal((await getGameServerSettingsForAdmin()).settings.enabled, true);
  const dragonwilds = await getGameServerSettingsForAdmin({ serverId: "dragonwilds" });
  assert.equal(dragonwilds.settings.serverId, "dragonwilds");
  assert.equal(dragonwilds.settings.enabled, false);
  f.data.set("gameServerSettings/dragonwilds", { enabled: "true", serverId: "palworld" });
  assert.equal((await getGameServerSettingsForAdmin({ serverId: "dragonwilds" })).settings.enabled, false);
  await updateGameServerSettingsForAdmin({ serverId: "dragonwilds", enabled: true }, { ...session, isAdmin: true, lodestoneId: "123", characterName: "Synthetic Admin" });
  assert(!f.writes.some((path) => path.includes("/palworld")));
  assert.equal(f.aws.length, 0);
});

test("invalid explicit IDs fail before config resolution and AWS on every selecting operation", async (t) => {
  const f = fixture(t);
  for (const serverId of ["unknown", "", null, undefined, 1, "../palworld"]) {
    const data = { serverId };
    for (const action of [getGameServerStatusForSession, getGameServerTelemetryForSession, startGameServerForSession, stopGameServerForSession]) {
      await assert.rejects(action(data, session, f.resolve), expectCode("invalid-argument"));
    }
    await assert.rejects(getGameServerSettingsForAdmin(data), expectCode("invalid-argument"));
    await assert.rejects(updateGameServerSettingsForAdmin(data, { ...session, isAdmin: true, lodestoneId: "123", characterName: "Synthetic Admin" }), expectCode("invalid-argument"));
    await assert.rejects(listGameServerAuditLogForAdmin(data), expectCode("invalid-argument"));
    await assert.rejects(listGameServerAuditLogForSession(data, session), expectCode("invalid-argument"));
  }
  await assert.rejects(getGameServerStatusForSession({}, session, f.resolve), expectCode("invalid-argument"));
  assert.equal(f.resolved.length, 0);
  assert.equal(f.aws.length, 0);
  assert.equal(f.writes.length, 0);
});

test("disabled server hides details and rejects actions without resolving config", async (t) => {
  const f = fixture(t);
  const data = { serverId: "dragonwilds" };
  const status = await getGameServerStatusForSession(data, session, f.resolve);
  assert.equal(status.serverId, "dragonwilds");
  assert.equal(status.status, "disabled");
  assert.equal(status.instanceId, null);
  assert.equal(status.host, null);
  assert.equal(status.worldName, undefined);
  assert.equal((await getGameServerTelemetryForSession(data, session, f.resolve)).playerCount, null);
  for (const action of [startGameServerForSession, stopGameServerForSession]) {
    await assert.rejects(action(data, session, f.resolve), expectCode("failed-precondition"));
  }
  assert.deepEqual(f.resolved, []);
  assert.equal(f.aws.length + f.ssm.length + f.http.length, 0);
});

test("catalog reads fast status only and isolates missing config or EC2 failure", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.configs.dragonwilds.instanceId = "";
  let catalog = await listGameServersForSession(session, f.resolve, ids);
  assert.deepEqual(catalog.servers.map((s) => s.status), ["running", "unavailable"]);
  f.configs.dragonwilds.instanceId = "i-dragonwilds";
  f.state.failInstance = "i-palworld";
  catalog = await listGameServersForSession(session, f.resolve, ids);
  assert.deepEqual(catalog.servers.map((s) => s.status), ["unavailable", "running"]);
  assert.equal(catalog.servers[1].connectAddress, "203.0.113.77:7777");
  assert.equal(f.ssm.length + f.http.length, 0);
  assert(f.aws.every((call) => call.kind === "DescribeInstancesCommand"));
  assert(!JSON.stringify(catalog).includes("synthetic-password"));
  assert(!JSON.stringify(catalog).includes("Synthetic World"));
});

test("status, costs, start and stop use only selected instance and data branches", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  const data = { serverId: "dragonwilds", instanceId: "i-palworld" };
  const status = await getGameServerStatusForSession(data, session, f.resolve);
  assert.equal(status.serverId, "dragonwilds");
  assert.equal(status.connectAddress, "203.0.113.77:7777");
  assert.equal(status.worldName, "Synthetic World");
  assert.match(status.message, /readiness is not verified/);
  assert.equal(status.monthlyCost?.instanceType, "t3a.large");
  f.state.instanceStates.dragonwilds = "stopped";
  assert.equal((await startGameServerForSession(data, session, f.resolve)).status, "pending");
  f.state.instanceStates.dragonwilds = "running";
  f.state.failMetrics = true;
  assert.equal((await stopGameServerForSession(data, session, f.resolve)).status, "stopping");
  assert(f.aws.every((call) => call.instanceId === "i-dragonwilds"));
  assert(f.aws.some((call) => call.kind === "StartInstancesCommand"));
  assert(f.aws.some((call) => call.kind === "StopInstancesCommand"));
  assert(![...f.reads, ...f.writes].some((path) => path.includes("/palworld")));
  assert.equal(f.ssm.length, 0);
  assert(f.http.every((call) => new URLSearchParams(call.body).get("MetricDataQueries.member.1.Expression")?.includes('InstanceId="i-dragonwilds"')));
});

test("config mismatch is rejected and Palworld never resolves Dragonwilds config", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  await assert.rejects(getGameServerStatusForSession({ serverId: "dragonwilds" }, session, () => f.configs.palworld), expectCode("failed-precondition"));
  assert.equal(f.aws.length, 0);
  const result = await getGameServerStatusForSession({ serverId: "palworld" }, session, (id) => {
    assert.equal(id, "palworld"); return f.configs[id];
  });
  assert.equal(result.connectAddress, "palworld.example.invalid:8211");
  assert.equal(result.message, "Ready to join.");
});

test("Dragonwilds telemetry is unknown, including metric failure; Palworld player fields survive", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.configs.dragonwilds.capacity = 6;
  f.data.set("gameServerIdleState/dragonwilds", { idleSince: 1, autoStopEligibleAt: 2 });
  const status = await getGameServerStatusForSession({ serverId: "dragonwilds" }, session, f.resolve);
  assert.equal(status.autoStopEligibleAt, null);
  let telemetry = await getGameServerTelemetryForSession({ serverId: "dragonwilds" }, session, f.resolve);
  assert.equal(telemetry.playerCount, null);
  assert.equal(telemetry.maxPlayers, 6);
  assert.deepEqual(telemetry.players, []);
  assert.equal(telemetry.memoryUsedPercent, 42);
  assert.equal(f.ssm.length, 0);
  f.state.failMetrics = true;
  telemetry = await getGameServerTelemetryForSession({ serverId: "dragonwilds" }, session, f.resolve);
  assert.equal(telemetry.playerCount, null);
  assert.equal(telemetry.memoryUsedPercent, null);
  f.state.playerOutput = JSON.stringify({ players: [{ name: "Player", accountName: "Account", playerId: "p1", userId: "u1", ping: 12, level: 30, ip: "synthetic-private-address" }] });
  const palworld = await getGameServerTelemetryForSession({ serverId: "palworld" }, session, f.resolve);
  assert.equal(palworld.playerCount, 1);
  assert.deepEqual(palworld.players[0], { name: "Player", accountName: "Account", playerId: "p1", userId: "u1", ping: 12, level: 30 });
});

test("action no-op, blocked and failed results retain independent audit history", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  const data = { serverId: "dragonwilds" };
  assert.equal((await startGameServerForSession(data, session, f.resolve)).status, "running");
  f.state.instanceStates.dragonwilds = "pending";
  await assert.rejects(stopGameServerForSession(data, session, f.resolve), expectCode("failed-precondition"));
  f.state.instanceStates.dragonwilds = "stopped";
  assert.equal((await stopGameServerForSession(data, session, f.resolve)).status, "stopped");
  f.state.failAction = "StartInstancesCommand";
  await assert.rejects(startGameServerForSession(data, session, f.resolve), expectCode("unavailable"));
  const entries = (await listGameServerAuditLogForSession(data, session)).entries;
  assert.deepEqual(new Set(entries.map((entry) => entry.result)), new Set(["noop", "blocked", "failed"]));
  assert(entries.every((entry) => entry.serverId === "dragonwilds" && !entry.message.includes("Palworld")));
  assert.equal((await listGameServerAuditLogForSession({}, session)).entries.length, 0);
});

test("audit retention stays at 50, with five user and 25 admin entries per game", async (t) => {
  const f = fixture(t);
  for (const id of ids) {
    for (let i = 0; i < 55; i++) f.data.set(`gameServerAuditLog/${id}/old-${i}`, { createdAt: i, serverId: id });
  }
  await updateGameServerSettingsForAdmin({ serverId: "dragonwilds", enabled: false }, { ...session, isAdmin: true, lodestoneId: "123", characterName: "Synthetic Admin" });
  assert.equal([...f.data.keys()].filter((key) => key.startsWith("gameServerAuditLog/dragonwilds/")).length, 50);
  assert.equal([...f.data.keys()].filter((key) => key.startsWith("gameServerAuditLog/palworld/")).length, 55);
  assert.equal((await listGameServerAuditLogForSession({ serverId: "dragonwilds" }, session)).entries.length, 5);
  assert.equal((await listGameServerAuditLogForAdmin({ serverId: "dragonwilds" })).entries.length, 25);
  assert((await listGameServerAuditLogForAdmin({})).entries.every((entry) => entry.serverId === "palworld"));
});

test("scheduler preserves Palworld threshold and never queries or stops Dragonwilds", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.data.set("gameServerIdleState/dragonwilds", { idleSince: 1, autoStopEligibleAt: 2 });
  for (let step = 0; step < 4; step++) {
    const result = await runAutoStopIdleGameServers(f.resolve);
    assert.equal(result.results[0].stopped, step === 3);
    assert.equal(result.results[1].stopped, false);
    f.state.now += 10 * 60 * 1000;
  }
  assert(f.aws.every((call) => call.instanceId === "i-palworld"));
  assert.deepEqual(f.data.get("gameServerIdleState/dragonwilds"), { idleSince: null, autoStopEligibleAt: null, updatedAt: Date.UTC(2026, 8, 29, 12) });
  assert(f.ssm.filter((command) => command instanceof SendCommandCommand).every((command) => command.input.InstanceIds?.[0] === "i-palworld"));
});

test("scheduler resets Palworld on positive/unknown counts and isolates failures", async (t) => {
  const f = fixture(t);
  for (const output of ['{"players":[{"name":"Player"}]}', 'malformed']) {
    f.data.set("gameServerIdleState/palworld", { idleSince: 1, autoStopEligibleAt: 2 });
    f.state.playerOutput = output;
    await runAutoStopIdleGameServers(f.resolve);
    assert.equal((f.data.get("gameServerIdleState/palworld") as { idleSince: number | null }).idleSince, null);
  }
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.state.failInstance = "i-palworld";
  let result = await runAutoStopIdleGameServers(f.resolve);
  assert.equal(result.results[0].ok, false);
  assert.equal(result.results[1].ok, true);
  f.state.failInstance = "";
  result = await runAutoStopIdleGameServers((id) => { if (id === "dragonwilds") throw new Error("Synthetic config failure"); return f.configs[id]; });
  assert.equal(result.results[0].ok, true);
  assert.equal(result.results[1].ok, false);
  assert(!f.aws.some((call) => call.kind === "StopInstancesCommand"));
});

test("disabled and unconfigured scheduled targets make no AWS calls", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/palworld", { enabled: false });
  await runAutoStopIdleGameServers(f.resolve);
  assert.deepEqual(f.resolved, []);
  f.data.set("gameServerSettings/palworld", { enabled: true });
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.configs.palworld.instanceId = "";
  f.configs.dragonwilds.instanceId = "";
  await runAutoStopIdleGameServers(f.resolve);
  assert.equal(f.aws.length + f.ssm.length + f.http.length, 0);
});

test("callable authorization denies missing/expired/revoked sessions and grants before AWS", async (t) => {
  const f = fixture(t);
  callableEnvironment(t);
  const run = (data: unknown) => callables.getGameServerStatus.run({ data } as Parameters<typeof callables.getGameServerStatus.run>[0]);
  await assert.rejects(run({ serverId: "dragonwilds" }), expectCode("unauthenticated"));
  f.data.set(sessionPath, { ...session, expiresAt: 1 });
  await assert.rejects(run({ serverId: "dragonwilds", adminSessionToken: token }), expectCode("unauthenticated"));
  await assert.rejects(run({ serverId: "dragonwilds", adminSessionToken: token }), expectCode("unauthenticated"));
  f.data.set(sessionPath, { ...session, isAdmin: true, fcRank: "Boss", lastSeenAt: f.state.now });
  for (const grant of [null, { enabled: false }, { enabled: true, expiresAt: 1 }, { enabled: true, expiresAt: "invalid" }]) {
    f.data.set(`gameServerAccess/${identity}`, grant);
    for (const id of ids) await assert.rejects(run({ serverId: id, adminSessionToken: token, isAdmin: true }), expectCode("permission-denied"));
  }
  assert.equal(f.aws.length + f.ssm.length, 0);
  assert(f.http.every((call) => call.url.startsWith("https://discord.com/")));
});

test("unlinked independently granted user can operate both games but cannot change admin settings", async (t) => {
  const f = fixture(t);
  callableEnvironment(t);
  f.data.set(`gameServerAccess/${identity}`, { enabled: true });
  f.data.set(`dragonwildsServerAccess/${identity}`, { enabled: true });
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  for (const serverId of ids) {
    const data = { serverId, adminSessionToken: token, instanceId: "i-forged" };
    const result = await callables.getGameServerStatus.run({ data } as Parameters<typeof callables.getGameServerStatus.run>[0]);
    assert.equal(result.instanceId, `i-${serverId}`);
    assert.equal((await requireGameServerAccess(session)).discordUserId, identity);
    f.state.instanceStates[serverId] = "stopped";
    const started = await callables.startGameServer.run({ data } as Parameters<typeof callables.startGameServer.run>[0]);
    assert.equal(started.status, "pending");
    f.state.instanceStates[serverId] = "running";
    const stopped = await callables.stopGameServer.run({ data } as Parameters<typeof callables.stopGameServer.run>[0]);
    assert.equal(stopped.status, "stopping");
    assert.equal(started.instanceId, `i-${serverId}`);
    assert.equal(stopped.instanceId, `i-${serverId}`);
  }
  assert(!f.http.some((call) => call.url.startsWith("https://discord.com/")), "Direct grant must avoid Discord lookup");
  const request = { data: { serverId: "dragonwilds", enabled: true, adminSessionToken: token } };
  await assert.rejects(callables.updateGameServerSettings.run(request as Parameters<typeof callables.updateGameServerSettings.run>[0]), expectCode("permission-denied"));
  await assert.rejects(callables.upsertGameServerAccess.run(request as Parameters<typeof callables.upsertGameServerAccess.run>[0]), expectCode("permission-denied"));
  f.data.delete(`dragonwildsServerAccess/${identity}`);
  await assert.rejects(callables.getGameServerStatus.run(request as Parameters<typeof callables.getGameServerStatus.run>[0]), expectCode("permission-denied"));
});

test("every protected server callable denies an ungranted session before AWS or operational writes", async (t) => {
  const f = fixture(t);
  callableEnvironment(t);
  const handlers = [callables.getGameServers, callables.getGameServerStatus, callables.getGameServerTelemetry, callables.startGameServer, callables.stopGameServer, callables.listGameServerEvents];
  for (const serverId of ids) {
    for (const handler of handlers) {
      await assert.rejects(handler.run({ data: { serverId, adminSessionToken: token } } as Parameters<typeof handler.run>[0]), expectCode("permission-denied"));
    }
  }
  assert.equal(f.aws.length + f.ssm.length, 0);
  assert.equal(f.writes.length, 0);
  assert(!f.reads.some((path) => /^gameServer(Settings|Cost|IdleState|AuditLog)\//.test(path)));
});

test("live admin bypass works; removed role and colliding instance config fail closed", async (t) => {
  const f = fixture(t);
  callableEnvironment(t);
  f.state.roles = ["boss"];
  f.data.set(`discordLinks/${identity}`, { lodestoneId: "123" });
  f.data.set("members/123", { name: "Synthetic Member" });
  const request = { data: { serverId: "dragonwilds", enabled: true, adminSessionToken: token } };
  await callables.updateGameServerSettings.run(request as Parameters<typeof callables.updateGameServerSettings.run>[0]);
  const result = await callables.getGameServerStatus.run(request as Parameters<typeof callables.getGameServerStatus.run>[0]);
  assert.equal(result.instanceId, "i-dragonwilds");
  process.env.DRAGONWILDS_INSTANCE_ID = "i-palworld";
  const before = f.aws.length;
  await assert.rejects(callables.getGameServerStatus.run(request as Parameters<typeof callables.getGameServerStatus.run>[0]), expectCode("failed-precondition"));
  assert.equal(f.aws.length, before);
  f.state.roles = [];
  await assert.rejects(callables.getGameServerStatus.run(request as Parameters<typeof callables.getGameServerStatus.run>[0]), expectCode("permission-denied"));
  await assert.rejects(callables.getGameServerSettings.run(request as Parameters<typeof callables.getGameServerSettings.run>[0]), expectCode("permission-denied"));
  assert.equal(f.aws.length, before);
});
function invoke<T>(handler: { run: (request: never) => T }, data: Record<string, unknown> = {}) {
  return handler.run({ data: { adminSessionToken: token, ...data } } as never);
}

test("catalog bridge rejects invalid flags before session, grant, config or AWS work", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  for (const includeDragonwilds of [undefined, null, "true", "false", 0, 1, [], {}]) {
    await assert.rejects(invoke(callables.getGameServers, { includeDragonwilds }), expectCode("invalid-argument"));
  }
  assert.deepEqual(f.reads, []); assert.deepEqual(f.writes, []);
  assert.equal(f.aws.length + f.ssm.length + f.http.length, 0);
});

for (const access of ["admin", "palworld", "dragonwilds", "both", "neither"] as const) {
  test(`catalog bridge selects before authorization and status: ${access}`, async (t) => {
    const f = fixture(t); callableEnvironment(t);
    for (const id of ids) f.data.set(`gameServerSettings/${id}`, { enabled: true });
    if (access === "admin") {
      f.state.roles = ["boss"];
      f.data.set(`discordLinks/${identity}`, { lodestoneId: "123" });
      f.data.set("members/123", { name: "Synthetic Member" });
    }
    if (access === "palworld" || access === "both") f.data.set(`gameServerAccess/${identity}`, { enabled: true });
    if (access === "dragonwilds" || access === "both") f.data.set(`dragonwildsServerAccess/${identity}`, { enabled: true });
    for (const request of [{}, { includeDragonwilds: false }, { includeDragonwilds: true }]) {
      f.reads.length = 0; f.writes.length = 0; f.aws.length = 0; f.ssm.length = 0; f.http.length = 0;
      const selected = request.includeDragonwilds ? ids : ["palworld"];
      const allowed = selected.filter((id) => access === "admin" || access === "both" || access === id);
      if (allowed.length) {
        const result = await invoke(callables.getGameServers, request);
        assert.deepEqual(result.servers.map((server) => server.id), allowed);
      } else {
        await assert.rejects(invoke(callables.getGameServers, request), expectCode("permission-denied"));
      }
      assert.deepEqual(f.aws.map((call) => call.instanceId), allowed.map((id) => `i-${id}`));
      assert(f.aws.every((call) => call.kind === "DescribeInstancesCommand"));
      assert.equal(f.ssm.length, 0);
      assert(f.http.every((call) => call.url.startsWith("https://discord.com/")));
      for (const id of ids.filter((id) => !allowed.includes(id))) {
        assert(![...f.reads, ...f.writes].some((path) => path.startsWith(`gameServerSettings/${id}`) || path.startsWith(`gameServerCost/${id}`) || path.startsWith(`gameServerIdleState/${id}`)));
      }
      if (!request.includeDragonwilds) assert(!f.reads.some((path) => path.startsWith("dragonwildsServerAccess/")));
    }
  });
}

for (const allowed of [[], ["palworld"], ["dragonwilds"], ids] as GameServerId[][]) {
  test(`callable grant matrix: ${allowed.join("+") || "neither"}`, async (t) => {
    const f = fixture(t);
    callableEnvironment(t);
    for (const id of ids) f.data.set(`gameServerSettings/${id}`, { enabled: true });
    for (const id of allowed) f.data.set(`${id === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess"}/${identity}`, { enabled: true });
    const boot = await invoke(callables.getAdminSession);
    assert.deepEqual(boot.gameServerAccessById, { palworld: allowed.includes("palworld"), dragonwilds: allowed.includes("dragonwilds") });
    assert.equal(boot.canUseGameServers, allowed.length > 0);
    assert.equal(f.http.filter((item) => item.url.startsWith("https://discord.com/")).length, 1);
    f.reads.length = 0; f.http.length = 0; f.aws.length = 0;
    if (allowed.length) {
      const catalog = await invoke(callables.getGameServers, { includeDragonwilds: true });
      assert.deepEqual(catalog.servers.map((server) => server.id), allowed);
      assert(f.aws.every((item) => allowed.some((id) => item.instanceId === `i-${id}`)));
      for (const id of ids.filter((id) => !allowed.includes(id))) {
        assert(!f.reads.some((path) => path.startsWith(`gameServerSettings/${id}`)));
      }
    } else await assert.rejects(invoke(callables.getGameServers, { includeDragonwilds: true }), expectCode("permission-denied"));
    assert(f.http.filter((item) => item.url.startsWith("https://discord.com/")).length <= 1);
    for (const id of ids) assert.equal(f.reads.filter((path) => path === `${id === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess"}/${identity}`).length, 1);
    for (const serverId of ids) {
      for (const handler of [callables.getGameServerStatus, callables.getGameServerTelemetry, callables.startGameServer, callables.stopGameServer, callables.listGameServerEvents]) {
        f.reads.length = 0; f.http.length = 0; f.aws.length = 0; f.ssm.length = 0;
        if (allowed.includes(serverId)) {
          await invoke<Promise<unknown>>(handler, { serverId });
          assert(!f.http.some((item) => item.url.startsWith("https://discord.com/")));
        } else {
          await assert.rejects(invoke<Promise<unknown>>(handler, { serverId, isAdmin: true, gameServerAccessById: { palworld: true, dragonwilds: true } }), expectCode("permission-denied"));
          assert.equal(f.aws.length + f.ssm.length, 0);
          assert(!f.reads.some((path) => /^gameServer(Settings|Cost|IdleState|AuditLog)\//.test(path)));
        }
        const root = serverId === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess";
        const otherRoot = serverId === "palworld" ? "dragonwildsServerAccess" : "gameServerAccess";
        assert.equal(f.reads.filter((path) => path === `${root}/${identity}`).length, 1);
        assert(!f.reads.some((path) => path.startsWith(otherRoot)));
      }
    }
  });
}

test("selected grant expiry, malformed data and revocation leave other grant operational", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  for (const selected of ids) {
    const root = selected === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess";
    const other = selected === "palworld" ? "dragonwilds" : "palworld";
    const otherRoot = other === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess";
    f.data.set(`${otherRoot}/${identity}`, { enabled: true });
    for (const invalid of [null, { enabled: false }, { enabled: true, expiresAt: f.state.now }, { enabled: true, expiresAt: "bad" }, { enabled: true, discordUserId: "different" }]) {
      f.data.set(`${root}/${identity}`, invalid);
      await assert.rejects(invoke(callables.getGameServerStatus, { serverId: selected }), expectCode("permission-denied"));
      await invoke(callables.getGameServerStatus, { serverId: other });
    }
  }
});

test("verified service scope cannot be reused for another game", async (t) => {
  const f = fixture(t);
  f.data.set(`gameServerAccess/${identity}`, { enabled: true });
  const scoped = await requireGameServerAccess(session, "palworld");
  f.reads.length = 0;
  for (const service of [getGameServerStatusForSession, getGameServerTelemetryForSession, startGameServerForSession, stopGameServerForSession]) {
    await assert.rejects(service({ serverId: "dragonwilds" }, scoped, f.resolve), expectCode("permission-denied"));
  }
  await assert.rejects(listGameServerAuditLogForSession({ serverId: "dragonwilds" }, scoped), expectCode("permission-denied"));
  assert.deepEqual(f.reads, []); assert.deepEqual(f.resolved, []); assert.deepEqual(f.aws, []);
});

test("admin grant CRUD, candidates and legacy omissions select exactly one root", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  f.state.roles = ["boss"];
  f.data.set(`discordLinks/${identity}`, { lodestoneId: "123" });
  f.data.set("members/123", { name: "Synthetic Member" });
  f.data.set("discordLinksByLodestone/123", identity);
  const palworld = await invoke(callables.upsertGameServerAccess, { discordUserId: identity, displayName: "Pal friend", enabled: true, notes: "pal only" });
  const dragonwilds = await invoke(callables.upsertGameServerAccess, { serverId: "dragonwilds", discordUserId: identity, displayName: "Dragon friend", enabled: false, expiresAt: f.state.now + 60_000, notes: "dragon only" });
  assert.notDeepEqual(palworld.entry, dragonwilds.entry);
  const preserved = structuredClone(f.data.get(`gameServerAccess/${identity}`));
  for (const serverId of ids) {
    f.reads.length = 0;
    const list = await invoke(callables.listGameServerAccess, { serverId });
    const candidates = await invoke(callables.listGameServerAccessCandidates, { serverId });
    assert.equal(list.entries.length, 1);
    assert.equal(candidates.candidates[0].accessEntry?.notes, serverId === "palworld" ? "pal only" : "dragon only");
    const otherRoot = serverId === "palworld" ? "dragonwildsServerAccess" : "gameServerAccess";
    assert(!f.reads.some((path) => path.startsWith(otherRoot)));
  }
  assert.equal((await invoke(callables.listGameServerAccess)).entries[0].notes, "pal only");
  assert.equal((await invoke(callables.listGameServerAccessCandidates)).candidates[0].accessEntry?.notes, "pal only");
  await invoke(callables.deleteGameServerAccess, { serverId: "dragonwilds", discordUserId: identity });
  assert.deepEqual(f.data.get(`gameServerAccess/${identity}`), preserved);
  await invoke(callables.deleteGameServerAccess, { discordUserId: identity });
  assert.equal(f.data.get(`gameServerAccess/${identity}`), undefined);
  assert.equal(f.aws.length + f.ssm.length, 0);
  f.state.roles = [];
  for (const handler of [callables.listGameServerAccess, callables.listGameServerAccessCandidates, callables.upsertGameServerAccess, callables.deleteGameServerAccess, callables.getGameServerSettings, callables.updateGameServerSettings, callables.listGameServerAuditLog]) {
    await assert.rejects(invoke<Promise<unknown>>(handler, { serverId: "dragonwilds", discordUserId: identity }), expectCode("permission-denied"));
  }
});

test("access status defaults to Palworld and invalid explicit IDs never select a grant root", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  f.data.set(`dragonwildsServerAccess/${identity}`, { enabled: true, expiresAt: f.state.now + 10_000 });
  assert.equal((await invoke(callables.getGameServerAccessStatus)).canUseGameServers, false);
  const status = await invoke(callables.getGameServerAccessStatus, { serverId: "dragonwilds" });
  assert.equal(status.canUseGameServers, true); assert.equal(status.expiresAt, f.state.now + 10_000);
  f.state.roles = ["underpaw"];
  f.data.set(`discordLinks/${identity}`, { lodestoneId: "123" });
  f.data.set("members/123", { name: "Synthetic Member" });
  for (const serverId of [null, undefined, "unknown", 12]) {
    for (const handler of [callables.getGameServerAccessStatus, callables.getGameServerStatus, callables.getGameServerTelemetry, callables.startGameServer, callables.stopGameServer, callables.listGameServerEvents, callables.listGameServerAccess, callables.listGameServerAccessCandidates, callables.upsertGameServerAccess, callables.deleteGameServerAccess]) {
      f.reads.length = 0;
      await assert.rejects(invoke<Promise<unknown>>(handler, { serverId, discordUserId: identity }), expectCode("invalid-argument"));
      assert(!f.reads.some((path) => /^(gameServerAccess|dragonwildsServerAccess|gameServerSettings)/.test(path)));
    }
  }
  assert.equal(f.aws.length, 0);
});

test("live admin catalog and session get both capabilities with one role verification", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  f.data.set(`discordLinks/${identity}`, { lodestoneId: "123" }); f.data.set("members/123", { name: "Synthetic Member" });
  for (const role of ["boss", "underpaw"]) {
    f.state.roles = [role]; f.http.length = 0;
    const catalog = await invoke(callables.getGameServers, { includeDragonwilds: true });
    assert.deepEqual(catalog.servers.map((item) => item.id), ids);
    assert.equal(f.http.filter((item) => item.url.startsWith("https://discord.com/")).length, 1);
    f.reads.length = 0; f.http.length = 0;
    const boot = await invoke(callables.getAdminSession);
    assert.deepEqual(boot.gameServerAccessById, { palworld: true, dragonwilds: true });
    assert.equal(f.http.length, 1);
    assert(!f.reads.some((path) => /^(gameServerAccess|dragonwildsServerAccess)/.test(path)));
  }
  f.state.roles = [];
  await assert.rejects(invoke(callables.getGameServers, { includeDragonwilds: true }), expectCode("permission-denied"));
});

test("malformed Palworld player rows never establish zero players or trigger idle shutdown", async (t) => {
  const f = fixture(t);
  for (const players of [[null], ["bad-row"], [123], [[]], [{ name: "Present" }, null]]) {
    f.state.playerOutput = JSON.stringify({ players });
    f.data.set("gameServerIdleState/palworld", { idleSince: f.state.now - 60 * 60_000, autoStopEligibleAt: f.state.now - 30 * 60_000 });
    const telemetry = await getGameServerTelemetryForSession({ serverId: "palworld" }, session, f.resolve);
    assert.equal(telemetry.playerCount, null, JSON.stringify(players));
    assert.deepEqual(telemetry.players, []);
    const result = await runAutoStopIdleGameServers(f.resolve);
    assert.equal(result.results[0].stopped, false);
    assert.equal((f.data.get("gameServerIdleState/palworld") as { idleSince: number | null }).idleSince, null);
  }
  assert(!f.aws.some((call) => call.kind === "StopInstancesCommand"));
});

test("callable payloads and stored audits exclude credentials, raw command output and player IPs", async (t) => {
  const f = fixture(t); callableEnvironment(t);
  for (const id of ids) {
    f.data.set(`${id === "palworld" ? "gameServerAccess" : "dragonwildsServerAccess"}/${identity}`, { enabled: true });
    f.data.set(`gameServerSettings/${id}`, { enabled: true });
  }
  f.state.playerOutput = JSON.stringify({ players: [{ name: "Visible Player", ip: "private-ip-marker", adminPassword: "injected-password-marker", rawLog: "private-log-marker" }], rawLog: "private-output-marker" });
  const payloads: unknown[] = [await invoke(callables.getGameServers, { includeDragonwilds: true })];
  for (const serverId of ids) {
    payloads.push(await invoke(callables.getGameServerStatus, { serverId }));
    payloads.push(await invoke(callables.getGameServerTelemetry, { serverId }));
    payloads.push(await invoke(callables.startGameServer, { serverId }));
    payloads.push(await invoke(callables.stopGameServer, { serverId }));
    payloads.push(await invoke(callables.listGameServerEvents, { serverId }));
  }
  payloads.push([...f.data].filter(([key]) => key.startsWith("gameServerAuditLog/")));
  const serialized = JSON.stringify(payloads);
  for (const forbidden of ["synthetic-password", "synthetic-secret", "synthetic-key", "private-ip-marker", "injected-password-marker", "private-log-marker", "private-output-marker", "StandardOutputContent", "StandardErrorContent"]) {
    assert(!serialized.includes(forbidden), forbidden);
  }
  assert(serialized.includes("Visible Player"));
});

test("query failure cannot advance idle state and Dragonwilds remains independent", async (t) => {
  const f = fixture(t);
  f.data.set("gameServerSettings/dragonwilds", { enabled: true });
  f.data.set("gameServerIdleState/palworld", { idleSince: 1, autoStopEligibleAt: 2 });
  f.state.failSsm = true;
  const telemetry = await getGameServerTelemetryForSession({ serverId: "palworld" }, session, f.resolve);
  assert.equal(telemetry.playerCount, null); assert.deepEqual(telemetry.players, []);
  const result = await runAutoStopIdleGameServers(f.resolve);
  assert.equal(result.results[0].stopped, false); assert.equal(result.results[1].stopped, false);
  assert.equal((f.data.get("gameServerIdleState/palworld") as { idleSince: number | null }).idleSince, null);
  assert(!f.aws.some((call) => call.kind === "StopInstancesCommand"));
  assert(!f.ssm.some((command) => command instanceof SendCommandCommand && command.input.InstanceIds?.includes("i-dragonwilds")));
});
