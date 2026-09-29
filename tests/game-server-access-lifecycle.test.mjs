import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

// Execute the real hook/page orchestration with deterministic hook state and
// deferred transports. DOM layout and native interactions remain browser checks.
function mount(render) {
  const slots = [], effects = [];
  let cursor = 0, dirty = true, output;
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[i].value, (value) => { slots[i].value = typeof value === "function" ? value(slots[i].value) : value; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    useLayoutEffect(fn, deps) { hooks.useEffect(fn, deps); },
  };
  return {
    render() {
      let count = 0;
      do {
        dirty = false; cursor = 0; globalThis.phase5Hooks = hooks;
        output = render();
        for (const effect of effects.splice(0)) effect();
        assert(++count < 20, "render loop");
      } while (dirty);
      return output;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function find(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
  return null;
}
const component = (node, name) => find(node, (item) => item.type?.name === name);
const auth = (palworld = true, dragonwilds = true, user = "dev-member") => ({ authed: true, checking: false,
  canUseGameServers: palworld, sessionToken: "same-token", session: { discordUserId: user, isAdmin: false,
    canUseGameServers: palworld || dragonwilds, gameServerAccessById: { palworld, dragonwilds } } });
let runner, useManager, PalworldPage, useAuth, fixture, readCache;
const toasts = [], calls = [];
const handlers = {};
const api = new Proxy({}, { get: (_, name) => (...args) => { calls.push({ name, args }); return handlers[name](...args); } });
before(async () => {
  globalThis.phase5Api = api;
  globalThis.phase5Toast = { success: (message) => toasts.push(message), error: (message) => toasts.push(message) };
  globalThis.phase5Persona = { discordUserId: "dev-boss", isAdmin: true };
  globalThis.phase5Allowed = true;

  runner = await createServer({ configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
    resolve: { alias: { "@": path.resolve("src") } }, oxc: { jsx: { runtime: "automatic" } },
    plugins: [{ name: "phase5-orchestration", enforce: "pre",
      resolveId(id) { if (id === "phase5-hooks") return "\0phase5-hooks"; },
      transform(code, id) {
        if (/useGameServerAccessManager\.ts$|PalworldServerPage\.tsx$|useGameServerAuth\.ts$/.test(id)) return code.replace('from "react"', 'from "phase5-hooks"');
      },
      load(id) {
        const file = id.replaceAll("\\", "/");
        if (id === "\0phase5-hooks") return ["useState", "useRef", "useMemo", "useCallback", "useEffect", "useLayoutEffect"].map((name) => `export const ${name} = (...args) => globalThis.phase5Hooks.${name}(...args);`).join("\n");
        if (file.endsWith("/lib/dev/personas.ts")) return 'export const DEV_AUTH_LAYER_ENABLED = true; export const getSelectedDevPersona = () => globalThis.phase5Persona;';
        if (file.endsWith("/lib/dev/gameServerAccess.ts")) return 'export const devGameServerAccessStatus = () => ({canUseGameServers: globalThis.phase5Allowed});';
        if (file.endsWith("/admin/hooks/useAdminAuth.ts")) return 'export const useAdminAuth = () => globalThis.phase5Auth;';
        if (file.endsWith("/hooks/usePalworldServerAnimations.ts")) return 'export const usePalworldServerAnimations = () => ({rootRef: null, pulseCopy: () => {}});';
        if (file.endsWith("/api/gameServerAccess.ts")) return ["deleteGameServerAccess", "getGameServerSettings", "listGameServerAccess", "updateGameServerSettings", "upsertGameServerAccess"].map((name) => `export const ${name} = (...args) => globalThis.phase5Api.${name}(...args);`).join("\n");
        if (file.endsWith("/api/gameServerFunctions.ts")) return ["getGameServerStatus", "getGameServerTelemetry", "listGameServerEvents", "startGameServer", "stopGameServer"].map((name) => `export const ${name} = (...args) => globalThis.phase5Api.${name}(...args);`).join("\n");
      },
    }, { name: "phase5-toasts", enforce: "pre", resolveId(id) { if (id === "sonner") return "\0phase5-toasts"; }, load(id) { if (id === "\0phase5-toasts") return "export const toast = globalThis.phase5Toast;"; } }],
  });
  ({ useGameServerAccessManager: useManager } = await runner.ssrLoadModule("/src/features/admin/hooks/useGameServerAccessManager.ts"));
  ({ PalworldServerPage: PalworldPage } = await runner.ssrLoadModule("/src/features/gameserver/components/PalworldServerPage.tsx"));
  ({ useGameServerAuth: useAuth } = await runner.ssrLoadModule("/src/features/gameserver/hooks/useGameServerAuth.ts"));
  ({ gameServerFixture: fixture } = await runner.ssrLoadModule("/src/features/gameserver/api/gameServerFixtures.ts"));
  readCache = await runner.ssrLoadModule("/src/features/gameserver/api/gameServerReadCache.ts");
  globalThis.window = Object.assign(new EventTarget(), { setInterval: () => 1, clearInterval: () => {}, localStorage: { getItem: () => null, setItem: () => {} } });
  globalThis.localStorage = window.localStorage;
});
after(async () => runner?.close());
function reset() { calls.length = 0; toasts.length = 0; globalThis.phase5Allowed = true; globalThis.phase5Persona = { discordUserId: "dev-boss", isAdmin: true }; }
function settings(id, enabled = false) { return { ok: true, settings: { serverId: id, enabled, disabledMessage: null } }; }
function manager(id = "palworld") { const busy = []; const view = mount(() => useManager(id, "same-token", "dev-boss", (value) => busy.push(value))); return { view, busy }; }

test("manager ignores delayed reads/errors/cleanup after game switch; new form starts empty", async () => {
  reset(); const palList = deferred(), palSettings = deferred(), dragonList = deferred(), dragonSettings = deferred();
  handlers.listGameServerAccess = (_, id) => id === "palworld" ? palList.promise : dragonList.promise;
  handlers.getGameServerSettings = (_, id) => id === "palworld" ? palSettings.promise : dragonSettings.promise;
  const pal = manager(); let state = pal.view.render(); state.setNewDisplayName("Unsaved Palworld"); state.setSearch("old"); pal.view.render(); pal.view.unmount();
  const dragon = manager("dragonwilds"); state = dragon.view.render();
  assert.equal(state.newDisplayName, ""); assert.equal(state.search, ""); assert.equal(state.settings, null);
  palList.resolve({ entries: [{ displayName: "Old protected user" }] }); palSettings.reject(new Error("Old error")); await flush();
  state = dragon.view.render(); assert.deepEqual(state.filteredEntries, []); assert.equal(state.loadingSettings, true); assert.deepEqual(toasts, []);
  dragonList.resolve({ entries: [] }); dragonSettings.resolve(settings("dragonwilds")); await flush();
  state = dragon.view.render(); assert.equal(state.settings.serverId, "dragonwilds"); assert.equal(state.loadingSettings, false);
  dragon.view.unmount();
});

test("manager captures selected game, locks mutations, saves settings without grant reload", async () => {
  reset(); handlers.listGameServerAccess = async () => ({ entries: [] }); handlers.getGameServerSettings = async (_, id) => settings(id);
  const saving = deferred(); handlers.updateGameServerSettings = () => saving.promise; handlers.upsertGameServerAccess = async () => ({ ok: true });
  const { view, busy } = manager("dragonwilds"); view.render(); await flush(); let state = view.render();
  state.setSettingsEnabled(true); state.setDisabledMessage("Dragon maintenance"); state = view.render();
  calls.length = 0;
  const pending = state.saveSettings(); await state.grantDiscordUser();
  assert.deepEqual(busy, [true]); assert.deepEqual(calls.map((call) => call.name), ["updateGameServerSettings"]);
  assert.deepEqual(calls[0].args, ["same-token", { serverId: "dragonwilds", enabled: true, disabledMessage: "Dragon maintenance" }]);
  saving.resolve(settings("dragonwilds", true)); await pending;
  assert.deepEqual(busy, [true, false]); assert.equal(view.render().settings.enabled, true); assert.equal(calls.length, 1); view.unmount();
});

test("manager drops pending mutation completion after logout or persona/admin loss", async () => {
  for (const loss of ["unmount", "persona", "admin"]) {
    reset(); handlers.listGameServerAccess = async () => ({ entries: [] }); handlers.getGameServerSettings = async (_, id) => settings(id);
    const saving = deferred(); handlers.updateGameServerSettings = () => saving.promise;
    const { view, busy } = manager(); view.render(); await flush(); const state = view.render(); const pending = state.saveSettings();
    if (loss === "unmount") view.unmount();
    else globalThis.phase5Persona = { discordUserId: loss === "persona" ? "someone-else" : "dev-boss", isAdmin: loss !== "admin" };
    saving.reject(new Error("Late save error")); await pending;
    assert.deepEqual(busy, [true]); assert.deepEqual(toasts, []); view.unmount();
  }
});

function palworld() {
  globalThis.phase5Persona = { discordUserId: "dev-member", isAdmin: false };
  globalThis.phase5Auth = auth();
  const outer = mount(PalworldPage); const element = outer.render();
  const inner = mount(() => element.type(element.props)); inner.render();
  return { outer, inner, close() { inner.unmount(); outer.unmount(); } };
}
function palDefaults() {
  reset(); handlers.getGameServerStatus = async () => fixture("palworld", "running");
  handlers.getGameServerTelemetry = async () => fixture("palworld", "running");
  handlers.listGameServerEvents = async () => ({ entries: [] });
}

test("selected auth fails closed for old aggregate flags and distinguishes both capabilities", () => {
  reset(); globalThis.phase5Auth = auth(false, true);
  const selectedPal = mount(() => useAuth("palworld")), selectedDragon = mount(() => useAuth("dragonwilds")), aggregate = mount(() => useAuth());
  assert.equal(selectedPal.render().canUseGameServers, false); assert.equal(selectedDragon.render().canUseGameServers, true); assert.equal(aggregate.render().canUseGameServers, true);
  delete globalThis.phase5Auth.session.gameServerAccessById; globalThis.phase5Auth.session.isAdmin = true;
  assert.equal(selectedDragon.render().canUseGameServers, false); assert.equal(selectedPal.render().canUseGameServers, false);
  selectedPal.unmount(); selectedDragon.unmount(); aggregate.unmount();
});

test("Palworld gate clears protected dashboard when only Palworld access is revoked", async () => {
  palDefaults(); const ui = palworld(); await flush();
  assert(component(ui.inner.render(), "PalworldServerHero"));
  globalThis.phase5Auth = auth(false, true);
  const denied = ui.outer.render(); assert.equal(denied.props.title, "Palworld Server"); assert.equal(denied.props.showLogin, false);
  ui.close();
});

test("Palworld ignores delayed status, telemetry, events and action results after identity loss", async () => {
  for (const operation of ["getGameServerStatus", "getGameServerTelemetry", "listGameServerEvents", "startGameServer", "stopGameServer"]) {
    palDefaults(); const request = deferred(); handlers[operation] = () => request.promise;
    const ui = palworld(); await flush(); const before = ui.inner.render();
    let action;
    if (operation === "startGameServer") action = component(before, "PalworldServerHero").props.onStart();
    if (operation === "stopGameServer") {
      component(before, "PalworldServerHero").props.onStop();
      const button = find(ui.inner.render(), (item) => item.props?.variant === "destructive"); action = button.props.onClick();
    }
    const count = calls.length; globalThis.phase5Allowed = false; ui.close();
    request.resolve({ ...fixture("palworld", "running"), entries: [{ id: "late-secret" }], message: "Late action" }); await action; await flush();
    assert.equal(calls.length, count); assert.deepEqual(toasts, []);
  }
});

test("Palworld authorization errors in telemetry/events/actions clear status and Stop dialog", async () => {
  for (const operation of ["getGameServerTelemetry", "listGameServerEvents", "startGameServer", "stopGameServer"]) {
    palDefaults(); const request = deferred(); handlers[operation] = () => request.promise;
    const ui = palworld(); await flush(); const hero = component(ui.inner.render(), "PalworldServerHero");
    if (operation === "startGameServer") hero.props.onStart();
    else if (operation === "stopGameServer") { hero.props.onStop(); find(ui.inner.render(), (item) => item.props?.variant === "destructive").props.onClick(); }
    else hero.props.onStop();
    request.reject(Object.assign(new Error("No permission"), { code: "functions/permission-denied" })); await flush();
    const denied = ui.inner.render(); assert.equal(denied.props.showLogin, false); assert(!component(denied, "PalworldServerHero")); assert.deepEqual(toasts, []); ui.close();
  }
});

test("Palworld newer status waits for old read then requests fresh result", async () => {
  palDefaults(); const old = deferred(), newer = deferred(); let attempt = 0;
  handlers.getGameServerStatus = () => ++attempt === 1 ? old.promise : newer.promise;
  const ui = palworld();
  // Initial page is loading; load once, then exercise overlapping manual refreshes.
  old.resolve(fixture("palworld", "running")); await flush(); let hero = component(ui.inner.render(), "PalworldServerHero");
  const first = deferred(), second = deferred(); attempt = 0;
  handlers.getGameServerStatus = () => ++attempt === 1 ? first.promise : second.promise;
  hero.props.onRefresh(); hero.props.onRefresh(); assert.equal(attempt, 1);
  first.resolve(fixture("palworld", "running")); await flush(); assert.equal(attempt, 2);
  second.resolve(fixture("palworld", "stopped")); await flush(); hero = component(ui.inner.render(), "PalworldServerHero");
  assert.equal(hero.props.status.status, "stopped"); ui.close();
});

test("authorization change invalidates in-flight deduplication without old cleanup removing replacement", async () => {
  const old = deferred(), newer = deferred(); const a = readCache.sharedGameServerRead("same-token:palworld", () => old.promise);
  readCache.invalidateGameServerReads(); const b = readCache.sharedGameServerRead("same-token:palworld", () => newer.promise);
  assert.notEqual(a, b); old.resolve("old"); await a;
  assert.equal(readCache.sharedGameServerRead("same-token:palworld", () => { throw new Error("unexpected call"); }), b);
  newer.resolve("new"); assert.equal(await b, "new");
});

test("Palworld startup polling cancels timers on manual refresh and access loss", async (t) => {
  const timers = new Map(); let id = 0;
  t.mock.method(globalThis, "setTimeout", (fn) => { timers.set(++id, fn); return id; });
  t.mock.method(globalThis, "clearTimeout", (key) => timers.delete(key));
  for (const loss of ["refresh", "unmount", "persona"]) {
    palDefaults(); handlers.getGameServerStatus = async () => fixture("palworld", "stopped");
    handlers.startGameServer = async () => ({ ...fixture("palworld", "pending"), message: "Starting" });
    const ui = palworld(); await flush(); component(ui.inner.render(), "PalworldServerHero").props.onStart(); await flush();
    assert.equal(timers.size, 1);
    const before = calls.length;
    if (loss === "refresh") { component(ui.inner.render(), "PalworldServerHero").props.onRefresh(); await flush(); assert.equal(timers.size, 0); }
    else if (loss === "unmount") { ui.close(); assert.equal(timers.size, 0); }
    else {
      globalThis.phase5Allowed = false;
      const callback = [...timers.values()][0]; timers.clear(); callback(); await flush();
      assert.equal(calls.length, before); assert.equal(timers.size, 0);
    }
    ui.close();
  }
});

test("manager grant update/delete use captured game and refresh only its list", async () => {
  reset(); handlers.listGameServerAccess = async () => ({ entries: [] }); handlers.getGameServerSettings = async (_, id) => settings(id);
  handlers.upsertGameServerAccess = async (_, entry) => ({ entry }); handlers.deleteGameServerAccess = async () => ({ ok: true });
  const { view } = manager("dragonwilds"); view.render(); await flush(); let state = view.render();
  const entry = { discordUserId: "123456789012345678", displayName: "Friend", enabled: true, expiresAt: null, notes: "Dragon only" };
  calls.length = 0; await state.toggleEnabled(entry);
  assert.deepEqual(calls.map((call) => call.name), ["upsertGameServerAccess", "listGameServerAccess"]);
  assert.deepEqual(calls[0].args, ["same-token", { ...entry, enabled: false }, "dragonwilds"]);
  assert.deepEqual(calls[1].args, ["same-token", "dragonwilds"]);
  state = view.render(); calls.length = 0; await state.removeEntry(entry);
  assert.deepEqual(calls.map((call) => call.name), ["deleteGameServerAccess", "listGameServerAccess"]);
  assert.deepEqual(calls[0].args, ["same-token", entry.discordUserId, "dragonwilds"]); view.unmount();
});
