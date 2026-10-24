import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

function mount(render) {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (value) => { slots[index].value = typeof value === "function" ? value(slots[index].value) : value; }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; });
      }
    },
  };
  return {
    render() {
      cursor = 0; globalThis.collectionHooks = hooks;
      const value = render();
      for (const effect of effects.splice(0)) effect();
      return value;
    },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

const tick = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); };
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(textContent).join(" ");
  if (typeof node !== "object") return String(node);
  return textContent(node.props?.children);
}

let runner, useFCCollection, invalidate, buildMembers, freshness, LeaderboardTable, MemberHeader;
let now, reads, storage, fixture, read;
const member = { id: "1", lodestoneId: "1", name: "Chow Chow", fcRank: "Housecat" };
const owned = { mounts: [], minions: [], titles: [], achievements: [] };
const collectibles = { mounts: [{ id: 1, name: "Mount", owned: "1", patch: "7.0", points: 10 }], minions: [], titles: [], achievements: [] };
function payload(timestamp = now) {
  return { members: [member], allCollectibles: collectibles,
    memberData: { "1": { avatar: "", owned, previousOwned: {}, lastFetched: timestamp } },
    lastFetched: timestamp, timestamp };
}

before(async () => {
  runner = await createServer({ configFile: false, envFile: false, logLevel: "silent",
    server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } },
    oxc: { jsx: { runtime: "automatic" } },
    plugins: [{ name: "collection-offline-tests", enforce: "pre",
      resolveId(id) { if (id === "collection-hooks") return "\0collection-hooks"; },
      transform(code, id) {
        if (/useFCCollection\.ts$|LeaderboardTable\.tsx$/.test(id)) return code.replace('from "react"', 'from "collection-hooks"');
      },
      load(id) {
        if (id === "\0collection-hooks") return ["useState", "useRef", "useMemo", "useEffect"].map((name) => `export const ${name} = (...args) => globalThis.collectionHooks.${name}(...args);`).join("\n");
        if (id.replaceAll("\\", "/").endsWith("/lib/db.ts")) return 'export const db = {}; export const ref = (_, path) => path; export const get = (path) => globalThis.collectionRead(path);';
      },
    }],
  });
  ({ useFCCollection } = await runner.ssrLoadModule("/src/features/fc-collection/api/useFCCollection.ts"));
  ({ invalidateCollectionCache: invalidate } = await runner.ssrLoadModule("/src/features/fc-collection/utils/collectionCache.ts"));
  ({ buildMembersWithMounts: buildMembers } = await runner.ssrLoadModule("/src/features/fc-collection/utils/collectionData.ts"));
  ({ collectionFreshness: freshness } = await runner.ssrLoadModule("/src/features/fc-collection/utils/collectionDisplay.ts"));
  ({ LeaderboardTable } = await runner.ssrLoadModule("/src/features/fc-collection/components/leaderboard/LeaderboardTable.tsx"));
  ({ MemberHeader } = await runner.ssrLoadModule("/src/features/fc-collection/components/detail/MemberHeader.tsx"));
});

beforeEach(() => {
  now = 1_800_000_000_000; reads = []; storage = new Map();
  mock.method(Date, "now", () => now);
  globalThis.window = Object.assign(new EventTarget(), { setTimeout, clearTimeout });
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key),
  };
  fixture = { members: { "1": member }, "fcCollection/collectibles": { ...collectibles, lastFetched: now }, "fcCollection/memberData": payload().memberData };
  read = async (key) => ({ val: () => fixture[key] });
  globalThis.collectionRead = (key) => { reads.push(key); return read(key); };
});
afterEach(() => mock.restoreAll());
after(async () => runner?.close());

test("fresh cache avoids Firebase; expired cache revalidates on focus without duplicate reads", async () => {
  storage.set("fcc_collection_v3", JSON.stringify(payload()));
  const view = mount(useFCCollection); view.render(); await tick();
  assert.equal(view.render().members.length, 1);
  window.dispatchEvent(new Event("focus"));
  assert.equal(reads.length, 0);
  now += 3 * 60 * 60 * 1000 + 1;
  window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange"));
  await tick();
  assert.equal(reads.length, 3);
  assert.equal(view.render().error, null);
  view.unmount();
});

