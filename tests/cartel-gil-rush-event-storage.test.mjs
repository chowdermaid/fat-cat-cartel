import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const previousStorage = globalThis.localStorage;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react"] },
  plugins: [{
    name: "gil-rush-hook-test-react", enforce: "pre",
    resolveId(id) { if (id === "react") return "\0gil-rush-hook-react"; },
    load(id) { if (id === "\0gil-rush-hook-react") return `
      export const useState = (initial) => globalThis.gilRushHookHarness.useState(initial);
      export const useRef = (initial) => globalThis.gilRushHookHarness.useRef(initial);
    `; },
  }],
});
const { useLocalEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useLocalEvent.ts");
const { LOCAL_EVENT_KEY, emptyEvent, updateEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/localEvent.ts");

after(async () => {
  await server.close();
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
  delete globalThis.gilRushHookHarness;
});

const add = (id, name = id) => ({ type: "add", player: { id, name, avatarUrl: null } });

function mount(saved = null) {
  let stored = saved;
  let failWrites = false;
  let reads = 0;
  let cursor = 0;
  const slots = [];
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, LOCAL_EVENT_KEY); reads++; return stored; },
    setItem(key, value) { assert.equal(key, LOCAL_EVENT_KEY); if (failWrites) throw new Error("QuotaExceededError"); stored = value; },
  };
  globalThis.gilRushHookHarness = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  };
  return {
    render() { cursor = 0; return useLocalEvent(); },
    get stored() { return stored; }, get reads() { return reads; },
    blockWrites(value) { failWrites = value; }, externalSave(value) { stored = value; },
  };
}

test("storage failures leave event untouched; retry persists action", () => {
  const fixture = mount();
  const event = fixture.render();
  assert.equal(event.run(add("a")), true);
  const before = fixture.render().current;
  const saved = fixture.stored;
  fixture.blockWrites(true);
  assert.equal(event.run(add("b")), false);
  assert.equal(fixture.render().current, before);
  assert.equal(fixture.stored, saved);
  assert.match(fixture.render().error, /storage is unavailable or full/);
  fixture.blockWrites(false);
  assert.equal(event.run(add("b")), true);
  assert.equal(fixture.render().current.players.length, 2);
  assert.equal(fixture.render().error, null);
});

test("stale tab rejects edits and reset without overwriting other save", () => {
  const fixture = mount();
  const event = fixture.render();
  const foreign = JSON.stringify(updateEvent(emptyEvent(), add("other")));
  fixture.externalSave(foreign);
  for (const action of [add("a"), { type: "set-mood", mood: "red" }, { type: "reset" }]) assert.equal(event.run(action), false);
  assert.equal(fixture.stored, foreign);
  assert.match(fixture.render().error, /changed in another tab/);
});

test("invalid save requires explicit reset; rerenders do not reload storage", () => {
  const fixture = mount("invalid JSON");
  const event = fixture.render();
  const reads = fixture.reads;
  fixture.render();
  assert.equal(fixture.reads, reads);
  assert.equal(event.run(add("a")), false);
  assert.equal(fixture.stored, "invalid JSON");
  assert.equal(event.run({ type: "reset" }), true);
  assert.equal(fixture.render().error, null);
  assert.deepEqual(JSON.parse(fixture.stored), emptyEvent());
});

test("same-render actions start once, keep order and survive remount", () => {
  const fixture = mount();
  const event = fixture.render();
  assert.equal(event.run(add("a")), true);
  assert.equal(event.run(add("b")), true);
  assert.equal(event.run({ type: "set-mood", mood: "blue" }), true);
  assert.equal(event.run({ type: "start" }), true);
  const order = fixture.render().current.players;
  assert.equal(event.run({ type: "start" }), false);
  assert.equal(event.run(add("c")), false);
  assert.equal(event.run({ type: "set-round", round: 8 }), true);
  assert.equal(event.run({ type: "set-mood", mood: "red" }), true);
  const restored = mount(fixture.stored).render();
  assert.deepEqual(restored.current.players, order);
  assert.equal(restored.current.round, 8);
  assert.equal(restored.current.mood, "red");
});
