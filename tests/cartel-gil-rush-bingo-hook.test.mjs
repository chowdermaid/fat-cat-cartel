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
