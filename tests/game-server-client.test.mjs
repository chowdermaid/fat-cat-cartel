import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

// Transform the actual Vite modules, without reading .env or connecting Firebase.
const runners = [];
async function modules({ stubs = false, persona = false, transport = false } = {}) {
  const server = await createServer({
    configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    define: {
      "import.meta.env.VITE_USE_STUBS": JSON.stringify(String(stubs)),
      "import.meta.env.VITE_DEV_AUTH_LAYER": JSON.stringify(String(persona)),
    },
    plugins: [{ name: "offline-test-boundary", enforce: "pre", load(id) {
      if (id.replaceAll("\\", "/").endsWith("/src/lib/firebase.ts")) return "export const firebaseApp = null;";
      if (transport && id.replaceAll("\\", "/").endsWith("/src/features/admin/api/adminFunctions.ts")) {
        return "export const callAdminFunction = (...args) => globalThis.gameServerTestTransport(...args);";
      }
    } }],
  });
  runners.push(server);
  const load = (file) => server.ssrLoadModule(`/src/${file}`);
  return {
    api: await load("features/gameserver/api/gameServerFunctions.ts"),
    admin: await load("features/admin/api/gameServerAccess.ts"),
    stubs: await load("features/gameserver/api/gameServerStubs.ts"),
    mock: await load("features/gameserver/api/gameServerMockState.ts"),
    fixtures: await load("features/gameserver/api/gameServerFixtures.ts"),
    personas: await load("lib/dev/personas.ts"),
    access: await load("lib/dev/gameServerAccess.ts"),
    callables: await load("lib/dev/callables.ts"),
  };
}

let direct, persona, mixed, live;
before(async () => {
  const values = new Map();
  globalThis.window = Object.assign(new EventTarget(), { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key), clear: () => values.clear(),
  } });
  globalThis.fetch = () => { throw new Error("Production calls forbidden in client tests"); };
  direct = await modules({ stubs: true });
  persona = await modules({ persona: true });
  mixed = await modules({ persona: true, stubs: true });
  live = await modules({ transport: true });
});
after(async () => { await Promise.all(runners.map((runner) => runner.close())); });

const ids = ["palworld", "dragonwilds"];
const actor = { discordUserId: "dev-boss", characterName: "Boss", isAdmin: true };
const token = "session-a";
const enable = (m, serverId, enabled = true) => m.admin.updateGameServerSettings(token, { serverId, enabled, disabledMessage: null });

test("catalog bridge matches direct stubs and persona callable request validation", async () => {
  window.localStorage.clear(); persona.personas.setSelectedDevPersona("boss");
  for (const call of [direct.stubs.stubGameServers, (data) => persona.callables.callDevAdminFunction("getGameServers", token, data)]) {
    for (const data of [{}, { includeDragonwilds: false }, { includeDragonwilds: true }]) {
      const result = await call(data);
      assert.deepEqual(result.servers.map((server) => server.id), data.includeDragonwilds ? ids : ["palworld"]);
    }
    for (const includeDragonwilds of [undefined, null, "true", "false", 0, 1, [], {}]) {
      await assert.rejects(call({ includeDragonwilds }), /includeDragonwilds must be a boolean/);
    }
  }
});

test("legacy persona catalog cannot use a Dragonwilds-only grant", async () => {
  window.localStorage.clear(); persona.personas.setSelectedDevPersona("member");
  persona.access.writeGameServerAccessStore({ "dev-member": { enabled: true } }, "dragonwilds");
  for (const data of [{}, { includeDragonwilds: false }]) {
    await assert.rejects(persona.callables.callDevAdminFunction("getGameServers", token, data), /whitelist/);
  }
  const result = await persona.callables.callDevAdminFunction("getGameServers", token, { includeDragonwilds: true });
  assert.deepEqual(result.servers.map((server) => server.id), ["dragonwilds"]);
  persona.access.writeGameServerAccessStore({}, "dragonwilds");
  await assert.rejects(persona.callables.callDevAdminFunction("getGameServers", token, { includeDragonwilds: true }), /whitelist/);
});

