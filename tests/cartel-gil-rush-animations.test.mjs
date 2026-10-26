import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { createServer } from "vite";

const originalWindow = globalThis.window;
let refCursor;
let effectCursor;
let refs = [];
let effects = [];
let pending = [];
const animations = [];
const listeners = new Set();
const media = { matches: false, addEventListener: (_, callback) => listeners.add(callback), removeEventListener: (_, callback) => listeners.delete(callback) };
function element(top = 0, clip = null) {
  return {
    style: { opacity: "" },
    getBoundingClientRect: () => ({ top, bottom: top + 100, left: 0, right: 300, width: 300, height: 100 }),
    closest: () => clip,
  };
}
const panel = { ...element(), children: [], querySelectorAll: () => panel.children };
const moodContent = element();
let mounted = true;
const root = { querySelector: (selector) => mounted ? selector === "[data-event-mood-content]" ? moodContent : panel : null };
globalThis.window = { matchMedia: () => media, innerHeight: 600, innerWidth: 500 };
globalThis.gilRushAnimationHarness = {
  useRef: (initial) => {
    const index = refCursor++;
    return refs[index] ??= { current: index === 0 ? root : initial };
  },
  useLayoutEffect: (callback, deps) => {
    const index = effectCursor++;
    if (!effects[index] || deps.some((value, depIndex) => value !== effects[index].deps[depIndex])) {
      pending.push(() => {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: callback() };
      });
    }
  },
  animate: (targets, keyframes, options) => {
    const animation = { targets, keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
    targets.forEach(target => { target.style.opacity = "0"; });
    animations.push(animation);
    return animation;
  },
  stagger: (seconds) => (index) => seconds * index,
};
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react", "motion", "motion/mini"] },
  plugins: [{ name: "gil-rush-animation-boundary", enforce: "pre",
    resolveId(id) { if (["react", "motion", "motion/mini"].includes(id)) return `\0gil-rush-animation-${id}`; },
    load(id) {
      if (id === "\0gil-rush-animation-react") return "export const { useRef, useLayoutEffect } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-motion/mini") return "export const { animate } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-motion") return "export const { stagger } = globalThis.gilRushAnimationHarness;";
    },
  }],
});
const { useEventViewAnimation } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useEventViewAnimation.ts");
function unmount() {
  effects.forEach(effect => effect.cleanup?.());
  effects = [];
  refs = [];
}
beforeEach(() => {
  unmount();
  animations.length = 0;
  panel.children = [];
  panel.style.opacity = "";
  moodContent.style.opacity = "";
  mounted = true;
  media.matches = false;
});
after(async () => {
  unmount();
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  delete globalThis.gilRushAnimationHarness;
});

function render(view, mood = null) {
  refCursor = 0;
  effectCursor = 0;
  pending = [];
  useEventViewAnimation(view, mood);
  pending.forEach(run => run());
}

test("view changes cancel prior reveals; reduced motion settles panels and cleans listeners", () => {
  render("game");
  render("rulebook");
  render("game");
  assert.equal(animations.length, 3);
  assert.ok(animations.slice(0, 2).every((animation) => animation.cancelled));
  media.matches = true;
  for (const listener of listeners) listener();
  assert.equal(animations.at(-1).cancelled, true);
  assert.equal(panel.style.opacity, "");
  render("rulebook");
  assert.equal(animations.length, 3);
  unmount();
  assert.equal(listeners.size, 0);
});

test("initial reduced motion skips all reveals, including mood changes", () => {
  media.matches = true;
  render("game");
  render("game", "yellow");
  render("rulebook", "yellow");
  assert.equal(animations.length, 0);
  assert.equal(listeners.size, 0);
  assert.equal(panel.style.opacity, "");
});

test("only visible content fades; offscreen and clipped rows are excluded and lists capped", () => {
  const visible = element(50);
  visible.style.opacity = ".75";
  const clipped = element(50, { getBoundingClientRect: () => ({ top: 200, bottom: 500, left: 0, right: 300 }) });
  panel.children = [visible, element(-101), element(601), clipped, ...Array.from({ length: 20 }, () => element(200))];
  render("rulebook");
  const animation = animations[0];
  assert.equal(animation.targets.length, 13);
  assert.deepEqual(animation.targets, [panel, visible, ...panel.children.slice(4, 15)]);
  assert.deepEqual(animation.keyframes, { opacity: [0, 1] });
  assert.equal(animation.options.duration, .2);
  assert.equal(animation.options.delay(2), .05);
  unmount();
  assert.equal(visible.style.opacity, ".75");
  assert.equal(panel.style.opacity, "");
  assert.equal(listeners.size, 0);
});

test("mood changes fade only mood content and hidden changes do not animate", () => {
  render("game");
  render("game", "yellow");
  assert.equal(animations.length, 2);
  assert.deepEqual(animations[1].targets, [moodContent]);
  render("game", "yellow");
  assert.equal(animations.length, 2);
  render("rulebook", "yellow");
  assert.equal(animations[1].cancelled, true);
  assert.equal(moodContent.style.opacity, "");
  render("rulebook", "red");
  assert.equal(animations.length, 3);
  render("game", "red");
  assert.equal(animations.length, 4);
  render("game", null);
  assert.deepEqual(animations.at(-1).targets, [moodContent]);
});

test("missing mounted panel safely skips reveals", () => {
  mounted = false;
  render("game");
  render("game", "blue");
  assert.equal(animations.length, 0);
});
