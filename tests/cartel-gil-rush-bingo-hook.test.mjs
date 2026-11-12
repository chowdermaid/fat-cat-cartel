import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const originalStorage = globalThis.localStorage;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react"] }, plugins: [{ name: "bingo-hook-react", enforce: "pre",
    resolveId(id) { if (id === "react") return "\0bingo-react"; },
    load(id) { if (id === "\0bingo-react") return "export const useState = initial => globalThis.bingoHarness.useState(initial); export const useEffect = (effect, deps) => globalThis.bingoHarness.useEffect(effect, deps);"; },
  }],
});
const { useBingoCard } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useBingoCard.ts");
const { BINGO_STORAGE_KEY } = await server.ssrLoadModule("/src/features/cartel-gil-rush/constants.ts");
after(async () => { await server.close(); if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; delete globalThis.bingoHarness; });

function mount() {
  const states = [], dependencies = [], effects = [];
  let cursor = 0, effectCursor = 0;
  globalThis.bingoHarness = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }];
    },
    useEffect(effect, deps) {
      const index = effectCursor++;
      if (!dependencies[index] || deps.some((value, offset) => value !== dependencies[index][offset])) {
        dependencies[index] = deps;
        effects.push(effect);
      }
    },
  };
  const render = () => { cursor = 0; effectCursor = 0; return useBingoCard(); };
  const flush = () => { effects.splice(0).forEach(effect => effect()); };
  return { render, flush };
}

test("a new card is saved once; toggles save immediately and reopening restores the same order and checks", () => {
  const saved = new Map(), writes = [];
  globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => { saved.set(key, value); writes.push(value); } };
  const first = mount();
  const card = first.render().card;
  first.flush();
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(saved.get(BINGO_STORAGE_KEY)), card);
  first.render().toggle(card.missionIds[3]);
  first.render().toggle(card.missionIds[6]);
  const checked = first.render().card;
  first.flush();
  assert.deepEqual(JSON.parse(saved.get(BINGO_STORAGE_KEY)), checked);
  assert.deepEqual(checked.completedIds, [card.missionIds[3], card.missionIds[6]]);
  const reopened = mount();
  assert.deepEqual(reopened.render().card, checked);
  reopened.flush();
  reopened.render().toggle(card.missionIds[3]);
  const unmarked = reopened.render().card;
  reopened.flush();
  assert.deepEqual(unmarked.completedIds, [card.missionIds[6]]);
  assert.deepEqual(unmarked.missionIds, card.missionIds);
  assert.deepEqual(JSON.parse(saved.get(BINGO_STORAGE_KEY)), unmarked);
});

test("storage read or write failures keep one usable card for the session and expose the notice", async () => {
  for (const failRead of [true, false]) {
    globalThis.localStorage = { getItem() { if (failRead) throw new Error("Blocked storage"); return null; }, setItem() { throw new Error("Quota exceeded"); } };
    const current = mount();
    const ids = [...current.render().card.missionIds];
    current.flush();
    await Promise.resolve();
    assert.equal(current.render().storageUnavailable, true);
    current.render().toggle(ids[0]);
    const checked = current.render();
    current.flush();
    assert.deepEqual(checked.card.missionIds, ids);
    assert.deepEqual(checked.card.completedIds, [ids[0]]);
    current.render().toggle(ids[0]);
    assert.deepEqual(current.render().card.completedIds, []);
  }
});

test("a retired die mission is replaced once without moving other tiles or transferring its checkmark", () => {
  let saved = JSON.stringify({ version: 1, eventId: "cartel-gil-rush-1", missionIds: [1, 2, 3, 5, 6, 7, 8, 9, 10], completedIds: [1, 3, 5] });
  globalThis.localStorage = { getItem: () => saved, setItem: (_key, value) => { saved = value; } };
  const current = mount();
  const card = current.render().card;
  assert.equal(new Set(card.missionIds).size, 9);
  assert.ok(!card.missionIds.includes(3));
  assert.deepEqual(card.missionIds.filter((_id, index) => index !== 2), [1, 2, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(card.completedIds, [1, 5]);
  current.flush();
  assert.deepEqual(JSON.parse(saved), card);
  assert.deepEqual(mount().render().card, card);
});
