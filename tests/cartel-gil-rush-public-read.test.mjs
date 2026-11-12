import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
  define: { "import.meta.env.VITE_USE_STUBS": '"false"' },
  plugins: [{ name: "public-gil-rush-reader", enforce: "pre", load(id) {
    const file = id.replaceAll("\\", "/");
    if (file.endsWith("/src/lib/db.ts")) return "export const db = {}; export const ref = (_db, path) => path; export const onValue = (...args) => globalThis.gilRushReader.subscribe(...args);";
    if (file.endsWith("/admin/api/adminFunctions.ts")) return "export const callAdminFunction = () => { throw new Error('Public viewing must not call a Function'); };";
    if (file.endsWith("/src/lib/dev/personas.ts")) return "export const DEV_AUTH_LAYER_ENABLED = false;";
    if (file.endsWith("/api/sharedEventStub.ts")) return "export const subscribeStubEvent = () => { throw new Error('Unexpected stub'); }; export const mutateStubEvent = () => {}; export const loadStubMinority = () => {}; export const saveStubMinority = () => {};";
  } }],
});
const { subscribeSharedEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/api/sharedEvent.ts");
const { emptyGilRushEvent } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-model.ts");
after(async () => { await server.close(); delete globalThis.gilRushReader; });

function mount(token = null) {
  const events = [], errors = [], paths = [];
  let receive, fail, stops = 0;
  globalThis.gilRushReader = { subscribe(path, next, error) { paths.push(path); receive = next; fail = error; return () => stops++; } };
  const stop = subscribeSharedEvent(token, event => events.push(event), error => errors.push(error));
  return { paths, events, errors, receive: value => receive({ val: () => value }), fail: error => fail(error), stop, get stops() { return stops; } };
}

test("public viewers subscribe once to the current event without a login or Function call", () => {
  for (const token of [null, "", "expired-session", "host-token"]) {
    const app = mount(token);
    assert.deepEqual(app.paths, ["events/cartelGilRush/current"]);
    app.receive(null);
    assert.deepEqual(app.events[0], emptyGilRushEvent());
    app.receive({ ...emptyGilRushEvent(), revision: 4 });
    assert.equal(app.events[1].revision, 4);
    assert.equal(app.errors.length, 0);
    app.stop();
    assert.equal(app.stops, 1);
    app.receive({ ...emptyGilRushEvent(), revision: 5 });
    app.fail(new Error("Late failure"));
    assert.equal(app.events.length, 2);
    assert.equal(app.errors.length, 0);
  }
});

test("malformed snapshots and connection failures are reported without publishing invalid state", () => {
  const app = mount();
  app.receive({ ...emptyGilRushEvent(), revision: -1 });
  assert.equal(app.errors.length, 1);
  assert.equal(app.events.length, 0);
  app.fail(new Error("Connection failed"));
  assert.equal(app.errors[1].message, "Connection failed");
  app.receive({ ...emptyGilRushEvent(), revision: 3 });
  assert.equal(app.events[0].revision, 3);
  app.stop();
});
