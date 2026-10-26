import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const originalStorage = globalThis.localStorage;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  ssr: { noExternal: ["react"] },
  plugins: [{ name: "shared-event-harness", enforce: "pre",
    resolveId(id) {
      if (id === "react") return "\0shared-event-react";
      if (id.startsWith("react/")) return "\0shared-event-jsx";
    },
    load(id) {
      if (id === "\0shared-event-jsx") return 'export const jsxDEV = (type, props, key) => ({ type, props, key }); export const jsx = jsxDEV; export const jsxs = jsxDEV;';
      if (id === "\0shared-event-react") return `
        export const useState = value => globalThis.sharedHarness.useState(value);
        export const useRef = value => globalThis.sharedHarness.useRef(value);
        export const useEffect = effect => globalThis.sharedHarness.effects.push(effect);
      `;
      if (id.replaceAll("\\", "/").endsWith("/components/ui/button.tsx")) return 'export const Button = "button";';
      if (id.replaceAll("\\", "/").endsWith("/components/ui/input.tsx")) return 'export const Input = "input";';
      if (id.replaceAll("\\", "/").endsWith("/components/ui/popover.tsx")) return 'export const Popover = "popover"; export const PopoverContent = "content"; export const PopoverTrigger = "trigger";';
      if (id.replaceAll("\\", "/").endsWith("/api/sharedEvent.ts")) return `
        export const subscribeSharedEvent = (...args) => globalThis.sharedHarness.subscribe(...args);
        export const mutateSharedEvent = (...args) => globalThis.sharedHarness.mutate(...args);
      `;
    },
  }],
});
const { useSharedEvent } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useSharedEvent.ts");
const { emptyGilRushEvent, nextGilRushEvent } = await server.ssrLoadModule("/functions/src/cartel-gil-rush-model.ts");
const { PlayerGilInput } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/game/PlayerGilInput.tsx");
after(async () => { await server.close(); globalThis.localStorage = originalStorage; delete globalThis.sharedHarness; });

function mount(saved = null) {
  let cursor = 0;
  const slots = [];
  const requests = [];
  let receive, fail, stopped = false;
  globalThis.localStorage = { getItem: () => saved, setItem: () => { throw new Error("Legacy save must stay untouched"); } };
  globalThis.sharedHarness = {
    effects: [],
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    subscribe(callback, error) { receive = callback; fail = error; return () => { stopped = true; }; },
    mutate(token, action, revision) { return new Promise((resolve, reject) => requests.push({ token, action, revision, resolve, reject })); },
  };
  function render() { cursor = 0; return useSharedEvent("host-token"); }
  render();
  const cleanup = globalThis.sharedHarness.effects[0]();
  return { render, receive: value => receive(value), fail: value => fail(value), requests, cleanup, get stopped() { return stopped; } };
}

test("load guards mutations; one subscription survives rerenders; legacy import is read-only", async () => {
  const local = { version: 1, phase: "setup", players: [], mood: null, round: 1 };
  const fixture = mount(JSON.stringify(local));
  assert.equal(await fixture.render().run({ type: "start" }), false);
  fixture.receive(emptyGilRushEvent());
  assert.equal(fixture.render().loading, false);
  assert.deepEqual(fixture.render().importable, local);
  fixture.cleanup();
  assert.equal(fixture.stopped, true);
});

test("failed writes preserve state, retry is explicit, same-render calls serialize", async () => {
  const fixture = mount();
  fixture.receive(emptyGilRushEvent());
  const action = { type: "add", player: { id: "a", name: "Axo", avatarUrl: null } };
  const controller = fixture.render();
  const save = controller.run(action);
  assert.equal(await controller.run(action), false);
  assert.equal(fixture.requests.length, 1);
  fixture.requests[0].reject(new Error("Write failed"));
  assert.equal(await save, false);
  assert.deepEqual(fixture.render().current, emptyGilRushEvent());
  assert.match(fixture.render().error, /Write failed/);
  const retry = fixture.render().run(action);
  const committed = nextGilRushEvent(null, action, 0);
  fixture.requests[1].resolve(committed);
  assert.equal(await retry, true);
  assert.deepEqual(fixture.render().current, committed);
});

test("newer remote snapshots win over older mutation replies and late listeners", async () => {
  const fixture = mount();
  const initial = { ...emptyGilRushEvent(), revision: 4 };
  fixture.receive(initial);
  const save = fixture.render().run({ type: "set-mood", mood: "blue" });
  const remote = { ...initial, revision: 6, mood: "red" };
  fixture.receive(remote);
  fixture.requests[0].resolve({ ...initial, revision: 5, mood: "blue" });
  assert.equal(await save, true);
  fixture.receive(initial);
  assert.deepEqual(fixture.render().current, remote);
  fixture.cleanup();
  fixture.receive({ ...remote, revision: 7 });
  assert.equal(fixture.render().current.revision, 6);
});

test("captured revision rejects stale commands; unmount ignores in-flight responses", async () => {
  const fixture = mount();
  fixture.receive({ ...emptyGilRushEvent(), revision: 1 });
  const before = fixture.render();
  fixture.receive({ ...emptyGilRushEvent(), revision: 2 });
  const save = before.run({ type: "reset" });
  assert.equal(fixture.requests[0].revision, 1);
  fixture.cleanup();
  fixture.requests[0].resolve({ ...emptyGilRushEvent(), revision: 3 });
  assert.equal(await save, false);
  assert.equal(fixture.render().current.revision, 2);
});

test("subscription errors block edits instead of falling back to local storage", async () => {
  const fixture = mount("malformed legacy JSON");
  fixture.receive(emptyGilRushEvent());
  fixture.fail(new Error("Read denied"));
  assert.equal(fixture.render().importable, null);
  assert.equal(await fixture.render().run({ type: "reset" }), false);
  assert.equal(fixture.requests.length, 0);
});

test("gil draft survives remote values and stale save; explicit retry uses latest revision", async () => {
  let cursor = 0;
  const slots = [];
  const calls = [];
  globalThis.sharedHarness = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  };
  let revision = 5, gilWon = 100;
  const run = async (action, expected) => { calls.push({ action, expected }); return calls.length > 1; };
  const view = () => { cursor = 0; return PlayerGilInput({ player: { id: "a", name: "Axo", avatarUrl: null, gilWon }, revision, run, disabled: false, children: "player trigger" }); };
  const render = () => view().props.children[1].props.children[1];
  const input = form => form.props.children[1].props.children[0];
  input(render()).props.onChange({ target: { value: "200000" } });
  view().props.onOpenChange(false);
  view().props.onOpenChange(true);
  assert.equal(input(render()).props.value, "200000");
  revision = 6; gilWon = 150;
  let form = render();
  assert.equal(input(form).props.value, "200000");
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls[0].expected, 5);
  form = render();
  assert.equal(input(form).props.value, "200000");
  assert.equal(form.props.children[1].props.children[1].props.children[1], "Retry");
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls[1].expected, 6);
  assert.deepEqual(calls[1].action, { type: "set-gil", id: "a", gilWon: 200000 });
  gilWon = 200000;
  assert.equal(input(render()).props.value, "200000");
  assert.equal(view().props.open, false);
});
