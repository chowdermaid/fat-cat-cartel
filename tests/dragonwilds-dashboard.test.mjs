import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRootRoute, createRouter, createMemoryHistory, RouterContextProvider } from "@tanstack/react-router";

let runner, createController, emptyState, fixture, utils, OnlineBoard, Page, CatalogCard;
before(async () => {
  runner = await createServer({ configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } },
    oxc: { jsx: { runtime: "automatic" } },
    plugins: [{ name: "offline-render-boundary", enforce: "pre",
      load(id) {
        if (id.replaceAll("\\", "/").endsWith("/hooks/useGameServerAuth.ts")) return "export const useGameServerAuth = () => globalThis.dragonwildsTestAuth;";
        if (id.replaceAll("\\", "/").endsWith("/hooks/useDragonwildsServer.ts")) return "export const useDragonwildsServer = () => globalThis.dragonwildsTestServer;";
      },
    }],
  });
  const load = (file) => runner.ssrLoadModule(`/src/features/gameserver/${file}`);
  ({ createDragonwildsController: createController, emptyDragonwildsState: emptyState } = await load("hooks/dragonwildsController.ts"));
  ({ gameServerFixture: fixture } = await load("api/gameServerFixtures.ts"));
  utils = await load("utils/dragonwilds.ts");
  ({ DragonwildsOnlineBoard: OnlineBoard } = await load("components/dragonwilds/DragonwildsOnlineBoard.tsx"));
  ({ DragonwildsServerPage: Page } = await load("components/DragonwildsServerPage.tsx"));
  ({ DragonwildsServerIndexCard: CatalogCard } = await load("components/dragonwilds/DragonwildsServerIndexCard.tsx"));
});
after(async () => runner?.close());

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const ctx = (identity = "a") => ({ identity, token: "same-persona-token" });
const snapshot = (scenario = "running") => fixture("dragonwilds", scenario);
function setup(overrides = {}) {
  const calls = [], timers = new Map();
  let timerId = 0;
  const api = {
    status: async () => { calls.push("status"); return snapshot(); },
    telemetry: async () => { calls.push("telemetry"); return snapshot(); },
    events: async () => { calls.push("events"); return { ok: true, entries: [] }; },
    action: async (_token, action) => { calls.push(action); return snapshot(action === "start" ? "pending" : "stopping"); },
    schedule: (callback, delay) => { assert.equal(delay, 10_000); timers.set(++timerId, callback); return timerId; },
    cancel: (id) => timers.delete(id), ...overrides,
  };
  const controller = createController(api);
  return { controller, calls, timers, tick: async () => {
    assert.equal(timers.size, 1);
    const [id, callback] = timers.entries().next().value;
    timers.delete(id); callback(); await flush();
  } };
}

test("fast status precedes telemetry; activity and refresh reads stay independent", async () => {
  const status = deferred();
  const x = setup({ status: () => { x.calls.push("status"); return status.promise; } });
  x.controller.connect(ctx());
  assert.deepEqual(x.calls, ["status", "events"]);
  status.resolve(snapshot()); await flush();
  assert.deepEqual(x.calls, ["status", "events", "telemetry"]);
  await x.controller.refreshStatus(); await flush();
  assert.deepEqual(x.calls.slice(3), ["status", "telemetry"]);
  await x.controller.refreshEvents();
  assert.equal(x.calls.at(-1), "events");
  assert.equal(x.timers.size, 0);
});

test("all fixtures render honest counts; offline/disabled never request telemetry", async () => {
  for (const scenario of ["stopped", "pending", "running", "stopping", "disabled", "unavailable", "telemetry-failure", "synthetic-zero", "synthetic-count-only"]) {
    const data = snapshot(scenario);
    const x = setup({ status: async () => data, telemetry: async () => { x.calls.push("telemetry"); return data; } });
    x.controller.connect(ctx()); await flush();
    const html = renderToStaticMarkup(createElement(OnlineBoard, { state: x.controller.getSnapshot() }));
    assert.match(html, scenario === "synthetic-zero" ? /0 online/ : scenario === "synthetic-count-only" ? /2 online/ : /Player count unavailable/);
    assert.equal(x.calls.includes("telemetry"), data.status === "running");
    assert.equal(x.timers.size, 0);
    x.controller.disconnect();
  }
});

