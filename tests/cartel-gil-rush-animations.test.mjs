import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const originalWindow = globalThis.window;
let effect;
let dependencies;
let cleanup;
const animations = [];
const panel = {};
const selectors = [];
const listeners = new Set();
const media = { matches: false, addEventListener: (_, callback) => listeners.add(callback), removeEventListener: (_, callback) => listeners.delete(callback) };
globalThis.window = { matchMedia: () => media };
globalThis.gilRushAnimationHarness = {
  useRef: () => ({ current: { querySelector: (selector) => { selectors.push(selector); return panel; } } }),
  useLayoutEffect: (callback, deps) => {
    if (!dependencies || deps.some((value, index) => value !== dependencies[index])) {
      effect = callback;
      dependencies = deps;
    }
  },
  animate: (target) => {
    assert.equal(target, panel);
    const animation = { reverted: false, revert() { this.reverted = true; } };
    animations.push(animation);
    return animation;
  },
};
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react", "animejs"] },
  plugins: [{ name: "gil-rush-animation-boundary", enforce: "pre",
    resolveId(id) { if (["react", "animejs"].includes(id)) return `\0gil-rush-animation-${id}`; },
    load(id) {
      if (id === "\0gil-rush-animation-react") return "export const { useRef, useLayoutEffect } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-animejs") return "export const { animate } = globalThis.gilRushAnimationHarness;";
    },
  }],
});
const { useEventViewAnimation } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useEventViewAnimation.ts");
after(async () => {
  cleanup?.();
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  delete globalThis.gilRushAnimationHarness;
});

function render(view) {
  effect = null;
  useEventViewAnimation(view);
  if (effect) { cleanup?.(); cleanup = effect(); }
}

test("view changes cancel prior reveals; reduced motion settles panels and cleans listeners", () => {
  render("game");
  render("rulebook");
  render("game");
  assert.equal(animations.length, 3);
  assert.ok(animations.slice(0, 2).every((animation) => animation.reverted));
  assert.equal(selectors.at(-1), '[data-event-view="game"]');
  media.matches = true;
  for (const listener of listeners) listener();
  assert.equal(animations.at(-1).reverted, true);
  render("rulebook");
  assert.equal(animations.length, 3);
  cleanup?.();
  assert.equal(listeners.size, 0);
});