test("admin invalidation reloads mounted views and rejects an older in-flight snapshot", async () => {
  const old = deferred();
  read = (key) => old.promise.then(() => ({ val: () => key === "members" ? { "9": { name: "Old member" } } : {} }));
  const view = mount(useFCCollection); view.render(); await tick();
  assert.equal(reads.length, 3);
  invalidate();
  read = async (key) => ({ val: () => fixture[key] });
  old.resolve(); await tick();
  assert.equal(reads.length, 6);
  assert.equal(view.render().members[0].name, "Chow Chow");
  assert.equal(JSON.parse(storage.get("fcc_collection_v3")).members[0].name, "Chow Chow");
  view.unmount();
  invalidate(); assert.equal(reads.length, 6, "unmounted listeners are removed");
});

test("cross-tab cache removal bypasses the local TTL", async () => {
  storage.set("fcc_collection_v3", JSON.stringify(payload()));
  const view = mount(useFCCollection); view.render(); await tick();
  storage.delete("fcc_collection_v3");
  const event = Object.assign(new Event("storage"), { key: "fcc_collection_v3", newValue: null });
  window.dispatchEvent(event); await tick();
  assert.equal(reads.length, 3);
  view.unmount();
});

test("a failed reload keeps displayed values and exposes an error, then recovers", async () => {
  storage.set("fcc_collection_v3", JSON.stringify(payload()));
  const view = mount(useFCCollection); view.render(); await tick();
  read = async () => { throw new Error("offline"); };
  invalidate(); await tick();
  assert.equal(view.render().members[0].name, "Chow Chow");
  assert.match(view.render().error, /Unable to load/);
  read = async (key) => ({ val: () => fixture[key] });
  now += 30_001;
  window.dispatchEvent(new Event("focus")); await tick();
  assert.equal(view.render().error, null);
  view.unmount();
});

test("an expired browser snapshot remains usable when its initial revalidation fails", async () => {
  storage.set("fcc_collection_v3", JSON.stringify(payload(now - 4 * 60 * 60 * 1000)));
  read = async () => { throw new Error("offline"); };
  const view = mount(useFCCollection); view.render(); await tick();
  assert.equal(view.render().members[0].name, "Chow Chow");
  assert.equal(view.render().loading, false);
  assert.match(view.render().error, /Unable to load/);
  assert.equal(reads.length, 3);
  view.unmount();
});

test("late completions after unmount cannot repopulate the browser cache", async () => {
  const pending = deferred();
  read = (key) => pending.promise.then(() => ({ val: () => fixture[key] }));
  const view = mount(useFCCollection); view.render(); await tick(); view.unmount();
  pending.resolve(); await tick();
  assert.equal(storage.size, 0);
});

test("missing data is unavailable while valid empty collections remain zero, and failures are stale", () => {
  const missing = buildMembers([member], {})[0];
  const empty = buildMembers([member], payload().memberData)[0];
  const failed = { ...empty, lastError: "HTTP 503" };
  assert.equal(freshness(missing).unavailable, true);
  assert.equal(freshness(empty).unavailable, false);
  assert.equal(freshness(empty).stale, false);
  assert.equal(freshness(failed).stale, true);
  assert.equal(freshness(empty, now + 26 * 60 * 60 * 1000 + 1).stale, true);
  const view = mount(() => LeaderboardTable({ members: [missing], allCollectibles: collectibles }));
  assert.match(textContent(view.render()), /Data unavailable/);
  assert.doesNotMatch(textContent(view.render()), /0\.0%/);
  assert.match(textContent(MemberHeader({ member: missing, count: 0, total: 1 })), /Data unavailable/);
  const zeroView = mount(() => LeaderboardTable({ members: [empty], allCollectibles: collectibles }));
  assert.match(textContent(zeroView.render()), /0\.0%/);
  assert.doesNotMatch(textContent(zeroView.render()), /Data unavailable/);
});