test("count independent of names; invalid counts/capacity/RAM and missing launch time stay honest", () => {
  const state = { ...emptyState(), status: snapshot(), telemetry: { ...snapshot(), playerCount: 2, maxPlayers: 6, players: [{ name: "Synthetic Cat" }] } };
  let html = renderToStaticMarkup(createElement(OnlineBoard, { state }));
  assert.match(html, /2 \/ 6 online/); assert.match(html, /Synthetic Cat/); assert.match(html, /Telemetry attempted/);
  for (const count of [null, undefined, NaN, Infinity, -1, 0.5, "2"]) {
    assert.equal(utils.onlineLabel(count, 6), "Player count unavailable");
  }
  assert.equal(utils.onlineLabel(2, null), "2 online");
  assert.equal(utils.onlineLabel(2, 1), "2 online");
  assert.equal(utils.onlineLabel(0, 6), "0 / 6 online");
  for (const memory of [null, NaN, Infinity, -1, 101]) assert.equal(utils.memoryLabel(memory), "Unavailable");
  assert.equal(utils.memoryLabel(47), "47% used");
  assert.equal(utils.uptimeLabel(null, Date.now()), "Unavailable");
  assert.equal(utils.uptimeLabel("invalid", Date.now()), "Unavailable");
  assert.equal(utils.uptimeLabel(new Date(100).toISOString(), 50), "Unavailable");
  state.telemetry.playerCount = null;
  html = renderToStaticMarkup(createElement(OnlineBoard, { state }));
  assert.doesNotMatch(html, /Synthetic Cat/);
  state.loadingStatus = true;
  html = renderToStaticMarkup(createElement(OnlineBoard, { state }));
  assert.match(html, /Checking online status/); assert.doesNotMatch(html, /Synthetic Cat/);
});

test("null action fields replace old fields, omitted fields retain values", () => {
  const before = { ...snapshot(), playerCount: 2, worldName: "Old world" };
  const after = utils.dragonwildsActionStatus({ ok: true, serverId: "dragonwilds", status: "running", message: "No change", playerCount: null, worldName: null }, before);
  assert.equal(after.playerCount, null); assert.equal(after.worldName, null);
  assert.equal(after.launchTime, before.launchTime);
});

test("refresh clears snapshot; failed telemetry leaves running controls usable", async () => {
  let fail = false;
  const x = setup({ telemetry: async () => { if (fail) throw new Error("Metrics unavailable"); return { ...snapshot(), playerCount: 2 }; } });
  x.controller.connect(ctx()); await flush();
  assert.equal(x.controller.getSnapshot().telemetry.playerCount, 2);
  fail = true;
  const refresh = x.controller.refreshStatus();
  assert.equal(x.controller.getSnapshot().telemetry, null);
  await refresh; await flush();
  assert.equal(x.controller.getSnapshot().telemetry, null);
  assert.equal(x.controller.getSnapshot().telemetryError, "Metrics unavailable");
  assert.equal(utils.canDragonwildsAct(x.controller.getSnapshot(), "stop"), true);
});

test("superseded telemetry cannot restore a stopped or disabled snapshot", async () => {
  for (const scenario of ["stopped", "disabled"]) {
    const telemetry = deferred(); let current = "running";
    const x = setup({ status: async () => snapshot(current), telemetry: () => telemetry.promise });
    x.controller.connect(ctx()); await flush();
    current = scenario; await x.controller.refreshStatus();
    telemetry.resolve({ ...snapshot(), playerCount: 2 }); await flush();
    assert.equal(x.controller.getSnapshot().status.status, scenario);
    assert.equal(x.controller.getSnapshot().telemetry, null);
  }
});