test("new catalog wrapper opts in and preserves session-specific in-flight deduplication", async () => {
  const pending = [];
  globalThis.gameServerTestTransport = (...args) => new Promise((resolve) => pending.push({ args, resolve }));
  const first = live.api.getGameServers("catalog-a");
  assert.equal(first, live.api.getGameServers("catalog-a"));
  const other = live.api.getGameServers("catalog-b");
  assert.notEqual(first, other);
  assert.deepEqual(pending.map(({ args }) => args.slice(0, 3)), [
    ["getGameServers", "catalog-a", { includeDragonwilds: true }],
    ["getGameServers", "catalog-b", { includeDragonwilds: true }],
  ]);
  pending.forEach(({ resolve }) => resolve({ ok: true, servers: [] }));
  await Promise.all([first, other]);
});

test("deterministic fixtures distinguish unknown telemetry, lifecycle and future counts", () => {
  const fixture = direct.fixtures.gameServerFixture;
  for (const scenario of ["stopped", "pending", "running", "stopping", "disabled", "unavailable", "telemetry-failure"]) {
    const current = fixture("dragonwilds", scenario);
    assert.deepEqual(current, fixture("dragonwilds", scenario));
    assert.equal(current.status, scenario === "telemetry-failure" ? "running" : scenario);
    assert.equal(current.playerCount, null);
    assert.deepEqual(current.players, []);
    assert.equal(current.connectAddress, current.status === "running" ? "dragonwilds.stub.local:7777" : null);
    assert.equal(current.autoStopEligibleAt, null);
    assert.equal(current.idleSince, null);
    assert.equal("worldName" in current, !["disabled", "unavailable"].includes(scenario));
  }
  for (const [scenario, count] of [["synthetic-zero", 0], ["synthetic-count-only", 2]]) {
    const current = fixture("dragonwilds", scenario);
    assert.equal(current.playerCount, count);
    assert.deepEqual(current.players, []);
    assert.equal(current.maxPlayers, null);
    assert.match(current.telemetryMessage, /Synthetic future-UI/);
  }
  assert.deepEqual(Object.keys(fixture("palworld", "running").players[0]).sort(),
    ["name", "accountName", "playerId", "userId", "ping", "level"].sort());
  assert.equal(fixture("palworld", "telemetry-failure").playerCount, null);
});

for (const mode of ["direct", "persona", "mixed"]) {
  test(`${mode}: isolated actions, settings, catalog, telemetry and bounded audits`, async () => {
    window.localStorage.clear();
    const m = mode === "direct" ? direct : mode === "persona" ? persona : mixed;
    m.personas.setSelectedDevPersona("boss");
    assert.equal((await m.admin.getGameServerSettings(token)).settings.serverId, "palworld");
    assert.equal((await m.admin.getGameServerSettings(token, "dragonwilds")).settings.enabled, false);
    const catalog = await m.api.getGameServers(token);
    assert.deepEqual(catalog.servers.map((s) => s.id), ids);
    assert.equal(catalog.servers[1].route, "/gameserver/dragonwilds");
    assert.ok(catalog.servers.every((s) => !("worldName" in s)));
    await enable(m, "dragonwilds");
    await m.api.startGameServer(token, "palworld");
    await m.api.startGameServer(token, "dragonwilds");
    assert.equal((await m.api.getGameServerTelemetry(token, "dragonwilds")).playerCount, null);
    assert.ok((await m.api.getGameServerStatus(token, "dragonwilds")).worldName);
    for (const id of ids) {
      const other = ids.find((value) => value !== id);
      await m.api.stopGameServer(token, id);
      assert.equal((await m.api.getGameServerStatus(token, other)).status, "running");
      await m.api.startGameServer(token, id);
      await enable(m, id, false);
      assert.equal((await m.api.getGameServerStatus(token, id)).status, "disabled");
      assert.equal((await m.api.getGameServerStatus(token, other)).status, "running");
      await assert.rejects(m.api.startGameServer(token, id), /disabled/);
      await enable(m, id);
      for (let i = 0; i < 55; i++) await m.api.startGameServer(token, id);
      const events = await m.api.listGameServerEvents(token, id);
      const audit = await m.admin.listGameServerAuditLog(token, id);
      assert.equal(events.entries.length, 5);
      assert.equal(audit.entries.length, 25);
      assert.ok(audit.entries.every((entry) => entry.serverId === id));
      assert.equal(audit.entries[0].result, "noop");
    }
    if (mode !== "direct") {
      const stored = JSON.parse(window.localStorage.getItem("fcc_dev_data_game-server-audit"));
      assert.equal(stored.palworld.length, 50);
      assert.equal(stored.dragonwilds.length, 50);
    }
  });
}

