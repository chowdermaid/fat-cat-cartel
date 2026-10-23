import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

// Offline lifecycle checks for the real component/hooks. Browser checks still
// cover actual rendering, layout, tabs and keyboard behavior.
const originalWindow = globalThis.window;
let harness;
const animations = [];
globalThis.laddersAnimationTest = {
  useRef(value) {
    const index = harness.cursor++;
    return harness.slots[index] ??= { current: value };
  },
  useState(initial) {
    const index = harness.cursor++;
    if (!(index in harness.slots)) harness.slots[index] = initial;
    return [harness.slots[index], (value) => {
      const next = typeof value === "function" ? value(harness.slots[index]) : value;
      if (!Object.is(next, harness.slots[index])) { harness.slots[index] = next; harness.dirty = true; }
    }];
  },
  useLayoutEffect(effect, deps) {
    if (!harness.deps || deps.some((value, index) => !Object.is(value, harness.deps[index]))) harness.pending = { effect, deps };
  },
  animate(target, options) {
    const initial = { ...target.style };
    const animation = {
      options, reverted: false,
      revert() { this.reverted = true; Object.assign(target.style, initial); },
      complete() { if (!this.reverted) options.onComplete?.(); },
    };
    animations.push(animation);
    return animation;
  },
};
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent",
  server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  ssr: { noExternal: ["react", "animejs"] },
  plugins: [{ name: "ladders-animation-boundary", enforce: "pre",
    resolveId(id) {
      if (["react", "animejs"].includes(id)) return `\0ladders-animation-${id}`;
      if (id.startsWith("react/jsx")) return "\0ladders-animation-jsx";
    },
    load(id) {
      if (id === "\0ladders-animation-react") return "export const { useRef, useState, useLayoutEffect } = globalThis.laddersAnimationTest;";
      if (id === "\0ladders-animation-animejs") return "export const { animate } = globalThis.laddersAnimationTest;";
      if (id === "\0ladders-animation-jsx") return 'export const jsx = (type, props, key) => ({ type, props, key }); export { jsx as jsxs, jsx as jsxDEV }; export const Fragment = "fragment";';
      if (id.replaceAll("\\", "/").endsWith("/components/ui/button.tsx")) return 'export const Button = "button";';
      if (id.replaceAll("\\", "/").endsWith("/game/AbilityCard.tsx")) return 'export const AbilityCard = "article";';
    },
  }],
});
const { HandSlot } = await server.ssrLoadModule("/src/features/ladders-and-backstabbers/components/game/HandSlot.tsx");
const { useEventViewAnimation } = await server.ssrLoadModule("/src/features/ladders-and-backstabbers/hooks/useEventViewAnimation.ts");
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  delete globalThis.laddersAnimationTest;
});

function fixture(reduced = false) {
  harness = { slots: [], cursor: 0, deps: null, pending: null, cleanup: null, dirty: false };
  animations.length = 0;
  const listeners = new Set();
  const media = { matches: reduced, addEventListener: (_, listener) => listeners.add(listener), removeEventListener: (_, listener) => listeners.delete(listener) };
  globalThis.window = { matchMedia: () => media };
  const elements = new Map();
  const nodes = [];
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node?.props) return;
    nodes.push(node);
    if (node.props.ref) {
      if (!elements.has(node.props.ref)) elements.set(node.props.ref, { style: { opacity: "", transform: "" } });
      node.props.ref.current = elements.get(node.props.ref);
    }
    walk(node.props.children);
  };
  return {
    render(render, attach) {
      let tree;
      do { harness.dirty = false; harness.cursor = 0; tree = render(); } while (harness.dirty);
      for (const ref of elements.keys()) ref.current = null;
      nodes.length = 0;
      walk(tree);
      attach?.(tree);
      if (harness.pending) {
        harness.cleanup?.();
        const { effect, deps } = harness.pending;
        harness.pending = null;
        harness.deps = deps;
        harness.cleanup = effect();
      }
      return nodes;
    },
    motion(value) { media.matches = value; for (const listener of listeners) listener(); },
    dispose() { harness.cleanup?.(); assert.equal(listeners.size, 0); },
  };
}

test("discard commits immediately; exit copy is inert; rapid undo cancels stale animation callbacks", () => {
  const f = fixture();
  const calls = [];
  let card = "Tall Poppy";
  const render = () => f.render(() => HandSlot({ card, crewId: "crew-1", crewNumber: 1, run: (action) => { calls.push(action); return true; } }));
  try {
    const initial = render();
    animations[0].complete();
    const discard = initial.find((node) => node.props["aria-label"] === "Discard Tall Poppy from Crew 1");
    discard.props.onClick();
    assert.deepEqual(calls, [{ type: "discard", crewId: "crew-1", card: "Tall Poppy" }]);
    card = null;
    const leaving = render();
    assert.ok(leaving.some((node) => node.props.inert && node.props["aria-hidden"] === "true"));
    const staleCompletion = animations.at(-1).options.onComplete;
    card = "Tall Poppy";
    const restored = render();
    staleCompletion();
    assert.ok(restored.some((node) => node.props["aria-label"] === "Discard Tall Poppy from Crew 1"));
    assert.equal(animations.at(-2).reverted, true);
    animations.at(-1).complete();
    render();
    assert.equal(calls.length, 1);
  } finally { f.dispose(); }
});

test("completed exit clears its copy without replaying the incoming animation", () => {
  const f = fixture();
  let card = "Roadblock";
  const render = () => f.render(() => HandSlot({ card, crewId: "crew-1", crewNumber: 1, run: () => true }));
  try {
    render();
    card = null;
    render();
    const count = animations.length;
    animations.at(-1).complete();
    const settled = render();
    assert.equal(animations.length, count);
    assert.ok(!settled.some((node) => node.props.inert));
  } finally { f.dispose(); }
});

test("reduced motion skips cards; enabling it mid-exit settles the current hand", async () => {
  const f = fixture(true);
  let card = "Roadblock";
  const render = () => f.render(() => HandSlot({ card, crewId: "crew-1", crewNumber: 1, run: () => true }));
  try {
    render();
    assert.equal(animations.length, 0);
    await Promise.resolve();
    f.motion(false);
    card = null;
    render();
    assert.equal(animations.length, 2);
    f.motion(true);
    const settled = render();
    assert.ok(animations.every((animation) => animation.reverted));
    assert.ok(!settled.some((node) => node.props.inert));
  } finally { f.dispose(); }
});

test("rapid view switches cancel prior reveals; reduced motion settles visible panel", () => {
  const f = fixture();
  const selectors = [];
  const panel = { style: { opacity: "", transform: "" } };
  const render = (view) => f.render(() => useEventViewAnimation(view), (ref) => { ref.current = { querySelector: (selector) => { selectors.push(selector); return panel; } }; });
  try {
    render("game");
    render("rulebook");
    render("game");
    assert.equal(animations.length, 3);
    assert.ok(animations.slice(0, 2).every((animation) => animation.reverted));
    assert.equal(selectors.at(-1), '[data-event-view="game"]');
    f.motion(true);
    assert.equal(animations.at(-1).reverted, true);
    render("rulebook");
    assert.equal(animations.length, 3);
  } finally { f.dispose(); }
});
