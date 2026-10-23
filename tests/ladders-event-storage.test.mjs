import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

// Exercise the real hook offline. This hook harness does not replace browser
// checks for React mounting, focus, tabs or Strict Mode.
const previousStorage = globalThis.localStorage;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react"] },
  plugins: [{
    name: "ladders-hook-test-react",
    enforce: "pre",
    resolveId(id) { if (id === "react") return "\0ladders-hook-react"; },
    load(id) {
      if (id === "\0ladders-hook-react") return `
        export const useState = (initial) => globalThis.laddersHookHarness.useState(initial);
        export const useRef = (initial) => globalThis.laddersHookHarness.useRef(initial);
      `;
    },
  }],
});
const { useLocalEvent } = await server.ssrLoadModule("/src/features/ladders-and-backstabbers/hooks/useLocalEvent.ts");
const { LOCAL_EVENT_KEY, emptyEvent, updateEvent } = await server.ssrLoadModule("/src/features/ladders-and-backstabbers/utils/localEvent.ts");

after(async () => {
  await server.close();
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
  delete globalThis.laddersHookHarness;
});

function mount(saved = null) {
  let stored = saved;
  let failWrites = false;
  let reads = 0;
  let cursor = 0;
  const slots = [];
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, LOCAL_EVENT_KEY); reads++; return stored; },
    setItem(key, value) {
      assert.equal(key, LOCAL_EVENT_KEY);
      if (failWrites) throw new Error("QuotaExceededError");
      stored = value;
    },
  };
  globalThis.laddersHookHarness = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  return {
    render() { cursor = 0; return useLocalEvent(); },
    get stored() { return stored; },
    get reads() { return reads; },
    blockWrites(value) { failWrites = value; },
    externalSave(value) { stored = value; },
  };
}

test("storage failure leaves event and undo untouched, and retry saves the action", () => {
  const fixture = mount();
  let event = fixture.render();
  assert.equal(event.run({ type: "add", id: "a", name: "Axo" }), true);
  event = fixture.render();
  const before = event.history;
  const saved = fixture.stored;
  fixture.blockWrites(true);
  assert.equal(event.run({ type: "add", id: "b", name: "Chow" }), false);
  event = fixture.render();
  assert.equal(event.history, before);
  assert.equal(fixture.stored, saved);
  assert.match(event.error, /storage is unavailable or full/);
  fixture.blockWrites(false);
  assert.equal(event.run({ type: "add", id: "b", name: "Chow" }), true);
  assert.equal(fixture.render().history.current.attendees.length, 2);
  assert.equal(fixture.render().error, null);
});

test("stale tab rejects writes and reset without overwriting another tab's save", () => {
  const fixture = mount();
  const event = fixture.render();
  const foreign = JSON.stringify(updateEvent(emptyEvent(), { type: "add", id: "other", name: "Other host" }));
  fixture.externalSave(foreign);
  assert.equal(event.run({ type: "add", id: "a", name: "Axo" }), false);
  assert.equal(event.run({ type: "reset" }), false);
  assert.equal(fixture.stored, foreign);
  assert.equal(fixture.render().history.current.attendees.length, 0);
  assert.match(fixture.render().error, /changed in another tab/);
});

test("invalid save requires explicit reset; ordinary rerenders do not reload storage", () => {
  const fixture = mount("invalid JSON");
  let event = fixture.render();
  assert.match(event.error, /could not be loaded/);
  const reads = fixture.reads;
  fixture.render();
  assert.equal(fixture.reads, reads);
  assert.equal(event.run({ type: "add", id: "a", name: "Axo" }), false);
  assert.equal(fixture.stored, "invalid JSON");
  assert.equal(event.run({ type: "reset" }), true);
  event = fixture.render();
  assert.equal(event.error, null);
  assert.equal(JSON.parse(fixture.stored).version, 1);
});

test("same-render actions deal at most two distinct cards and confirmation deals once", () => {
  let saved = emptyEvent();
  for (const [id, name] of [["a", "Axo"], ["b", "Chow"]]) saved = updateEvent(saved, { type: "add", id, name });
  saved = updateEvent(saved, { type: "shuffle" });
  const fixture = mount(JSON.stringify(saved));
  const event = fixture.render();
  assert.equal(event.run({ type: "start" }), true);
  assert.equal(event.run({ type: "start" }), false);
  const crewId = fixture.render().history.current.crews[0].id;
  assert.equal(event.run({ type: "deal", crewId }), true);
  assert.equal(event.run({ type: "deal", crewId }), false);
  const hand = fixture.render().history.current.crews[0].hand;
  assert.equal(hand.length, 2);
  assert.equal(new Set(hand).size, 2);
});