test("mock state retains fifty entries per game and blocks transitional actions", () => {
  const state = direct.mock.createGameServerMockState("direct");
  for (const id of ids) {
    state.fixture(id, "pending");
    assert.equal(state.action(id, "start", actor).status, "pending");
    assert.throws(() => state.action(id, "stop", actor), /cannot stop/);
    state.fixture(id, "stopping");
    assert.equal(state.action(id, "stop", actor).status, "stopping");
    assert.throws(() => state.action(id, "start", actor), /cannot start/);
    state.fixture(id, "running");
    for (let i = 0; i < 60; i++) state.action(id, "start", actor);
    assert.equal(state.events(id, 100).entries.length, 50);
  }
});

test("both local modes expose lifecycle and telemetry fixtures through their APIs", async () => {
  persona.personas.setSelectedDevPersona("boss");
  for (const m of [direct, persona]) {
    const select = m === direct ? m.stubs.setStubGameServerFixture : m.callables.setDevGameServerFixture;
    for (const scenario of ["pending", "stopping", "unavailable", "telemetry-failure", "synthetic-zero", "synthetic-count-only"]) {
      select("dragonwilds", scenario);
      const status = await m.api.getGameServerStatus(token, "dragonwilds");
      const telemetry = await m.api.getGameServerTelemetry(token, "dragonwilds");
      assert.equal(status.playerCount, scenario === "synthetic-zero" ? 0 : scenario === "synthetic-count-only" ? 2 : null);
      assert.equal(telemetry.playerCount, status.playerCount);
      assert.equal(status.autoStopEligibleAt, null);
    }
    select("dragonwilds", "disabled");
    const a = m.api.getGameServerStatus("a", "dragonwilds");
    assert.equal(a, m.api.getGameServerStatus("a", "dragonwilds"));
    const b = m.api.getGameServerStatus("b", "dragonwilds");
    assert.notEqual(a, b);
    await Promise.all([a, b]);
  }
});

test("legacy migration preserves Palworld data, grants, auth keys and unrelated storage", async () => {
  window.localStorage.clear();
  const original = {
    "admin_session_token": "keep-session", "admin_session_is_admin": "true",
    "fcc_dev_data_calendar": '{"requests":[]}',
    "fcc_dev_data_game-server-access": '{"dev-member":{"enabled":true}}',
  };
  for (const [key, value] of Object.entries(original)) window.localStorage.setItem(key, value);
  const settings = { serverId: "palworld", enabled: false, disabledMessage: "maintenance", updatedAt: 123, updatedBy: "old-admin" };
  const audit = [{ id: "existing", serverId: "palworld", createdAt: 456 }];
  window.localStorage.setItem("fcc_dev_data_game-server-status", "running");
  window.localStorage.setItem("fcc_dev_data_game-server-settings", JSON.stringify(settings));
  window.localStorage.setItem("fcc_dev_data_game-server-audit", JSON.stringify(audit));
  persona.personas.setSelectedDevPersona("boss");
  assert.deepEqual((await persona.admin.getGameServerSettings(token)).settings, settings);
  assert.deepEqual((await persona.admin.listGameServerAuditLog(token)).entries, audit);
  await enable(persona, "dragonwilds");
  assert.equal((await persona.api.getGameServerStatus(token, "dragonwilds")).status, "stopped");
  assert.deepEqual((await persona.admin.getGameServerSettings(token)).settings, settings);
  await enable(persona, "palworld");
  assert.equal((await persona.api.getGameServerStatus(token, "palworld")).status, "running");
  for (const [key, value] of Object.entries(original)) assert.equal(window.localStorage.getItem(key), value);
});