test("newer status request rejects stale results and starts a fresh read after dedup settles", async () => {
  const first = deferred(); let reads = 0;
  const x = setup({ status: () => ++reads === 1 ? first.promise : Promise.resolve(snapshot("stopped")) });
  x.controller.connect(ctx());
  const refresh = x.controller.refreshStatus();
  first.resolve(snapshot()); await refresh; await flush();
  assert.equal(reads, 2);
  assert.equal(x.controller.getSnapshot().status.status, "stopped");
  assert.equal(x.calls.includes("telemetry"), false);
});

test("pending responses cannot cross allowed personas, including A to B to A", async () => {
  for (const operation of ["status", "telemetry", "events", "action"]) {
    const late = deferred(); let reads = 0;
    const x = setup({ [operation]: () => ++reads === 1 ? late.promise : Promise.resolve(operation === "events" ? { entries: [] } : snapshot("stopped")) });
    x.controller.connect(ctx("a")); await flush();
    const action = operation === "action" ? x.controller.runAction("stop") : null;
    x.controller.connect(ctx("b")); await flush();
    x.controller.connect(ctx("a")); await flush();
    late.resolve(operation === "events" ? { entries: [{ id: "secret", serverId: "dragonwilds", createdAt: 1 }] } : { ...snapshot(), worldName: "Old protected world" });
    await action; await flush();
    const state = x.controller.getSnapshot();
    assert.equal(state.identity, "a");
    assert.notEqual(state.status?.worldName, "Old protected world");
    assert.equal(state.events.some((entry) => entry.id === "secret"), false);
    assert.equal(state.action, null);
    x.controller.disconnect();
  }
});

test("access denial in each request category clears every protected field", async () => {
  for (const operation of ["status", "telemetry", "events", "action"]) {
    const late = deferred();
    const x = setup({ [operation]: () => late.promise });
    x.controller.connect(ctx()); await flush();
    const action = operation === "action" ? x.controller.runAction("stop") : null;
    late.reject(Object.assign(new Error("Denied"), { code: "functions/permission-denied" }));
    await action; await flush();
    const state = x.controller.getSnapshot();
    assert.equal(state.accessDenied, true, operation);
    assert.equal(state.status, null); assert.equal(state.telemetry, null); assert.deepEqual(state.events, []);
    assert.equal(state.action, null); assert.equal(state.loadingStatus, false); assert.equal(x.timers.size, 0);
  }
});

test("late response after disconnect or current-identity loss is ignored", async () => {
  for (const disconnect of [true, false]) {
    const late = deferred(); let allowed = true;
    const x = setup({ status: () => late.promise });
    x.controller.connect({ ...ctx(), isCurrent: () => allowed });
    if (disconnect) x.controller.disconnect(); else allowed = false;
    late.resolve(snapshot()); await flush();
    assert.equal(x.controller.getSnapshot().status, null);
    assert.equal(x.calls.includes("telemetry"), false);
  }
});

test("startup polling has exactly 48 attempts, no overlapping requests or telemetry on pending polls", async () => {
  let phase = "stopped", reads = 0;
  const x = setup({ status: async () => { reads++; return snapshot(phase); }, action: async () => { phase = "pending"; return snapshot(phase); } });
  x.controller.connect(ctx()); await flush();
  await x.controller.runAction("start");
  assert.equal(reads, 2);
  for (let i = 0; i < 48; i++) await x.tick();
  assert.equal(reads, 50); assert.equal(x.timers.size, 0);
  assert.equal(x.controller.getSnapshot().waitingForHost, false);
  assert.match(x.controller.getSnapshot().notice, /still starting/);
  assert.equal(x.calls.includes("telemetry"), false);
});

test("running host ends waiting without readiness claim; Stop never starts polling", async () => {
  let phase = "stopped";
  const x = setup({ status: async () => snapshot(phase), action: async (_token, action) => { phase = action === "start" ? "pending" : "stopping"; return snapshot(phase); } });
  x.controller.connect(ctx()); await flush(); await x.controller.runAction("start");
  phase = "running"; await x.tick();
  assert.equal(x.timers.size, 0); assert.equal(x.calls.filter((call) => call === "telemetry").length, 1);
  assert.match(x.controller.getSnapshot().notice, /readiness unverified/);
  await x.controller.runAction("stop"); assert.equal(x.timers.size, 0);
});

