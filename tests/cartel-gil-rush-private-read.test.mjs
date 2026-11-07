import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
  define: { "import.meta.env.VITE_USE_STUBS": '"false"' },
  plugins: [{ name: "private-gil-rush-reader", enforce: "pre", load(id) {
    const file = id.replaceAll("\\", "/");
    if (file.endsWith("/admin/api/adminFunctions.ts")) return "export const callAdminFunction = (...args) => globalThis.gilRushReader.call(...args);";
    if (file.endsWith("/src/lib/dev/personas.ts")) return "export const DEV_AUTH_LAYER_ENABLED = false;";
    if (file.endsWith("/api/sharedEventStub.ts")) return "export const subscribeStubEvent = () => { throw new Error('Unexpected stub'); }; export const mutateStubEvent = () => {}; export const loadStubMinority = () => {}; export const saveStubMinority = () => {};";
  } }],
});
const { subscribeSharedEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/api/sharedEvent.ts");
const { emptyGilRushEvent } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-model.ts");
after(async () => { await server.close(); delete globalThis.gilRushReader; });
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };

function mount(token = "viewer-token") {
  const original = { document: globalThis.document, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const document = new EventTarget();
  document.hidden = false;
  globalThis.document = document;
  const timers = new Map();
  let next = 0;
  globalThis.setTimeout = (callback, delay) => { timers.set(++next, { callback, delay }); return next; };
  globalThis.clearTimeout = id => timers.delete(id);
  const requests = [], events = [], errors = [];
  globalThis.gilRushReader = { call: (...args) => new Promise((resolve, reject) => requests.push({ args, resolve, reject })) };
  const stop = subscribeSharedEvent(token, event => events.push(event), error => errors.push(error));
  return {
    requests, events, errors, timers,
    visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new Event("visibilitychange")); },
    advance(delay) {
      for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    },
    stop,
    cleanup() {
      stop();
      if (original.document === undefined) delete globalThis.document; else globalThis.document = original.document;
      globalThis.setTimeout = original.setTimeout;
      globalThis.clearTimeout = original.clearTimeout;
    },
  };
}

test("private live reads authenticate in Singapore, send revisions and pause while hidden", async () => {
  const app = mount();
  try {
    assert.deepEqual(app.requests[0].args, ["readCartelGilRushEvent", "viewer-token", { afterRevision: null }, { region: "asia-southeast1", timeout: 45_000 }]);
    app.requests[0].resolve({ event: { ...emptyGilRushEvent(), revision: 4 } });
    await flush();
    assert.equal(app.events[0].revision, 4);
    app.visibility(true);
    app.advance(1000);
    await flush();
    assert.equal(app.requests.length, 1);
    app.visibility(false);
    await flush();
    assert.deepEqual(app.requests[1].args[2], { afterRevision: 4 });
    app.requests[1].resolve({ event: null });
    await flush();
    assert.equal(app.events.length, 1);
    app.advance(1000);
    await flush();
    app.stop();
    app.requests[2].resolve({ event: { ...emptyGilRushEvent(), revision: 5 } });
    await flush();
    assert.equal(app.events.length, 1);
    assert.equal(app.timers.size, 0);
  } finally { app.cleanup(); }
});

test("unauthorized reads stop; transient failures retry with a full fresh snapshot", async () => {
  for (const code of ["functions/permission-denied", "functions/unauthenticated", "functions/unavailable"]) {
    const app = mount();
    try {
      app.requests[0].reject(Object.assign(new Error("Read denied"), { code }));
      await flush();
      assert.equal(app.errors.length, 1);
      app.advance(5000);
      await flush();
      assert.equal(app.requests.length, code === "functions/unavailable" ? 2 : 1);
      if (app.requests[1]) {
        assert.deepEqual(app.requests[1].args[2], { afterRevision: null });
        app.requests[1].resolve({ event: emptyGilRushEvent() });
        await flush();
        assert.equal(app.events.length, 1);
      }
    } finally { app.cleanup(); }
  }
});

test("a missing viewer token never calls the backend", async () => {
  const app = mount(null);
  try {
    await flush();
    assert.equal(app.requests.length, 0);
    assert.match(app.errors[0].message, /Sign in/);
  } finally { app.cleanup(); }
});