test("invalid explicit IDs rejected in both transports; only optional handlers accept omission", async () => {
  persona.personas.setSelectedDevPersona("boss");
  for (const m of [direct, persona]) {
    for (const id of ["unknown", " Palworld ", "", null, 123]) {
      for (const invoke of [m.api.getGameServerStatus, m.api.getGameServerTelemetry, m.api.startGameServer,
        m.api.stopGameServer, m.api.listGameServerEvents, m.admin.getGameServerSettings, m.admin.listGameServerAuditLog]) {
        await assert.rejects(invoke(token, id), /valid game server/);
      }
      await assert.rejects(enable(m, id), /valid game server/);
    }
  }
  const call = persona.callables.callDevAdminFunction;
  for (const name of ["getGameServerStatus", "getGameServerTelemetry", "startGameServer", "stopGameServer", "updateGameServerSettings"]) {
    await assert.rejects(call(name, token, {}), /valid game server/);
  }
  for (const name of ["getGameServerSettings", "listGameServerEvents", "listGameServerAuditLog"]) {
    await call(name, token, {});
    await assert.rejects(call(name, token, { serverId: undefined }), /valid game server/);
  }
});

for (const mode of ["persona", "mixed"]) {
  test(`${mode}: independent grants, revocation and admin bypass`, async () => {
    const m = mode === "persona" ? persona : mixed;
    window.localStorage.clear();
    m.personas.setSelectedDevPersona("boss");
    await enable(m, "dragonwilds");
    const grant = (serverId, extra = {}) => m.admin.upsertGameServerAccess(token, {
      discordUserId: "dev-member", displayName: "Member", enabled: true, expiresAt: null, notes: null, ...extra,
    }, serverId);
    for (const allowed of [[], ["palworld"], ["dragonwilds"], ids]) {
      m.personas.setSelectedDevPersona("boss");
      for (const id of ids) await m.admin.deleteGameServerAccess(token, "dev-member", id);
      for (const id of allowed) await grant(id);
      m.personas.setSelectedDevPersona("member");
      const session = await m.callables.callDevAdminFunction("getAdminSession", token);
      assert.equal(session.canUseGameServers, allowed.length > 0);
      assert.deepEqual(session.gameServerAccessById, { palworld: allowed.includes("palworld"), dragonwilds: allowed.includes("dragonwilds") });
      if (allowed.length) assert.deepEqual((await m.api.getGameServers(token)).servers.map((item) => item.id), allowed);
      else await assert.rejects(m.api.getGameServers(token), /whitelist/);
      for (const id of ids) {
        assert.equal((await m.api.getGameServerAccessStatus(token, id)).canUseGameServers, allowed.includes(id));
        for (const operation of [m.api.getGameServerStatus, m.api.getGameServerTelemetry, m.api.listGameServerEvents, m.api.startGameServer, m.api.stopGameServer]) {
          if (allowed.includes(id)) await operation(token, id);
          else await assert.rejects(operation(token, id), /whitelist/);
        }
        for (const operation of [m.admin.getGameServerSettings, m.admin.listGameServerAuditLog, m.admin.listGameServerAccess, m.admin.listGameServerAccessCandidates]) {
          await assert.rejects(operation(token, id), /Boss or Underpaw/);
        }
        await assert.rejects(grant(id), /Boss or Underpaw/);
      }
    }
    for (const id of ids) {
      for (const invalid of [{ enabled: false }, { enabled: true, expiresAt: Date.now() - 1 }, { enabled: true, expiresAt: "bad" }, { enabled: true, discordUserId: "wrong" }]) {
        m.access.writeGameServerAccessStore({ "dev-member": invalid }, id);
        assert.equal((await m.api.getGameServerAccessStatus(token, id)).canUseGameServers, false);
        await assert.rejects(m.api.startGameServer(token, id), /whitelist/);
      }
    }
    m.personas.setSelectedDevPersona("underpaw");
    assert.equal((await m.api.getGameServers(token)).servers.length, 2);
    m.personas.setSelectedDevPersona("guest");
    await assert.rejects(m.api.getGameServers(token), /not authenticated/);
  });
}