test("manual refresh, disconnect, terminal status and failure all end startup waiting", async () => {
  for (const end of ["manual", "disconnect", "stopped", "disabled", "unavailable", "failure"]) {
    let phase = "stopped";
    const x = setup({ status: async () => { if (phase === "failure") throw new Error("Host unavailable"); return snapshot(phase); }, action: async () => { phase = "pending"; return snapshot(phase); } });
    x.controller.connect(ctx()); await flush(); await x.controller.runAction("start");
    if (end === "manual") await x.controller.refreshStatus();
    else if (end === "disconnect") x.controller.disconnect();
    else { phase = end; await x.tick(); }
    assert.equal(x.timers.size, 0, end); assert.equal(x.controller.getSnapshot().waitingForHost, false, end);
  }
});

test("controls reject double actions, invalid lifecycle states and failed/no-op results do not invent transitions", async () => {
  for (const scenario of ["pending", "stopping", "disabled", "unavailable"]) {
    const x = setup({ status: async () => snapshot(scenario) }); x.controller.connect(ctx()); await flush();
    await x.controller.runAction("start"); await x.controller.runAction("stop");
    assert.equal(x.calls.includes("start") || x.calls.includes("stop"), false);
  }
  for (const ok of [false, true]) {
    const action = deferred(); let calls = 0;
    const x = setup({ status: async () => snapshot("stopped"), action: () => { calls++; return action.promise; } });
    x.controller.connect(ctx()); await flush();
    const pending = x.controller.runAction("start"); await x.controller.runAction("start");
    assert.equal(calls, 1);
    action.resolve({ ...snapshot("stopped"), ok, message: ok ? "No change" : "Action blocked" }); await pending;
    assert.equal(x.controller.getSnapshot().notice, ok ? "No change" : "Action blocked");
    assert.equal(x.timers.size, 0);
  }
});

test("activity keeps newest five Dragonwilds entries; stopped transition ignores stale event read", async () => {
  const entries = Array.from({ length: 9 }, (_, i) => ({ id: String(i), serverId: i === 8 ? "palworld" : "dragonwilds", createdAt: i }));
  const late = deferred(); let calls = 0, phase = "running";
  const x = setup({ status: async () => snapshot(phase), events: () => ++calls === 1 ? Promise.resolve({ entries }) : late.promise });
  x.controller.connect(ctx()); await flush();
  assert.deepEqual(x.controller.getSnapshot().events.map((entry) => entry.id), ["7", "6", "5", "4", "3"]);
  const pending = x.controller.refreshEvents(); phase = "stopped"; await x.controller.refreshStatus();
  late.resolve({ entries }); await pending;
  assert.deepEqual(x.controller.getSnapshot().events, []);
  assert.equal(calls, 2);
});

test("page renders explicit auth states and authorized connection details", async () => {
  const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory({ initialEntries: ["/"] }) });
  await router.load();
  const withRouter = (element) => renderToStaticMarkup(createElement(RouterContextProvider, { router }, element));
  const state = { ...emptyState(), status: snapshot(), telemetry: snapshot() };
  globalThis.dragonwildsTestServer = { state, refreshStatus() {}, refreshEvents() {}, runAction() {} };
  globalThis.dragonwildsTestAuth = { authed: false, checking: true, canUseGameServers: false, login() {} };
  const render = () => withRouter(createElement(Page));
  assert.match(render(), /Checking Dragonwilds access/);
  globalThis.dragonwildsTestAuth.checking = false;
  assert.match(render(), /Login with Discord/);
  globalThis.dragonwildsTestAuth.authed = true;
  assert.match(render(), /Dragonwilds access required/);
  globalThis.dragonwildsTestAuth.canUseGameServers = true;
  let html = render();
  assert.match(html, /Live\./);
  assert.match(html, /Automatic idle shutdown inactive/);
  assert.match(html, /Copy world name/);
  assert.match(html, /Copy Address/);
  assert.match(html, /Server password/);
  assert.match(html, />123</);
  assert.doesNotMatch(html, /Online board/);
  assert.doesNotMatch(html, /Ready to join|GB RAM/);
  state.status.worldName = null;
  assert.doesNotMatch(render(), /Copy world name/);
  state.status = snapshot("disabled"); state.status.disabledMessage = "Closed for maintenance";
  html = render(); assert.match(html, /Closed for maintenance/); assert.doesNotMatch(html, /Copy world name/);
  state.accessDenied = true;
  html = render(); assert.match(html, /Dragonwilds access required/); assert.doesNotMatch(html, /Closed for maintenance/);
  const card = withRouter(createElement(CatalogCard, { server: { id: "dragonwilds", name: "Dragonwilds", status: "running", description: "Dedicated server", region: "ap-southeast-2", enabled: true } }));
  assert.match(card, /href="\/gameserver\/dragonwilds"/);
  assert.match(card, /runescape-banner\.jpg/);
  assert.match(card, /game readiness unverified/);
  assert.doesNotMatch(card, /Palworld|Ready to join|Connection/);
});

