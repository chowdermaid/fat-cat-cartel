import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const servers = [];
const originalHarness = globalThis.regionalCallableHarness;
after(async () => {
  await Promise.all(servers.map(server => server.close()));
  if (originalHarness === undefined) delete globalThis.regionalCallableHarness;
  else globalThis.regionalCallableHarness = originalHarness;
});

async function modules({ emulator = false, dev = false, stubs = false } = {}) {
  const state = {
    instances: new Map(), connections: [], requests: [], devRequests: [], stubRequests: [],
    event: { version: 1, revision: 9, phase: "setup", round: 1, players: [] },
    assignments: { gameId: 7, revision: 1, locked: false, choices: [{ id: "a", chest: 2 }], prizes: ["300k", "200k", "100k", "50k"] },
  };
  globalThis.regionalCallableHarness = state;
  const server = await createServer({
    configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
    ssr: { noExternal: ["firebase"] },
    define: { "import.meta.env.VITE_FIREBASE_PROJECT_ID": '"test-project"', "import.meta.env.VITE_USE_STUBS": JSON.stringify(String(stubs)) },
    plugins: [{ name: "regional-callable-boundary", enforce: "pre",
      resolveId(id) { if (id === "firebase/functions") return "\0regional-functions"; },
      load(id) {
        if (id === "\0regional-functions") return `
          export const getFunctions = (app, region) => {
            const state = globalThis.regionalCallableHarness;
            if (!state.instances.has(region)) state.instances.set(region, { app, region });
            return state.instances.get(region);
          };
          export const connectFunctionsEmulator = (instance, host, port) => globalThis.regionalCallableHarness.connections.push({ instance, host, port });
          export const httpsCallable = (instance, name, options) => async data => {
            const state = globalThis.regionalCallableHarness;
            state.requests.push({ region: instance.region, name, options, data });
            return { data: { ok: true, event: state.event, assignments: state.assignments } };
          };
        `;
        const file = id.replaceAll("\\", "/");
        if (file.endsWith("/src/lib/firebase.ts")) return "export const firebaseApp = {};";
        if (file.endsWith("/src/lib/db.ts")) return "export const db = {}; export const ref = () => {}; export const onValue = () => () => {};";
        if (file.endsWith("/src/lib/dev/personas.ts")) return `export const DEV_AUTH_LAYER_ENABLED = ${dev};`;
        if (file.endsWith("/src/lib/dev/callables.ts")) return "export const callDevAdminFunction = (...args) => { globalThis.regionalCallableHarness.devRequests.push(args); return Promise.resolve({ ok: true }); };";
        if (file.endsWith("/src/features/admin/constants.ts")) return `export const REGION = "us-central1"; export const USE_FUNCTIONS_EMULATOR = ${emulator};`;
        if (file.endsWith("/cartel-gil-rush/api/sharedEventStub.ts")) return `
          export const loadStubMinority = (...args) => { globalThis.regionalCallableHarness.stubRequests.push(args); return Promise.resolve(null); };
          export const saveStubMinority = (...args) => { globalThis.regionalCallableHarness.stubRequests.push(args); return Promise.resolve(globalThis.regionalCallableHarness.assignments); };
          export const mutateStubEvent = (...args) => { globalThis.regionalCallableHarness.stubRequests.push(args); return Promise.resolve(globalThis.regionalCallableHarness.event); };
          export const subscribeStubEvent = () => () => {};
        `;
      },
    }],
  });
  servers.push(server);
  return {
    state,
    admin: await server.ssrLoadModule("/src/features/admin/api/adminFunctions.ts"),
    gilRush: await server.ssrLoadModule("/src/features/cartel-gil-rush/api/sharedEvent.ts"),
  };
}

test("admin calls retain the US default; explicit region and timeout are handled separately", async () => {
  const app = await modules();
  await app.admin.callAdminFunction("getAdminSession", "host-token", { adminSessionToken: "wrong-token", extra: true }, { timeout: 1234 });
  await app.admin.callAdminFunction("regionalExample", "host-token", {}, { region: "asia-southeast1", timeout: 5678 });
  assert.deepEqual(app.state.requests[0], { region: "us-central1", name: "getAdminSession", options: { timeout: 1234 }, data: { adminSessionToken: "host-token", extra: true } });
  assert.deepEqual(app.state.requests[1].options, { timeout: 5678 });
  assert.equal(app.state.requests[1].region, "asia-southeast1");
  assert.equal(app.state.connections.length, 0);
  assert.match(app.admin.adminOAuthStartUrl("/cartel-gil-rush"), /^https:\/\/us-central1-test-project\.cloudfunctions\.net\/startDiscordAdminOAuth/);
});

test("regional Functions instances connect to the emulator once each, in either call order", async () => {
  for (const regions of [["asia-southeast1", "us-central1"], ["us-central1", "asia-southeast1"]]) {
    const app = await modules({ emulator: true });
    for (const region of [...regions, ...regions]) await app.admin.callAdminFunction("example", "token", {}, { region });
    assert.deepEqual(app.state.connections.map(row => row.instance.region), regions);
    assert.ok(app.state.connections.every(row => row.host === "127.0.0.1" && row.port === 5001));
    assert.equal(app.state.requests.length, 4);
    assert.match(app.admin.adminOAuthStartUrl("/admin"), /^http:\/\/127\.0\.0\.1:5001\/test-project\/us-central1\/startDiscordAdminOAuth/);
  }
});

test("every live Gil Rush operation uses the Singapore callable and preserves action/revision payloads", async () => {
  const app = await modules();
  assert.deepEqual(await app.gilRush.loadMinorityAssignments("host-token", 7), app.state.assignments);
  const choices = [{ id: "a", chest: 2 }];
  await app.gilRush.saveMinorityAssignments("host-token", 7, choices, 3);
  const result = await app.gilRush.mutateSharedEvent("host-token", { type: "reset" }, 8);
  assert.equal(result.revision, 9);
  assert.equal(app.state.requests.length, 3);
  assert.ok(app.state.requests.every(row => row.region === "asia-southeast1" && row.name === "mutateCartelGilRushEventAsia" && row.data.adminSessionToken === "host-token"));
  assert.deepEqual(app.state.requests.map(row => row.data.action), [{ type: "load-minority-assignments", gameId: 7 }, { type: "save-minority-assignments", gameId: 7, choices }, { type: "reset" }]);
  assert.equal(app.state.requests[1].data.expectedRevision, 3);
  assert.equal(app.state.requests[2].data.expectedRevision, 8);
});

test("stub and development calls bypass production regional endpoints", async () => {
  for (const options of [{ stubs: true }, { dev: true }]) {
    const app = await modules(options);
    await app.gilRush.loadMinorityAssignments("token", 7);
    await app.gilRush.saveMinorityAssignments("token", 7, [], 0);
    await app.gilRush.mutateSharedEvent("token", { type: "reset" }, 8);
    assert.equal(app.state.stubRequests.length, 3);
    assert.equal(app.state.requests.length, 0);
    if (options.dev) {
      await app.admin.callAdminFunction("getAdminSession", "token");
      assert.equal(app.state.devRequests.length, 1);
      assert.equal(app.state.instances.size, 0);
    }
  }
});