test("development capability subscription refreshes on writes, storage, persona and expiry", async () => {
  window.localStorage.clear();
  persona.personas.setSelectedDevPersona("member");
  const seen = [];
  const unsubscribe = persona.access.subscribeDevGameServerAccess(() => seen.push(persona.access.devGameServerAccessStatus().canUseGameServers));
  try {
    const write = (entry) => persona.access.writeGameServerAccessStore({ "dev-member": entry });
    write({ enabled: true, expiresAt: null }); assert.equal(seen.at(-1), true);
    write({ enabled: false }); assert.equal(seen.at(-1), false);
    write({ enabled: true, expiresAt: Date.now() + 30 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(seen.at(-1), false);
    window.localStorage.setItem("fcc_dev_data_game-server-access", '{"dev-member":{"enabled":true}}');
    window.dispatchEvent(new Event("storage")); assert.equal(seen.at(-1), true);
    persona.access.writeGameServerAccessStore({}); assert.equal(seen.at(-1), false);
    persona.personas.setSelectedDevPersona("boss"); assert.equal(seen.at(-1), true);
  } finally { unsubscribe(); }
});

test("in-flight reads deduplicate only identical sessions, games and operations", async () => {
  const pending = [];
  globalThis.gameServerTestTransport = (...args) => new Promise((resolve, reject) => pending.push({ args, resolve, reject }));
  for (const read of [live.api.getGameServerAccessStatus, live.api.getGameServerStatus, live.api.getGameServerTelemetry, live.api.listGameServerEvents]) {
    const a = read("a", "palworld");
    assert.equal(a, read("a", "palworld"));
    const b = read("b", "palworld"), c = read("a", "dragonwilds");
    assert.notEqual(a, b); assert.notEqual(a, c);
    const requests = pending.splice(0);
    assert.equal(requests.length, 3);
    assert.deepEqual(requests.map((r) => r.args.slice(1, 3)), [["a", { serverId: "palworld" }], ["b", { serverId: "palworld" }], ["a", { serverId: "dragonwilds" }]]);
    requests.forEach((r) => r.resolve({ ok: true })); await Promise.all([a, b, c]);
    const retry = read("a", "palworld"); assert.notEqual(retry, a);
    pending.pop().reject(new Error("test failure")); await assert.rejects(retry);
    const afterFailure = read("a", "palworld"); pending.pop().resolve({ ok: true }); await afterFailure;
  }
  for (const [invoke, name, id] of [[live.admin.getGameServerSettings, "getGameServerSettings", "dragonwilds"],
    [live.admin.getGameServerSettings, "getGameServerSettings", undefined],
    [live.api.startGameServer, "startGameServer", "dragonwilds"], [live.api.stopGameServer, "stopGameServer", "dragonwilds"]]) {
    const response = invoke(token, id); const request = pending.pop();
    assert.deepEqual(request.args.slice(0, 3), [name, token, { serverId: id ?? "palworld" }]);
    request.resolve({ ok: true }); await response;
  }
});

test("persona change or revoke cannot reuse another authorization's pending read", async () => {
  window.localStorage.clear();
  mixed.personas.setSelectedDevPersona("boss");
  const allowed = mixed.api.getGameServerStatus(token, "palworld");
  mixed.personas.setSelectedDevPersona("member");
  const denied = mixed.api.getGameServerStatus(token, "palworld");
  assert.notEqual(allowed, denied); await allowed; await assert.rejects(denied, /whitelist/);
  persona.access.writeGameServerAccessStore({ "dev-member": { enabled: true } });
  const granted = mixed.api.getGameServerStatus(token, "palworld");
  persona.access.writeGameServerAccessStore({});
  const revoked = mixed.api.getGameServerStatus(token, "palworld");
  assert.notEqual(granted, revoked); await granted; await assert.rejects(revoked, /whitelist/);
});

test("direct stub grant management preserves Palworld store and uses independent Dragonwilds entries", async () => {
  window.localStorage.clear();
  const entry = { discordUserId: "123456789012345678", displayName: "Offline Friend", enabled: true, expiresAt: null, notes: "Pal note" };
  await direct.admin.upsertGameServerAccess(token, entry);
  const saved = window.localStorage.getItem("fcc_dev_data_game-server-access");
  assert.deepEqual((await direct.admin.listGameServerAccess(token, "dragonwilds")).entries, []);
  await direct.admin.upsertGameServerAccess(token, { ...entry, enabled: false, notes: "Dragon note", expiresAt: Date.now() + 60_000 }, "dragonwilds");
  assert.equal(window.localStorage.getItem("fcc_dev_data_game-server-access"), saved);
  const dragon = await direct.admin.listGameServerAccess(token, "dragonwilds");
  assert.equal(dragon.entries[0].notes, "Dragon note"); assert.equal(dragon.entries[0].enabled, false);
  assert.equal((await direct.admin.listGameServerAccessCandidates(token, "dragonwilds")).legacyEntries.length, 1);
  await direct.admin.deleteGameServerAccess(token, entry.discordUserId, "dragonwilds");
  assert.equal(window.localStorage.getItem("fcc_dev_data_game-server-access"), saved);
  await assert.rejects(direct.admin.listGameServerAccess(token, "unknown"), /valid game server/);
});

test("capability subscription watches earliest expiry and re-arms while aggregate remains allowed", async (t) => {
  window.localStorage.clear(); persona.personas.setSelectedDevPersona("member");
  let now = 1_800_000_000_000, sequence = 0; const timers = new Map(), seen = [];
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (fn, delay) => { timers.set(++sequence, { fn, due: now + delay }); return sequence; });
  t.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));
  persona.access.writeGameServerAccessStore({ "dev-member": { enabled: true, expiresAt: now + 100 } }, "palworld");
  persona.access.writeGameServerAccessStore({ "dev-member": { enabled: true, expiresAt: now + 200 } }, "dragonwilds");
  const unsubscribe = persona.access.subscribeDevGameServerAccess(() => seen.push(persona.access.devGameServerCapabilities()));
  const fire = () => { assert.equal(timers.size, 1); const [id, timer] = [...timers][0]; timers.delete(id); now = timer.due; timer.fn(); };
  assert.deepEqual(seen.at(-1).gameServerAccessById, { palworld: true, dragonwilds: true });
  fire(); assert.deepEqual(seen.at(-1).gameServerAccessById, { palworld: false, dragonwilds: true }); assert.equal(seen.at(-1).canUseGameServers, true);
  fire(); assert.equal(seen.at(-1).canUseGameServers, false); assert.equal(timers.size, 0);
  persona.access.writeGameServerAccessStore({ "dev-member": { enabled: true } }, "palworld");
  window.localStorage.setItem("fcc_dev_data_dragonwilds-server-access", '{"dev-member":{"enabled":true}}');
  window.dispatchEvent(new Event("storage"));
  assert.deepEqual(seen.at(-1).gameServerAccessById, { palworld: true, dragonwilds: true });
  unsubscribe(); assert.equal(timers.size, 0);
});