test("cleanup and reconnect lifecycle discards old requests and timers", async () => {
  const late = deferred(); let reads = 0;
  const x = setup({ status: () => ++reads === 1 ? late.promise : Promise.resolve(snapshot("stopped")) });
  let updates = 0;
  const unsubscribe = x.controller.subscribe(() => updates++);
  x.controller.connect(ctx());
  x.controller.disconnect();
  x.controller.connect(ctx());
  late.resolve(snapshot()); await flush();
  assert.equal(x.controller.getSnapshot().status.status, "stopped");
  unsubscribe(); const before = updates;
  x.controller.disconnect();
  assert.equal(updates, before); assert.equal(x.timers.size, 0);
});

test("an in-flight polling read cannot overlap another tick or survive superseding refresh", async () => {
  const late = deferred(); let phase = "stopped", reads = 0;
  const x = setup({ status: () => { reads++; return reads === 3 ? late.promise : Promise.resolve(snapshot(phase)); }, action: async () => { phase = "pending"; return snapshot(phase); } });
  x.controller.connect(ctx()); await flush(); await x.controller.runAction("start");
  await x.tick();
  assert.equal(x.timers.size, 0); assert.equal(reads, 3);
  phase = "stopped";
  const refresh = x.controller.refreshStatus();
  late.resolve(snapshot("running")); await refresh; await flush();
  assert.equal(x.controller.getSnapshot().status.status, "stopped");
  assert.equal(x.timers.size, 0); assert.equal(x.calls.includes("telemetry"), false);
});

test("denied activity invalidates concurrently pending telemetry and notifications", async () => {
  const telemetry = deferred(), events = deferred();
  const x = setup({ telemetry: () => telemetry.promise, events: () => events.promise });
  x.controller.connect(ctx()); await flush();
  events.reject(Object.assign(new Error("Session expired"), { code: "functions/unauthenticated" }));
  await flush();
  telemetry.resolve({ ...snapshot(), playerCount: 2, players: [{ name: "Protected" }] }); await flush();
  assert.equal(x.controller.getSnapshot().accessDenied, true);
  assert.equal(x.controller.getSnapshot().telemetry, null);
  assert.equal(x.controller.getSnapshot().status, null);
  await x.controller.refreshStatus();
  assert.equal(x.controller.getSnapshot().accessDenied, true);
});

test("failed action keeps backend message and refreshes status/activity once", async () => {
  const x = setup({ status: async () => { x.calls.push("status"); return snapshot("stopped"); },
    action: async () => { throw new Error("EC2 request failed"); } });
  x.controller.connect(ctx()); await flush();
  await x.controller.runAction("start"); await flush();
  assert.equal(x.controller.getSnapshot().notice, "EC2 request failed");
  assert.equal(x.controller.getSnapshot().action, null);
  assert.equal(x.calls.filter((call) => call === "status").length, 2);
  assert.equal(x.calls.filter((call) => call === "events").length, 2);
  assert.equal(x.timers.size, 0);
});
