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

function mount(saved = null, token = "host-token") {
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
  function render() { cursor = 0; return useSharedEvent(token); }
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

test("spectators subscribe to the shared event but cannot send mutations without a host token", async () => {
  const viewer = mount(null, null);
  viewer.receive(emptyGilRushEvent());
  assert.equal(viewer.render().loading, false);
  assert.equal(await viewer.render().run({ type: "start-split" }), false);
  assert.equal(viewer.requests.length, 0);
  viewer.cleanup();
  assert.equal(viewer.stopped, true);
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

function livePlayers() {
  let event = emptyGilRushEvent();
  for (const id of ["a", "b"]) event = nextGilRushEvent(event, { type: "add", player: { id, name: id, avatarUrl: null } }, event.revision);
  return nextGilRushEvent(event, { type: "start" }, event.revision);
}

test("independent edits queue immediately and commit sequentially across only this host's revisions", async () => {
  const fixture = mount();
  let event = livePlayers();
  fixture.receive(event);
  const controller = fixture.render();
  const first = controller.run({ type: "set-gil", id: "a", gilWon: 100 });
  const second = controller.run({ type: "set-gil", id: "b", gilWon: 200 });
  const third = controller.run({ type: "set-round", round: 2 });
  assert.deepEqual(fixture.render().pendingKeys, ["player:a", "player:b", "round"]);
  assert.equal(fixture.requests.length, 1);
  assert.equal(await controller.run({ type: "set-bonus-die", id: "b", sides: 10 }), false);
  assert.equal(await controller.run({ type: "reset" }), false);
  for (const [index, promise] of [first, second, third].entries()) {
    const request = fixture.requests[index];
    assert.equal(request.revision, event.revision);
    event = nextGilRushEvent(event, request.action, request.revision);
    fixture.receive(event);
    request.resolve(event);
    assert.equal(await promise, true);
  }
  assert.equal(fixture.requests.length, 3);
  assert.deepEqual(fixture.render().current, event);
  assert.equal(event.players.find(player => player.id === "a").gilWon, 100);
  assert.equal(event.players.find(player => player.id === "b").gilWon, 200);
  assert.equal(event.round, 2);
  assert.equal(fixture.render().pending, false);
  assert.deepEqual(fixture.render().pendingKeys, []);
  fixture.cleanup();
});

test("a failed request stops unsent changes without retries or optimistic totals", async () => {
  const fixture = mount();
  const event = livePlayers();
  fixture.receive(event);
  const first = fixture.render().run({ type: "set-gil", id: "a", gilWon: 100 });
  const queued = fixture.render().run({ type: "set-gil", id: "b", gilWon: 200 });
  fixture.requests[0].reject(new Error("Connection lost; commit unknown"));
  assert.deepEqual(await Promise.all([first, queued]), [false, false]);
  assert.equal(fixture.requests.length, 1);
  assert.deepEqual(fixture.render().current, event);
  assert.equal(fixture.render().pending, false);
  assert.match(fixture.render().error, /Unsent queued edits were stopped/);
  fixture.cleanup();
});

test("golden-die edits queue behind unrelated gil saves without changing either player's other fields", async () => {
  const fixture = mount();
  const event = livePlayers();
  fixture.receive(event);
  const first = fixture.render().run({ type: "set-gil", id: "a", gilWon: 100 });
  const queued = fixture.render().run({ type: "set-bonus-die", id: "b", sides: 10 });
  const gil = nextGilRushEvent(event, fixture.requests[0].action, event.revision);
  fixture.requests[0].resolve(gil);
  assert.equal(await first, true);
  assert.equal(fixture.requests[1].revision, gil.revision);
  const die = nextGilRushEvent(gil, fixture.requests[1].action, gil.revision);
  fixture.requests[1].resolve(die);
  assert.equal(await queued, true);
  assert.equal(die.players.find(player => player.id === "a").gilWon, 100);
  assert.equal(die.players.find(player => player.id === "b").gilWon, 0);
  assert.equal(die.players.find(player => player.id === "b").bonusDie, 10);
  fixture.cleanup();
});

test("leaving the page is guarded while saves are pending and the guard cleans up", async () => {
  const originalWindow = globalThis.window;
  const surface = new EventTarget();
  globalThis.window = surface;
  const beforeLeaving = () => {
    const event = new Event("beforeunload", { cancelable: true });
    Object.defineProperty(event, "returnValue", { writable: true, value: "" });
    surface.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const fixture = mount();
  try {
    const event = livePlayers();
    fixture.receive(event);
    assert.equal(beforeLeaving(), false);
    const save = fixture.render().run({ type: "set-gil", id: "a", gilWon: 100 });
    assert.equal(beforeLeaving(), true);
    fixture.requests[0].resolve(nextGilRushEvent(event, fixture.requests[0].action, event.revision));
    assert.equal(await save, true);
    assert.equal(beforeLeaving(), false);
  } finally {
    fixture.cleanup();
    assert.equal(beforeLeaving(), false);
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  }
});

test("another host's revision stops a queued edit instead of silently rebasing it", async () => {
  const fixture = mount();
  const event = livePlayers();
  fixture.receive(event);
  const first = fixture.render().run({ type: "set-gil", id: "a", gilWon: 100 });
  const queued = fixture.render().run({ type: "set-gil", id: "b", gilWon: 200 });
  const own = nextGilRushEvent(event, fixture.requests[0].action, event.revision);
  const remote = nextGilRushEvent(own, { type: "set-gil", id: "b", gilWon: 500 }, own.revision);
  fixture.receive(remote);
  fixture.requests[0].resolve(own);
  assert.deepEqual(await Promise.all([first, queued]), [true, false]);
  assert.equal(fixture.requests.length, 1);
  assert.deepEqual(fixture.render().current, remote);
  assert.match(fixture.render().error, /event changed/);
  fixture.cleanup();
});

test("queued edits cannot overwrite a payout or carry a golden die across a new minigame", async () => {
  for (const kind of ["payout", "minigame"]) {
    const fixture = mount();
    let event = livePlayers();
    if (kind === "payout") {
      event = nextGilRushEvent(event, { type: "start-minigame", kind: "trivia" }, event.revision);
      event = nextGilRushEvent(event, { type: "shuffle-trivia", gameId: event.minigame.id }, event.revision);
    }
    fixture.receive(event);
    const action = kind === "payout" ? { type: "finalise-trivia", gameId: event.minigame.id, winnings: { A: 100, B: 100 } } : { type: "start-minigame", kind: "minority" };
    const first = fixture.render().run(action);
    const queued = fixture.render().run(kind === "payout" ? { type: "set-gil", id: "a", gilWon: 50 } : { type: "set-bonus-die", id: "a", sides: 10 });
    const committed = nextGilRushEvent(event, action, event.revision);
    fixture.requests[0].resolve(committed);
    assert.deepEqual(await Promise.all([first, queued]), [true, false]);
    assert.equal(fixture.requests.length, 1);
    assert.deepEqual(fixture.render().current, committed);
    fixture.cleanup();
  }
});

test("roster additions queue without overwriting each other and unmount cancels unsent changes", async () => {
  const fixture = mount();
  let event = emptyGilRushEvent();
  fixture.receive(event);
  const promises = ["a", "b"].map(id => fixture.render().run({ type: "add", player: { id, rosterId: id, name: id, avatarUrl: null } }));
  for (const [index, promise] of promises.entries()) {
    const request = fixture.requests[index];
    event = nextGilRushEvent(event, request.action, request.revision);
    request.resolve(event);
    assert.equal(await promise, true);
  }
  assert.equal(event.players.length, 2);
  fixture.cleanup();

  const unmounted = mount();
  unmounted.receive(livePlayers());
  const first = unmounted.render().run({ type: "set-gil", id: "a", gilWon: 1 });
  const queued = unmounted.render().run({ type: "set-round", round: 2 });
  unmounted.cleanup();
  assert.deepEqual(await Promise.all([first, queued]), [false, false]);
  unmounted.requests[0].resolve({ ...livePlayers(), revision: 99 });
  await Promise.resolve();
  assert.equal(unmounted.requests.length, 1);
});

test("newer remote snapshots win over older mutation replies and late listeners", async () => {
  const fixture = mount();
  const initial = { ...emptyGilRushEvent(), revision: 4 };
  fixture.receive(initial);
  const save = fixture.render().run({ type: "set-round", round: 2 });
  const remote = { ...initial, revision: 6, round: 3 };
  fixture.receive(remote);
  fixture.requests[0].resolve({ ...initial, revision: 5, round: 2 });
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

test("gil draft survives changed totals and failed saves; each retry needs explicit review", async () => {
  let cursor = 0;
  const slots = [];
  const calls = [];
  globalThis.sharedHarness = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  };
  let revision = 5, gilWon = 100, pending = false;
  const run = async (action, expected) => { calls.push({ action, expected }); return calls.length > 1; };
  const view = () => { cursor = 0; return PlayerGilInput({ player: { id: "a", name: "Axo", avatarUrl: null, gilWon }, revision, run, disabled: false, pending, children: "player trigger" }); };
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
  assert.equal(calls.length, 0, "a changed saved total is reviewed before sending a replacement");
  form = render();
  assert.equal(input(form).props.value, "200000");
  assert.equal(form.props.children[1].props.children[1].props.children[1], "Retry");
  await form.props.onSubmit({ preventDefault() {} });
  assert.equal(calls[0].expected, 6);
  assert.equal(input(render()).props.value, "200000");
  await render().props.onSubmit({ preventDefault() {} });
  assert.equal(calls[1].expected, 6);
  assert.deepEqual(calls[1].action, { type: "set-gil", id: "a", gilWon: 200000 });
  gilWon = 200000;
  assert.equal(input(render()).props.value, "200000");
  assert.equal(view().props.open, false);
  view().props.onOpenChange(true);
  input(render()).props.onChange({ target: { value: "300000" } });
  revision = 7;
  pending = true;
  assert.equal(input(render()).props.disabled, true);
  await render().props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 2);
  pending = false;
  await render().props.onSubmit({ preventDefault() {} });
  assert.equal(calls[2].expected, 7, "unrelated revisions do not invalidate a draft when its saved gil is unchanged");
});