test("one game revocation changes development dedup identity while aggregate stays true", async () => {
  window.localStorage.clear(); mixed.personas.setSelectedDevPersona("member");
  mixed.access.writeGameServerAccessStore({ "dev-member": { enabled: true } }, "palworld");
  mixed.access.writeGameServerAccessStore({ "dev-member": { enabled: true } }, "dragonwilds");
  const old = mixed.api.getGameServerStatus(token, "dragonwilds");
  mixed.access.writeGameServerAccessStore({}, "dragonwilds");
  const denied = mixed.api.getGameServerStatus(token, "dragonwilds");
  assert.equal(mixed.access.devGameServerCapabilities().canUseGameServers, true);
  assert.notEqual(old, denied); await old; await assert.rejects(denied, /whitelist/);
  assert.deepEqual((await mixed.api.getGameServers(token)).servers.map((server) => server.id), ["palworld"]);
});

test("access-status and grant wrappers reject invalid explicit games in offline modes", async () => {
  for (const m of [direct, persona, mixed]) {
    m.personas.setSelectedDevPersona("boss");
    await assert.rejects(m.api.getGameServerAccessStatus(token, "unknown"), /valid game server/);
    for (const operation of [m.admin.listGameServerAccess, m.admin.listGameServerAccessCandidates]) {
      await assert.rejects(operation(token, "unknown"), /valid game server/);
    }
  }
});
