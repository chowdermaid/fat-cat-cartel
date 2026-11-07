import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { createServer } from "vite";

const originalWindow = globalThis.window;
const originalMutationObserver = globalThis.MutationObserver;
let refCursor;
let effectCursor;
let refs = [];
let effects = [];
let pending = [];
const animations = [];
const observers = [];
const frames = new Map();
let frameId = 0;
const listeners = new Set();
const media = { matches: false, addEventListener: (_, callback) => listeners.add(callback), removeEventListener: (_, callback) => listeners.delete(callback) };
function element(top = 0, clip = null) {
  return {
    style: { opacity: "", transform: "" },
    children: [],
    transition: "item",
    getAttribute() { return this.transition; },
    contains(other) { return this.children.some(child => child === other || child.contains(other)); },
    getBoundingClientRect: () => ({ top, bottom: top + 100, left: 0, right: 300, width: 300, height: 100 }),
    closest: () => clip,
  };
}
const panel = { ...element(), children: [], querySelectorAll: () => panel.children };
const moodContent = element();
let mounted = true;
const root = { querySelector: (selector) => mounted ? selector === "[data-event-mood-content]" ? moodContent : panel : null };
globalThis.window = {
  matchMedia: () => media, innerHeight: 600, innerWidth: 500,
  requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
  cancelAnimationFrame(id) { frames.delete(id); },
};
globalThis.MutationObserver = class {
  constructor(callback) { this.callback = callback; observers.push(this); }
  observe(target, options) { this.target = target; this.options = options; }
  disconnect() { this.disconnected = true; }
};
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
  animateGame: (targets, options) => {
    const original = targets.map(target => ({ ...target.style }));
    const animation = { engine: "animejs", targets, options, cancelled: false,
      revert() { this.cancelled = true; targets.forEach((target, index) => { Object.assign(target.style, original[index]); }); },
    };
    targets.forEach(target => { target.style.opacity = "0"; target.style.transform = "translateY(6px)"; });
    animations.push(animation);
    return animation;
  },
  stagger: (step, { start = 0 } = {}) => (index) => start + step * index,
};
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react", "motion", "motion/mini", "animejs"] },
  plugins: [{ name: "gil-rush-animation-boundary", enforce: "pre",
    resolveId(id) { if (["react", "motion", "motion/mini", "animejs"].includes(id)) return `\0gil-rush-animation-${id}`; },
    load(id) {
      if (id === "\0gil-rush-animation-react") return "export const { useRef, useLayoutEffect } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-motion/mini") return "export const { animate } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-motion") return "export const { stagger } = globalThis.gilRushAnimationHarness;";
      if (id === "\0gil-rush-animation-animejs") return "export const { animateGame: animate, stagger } = globalThis.gilRushAnimationHarness;";
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
  observers.length = 0;
  frames.clear();
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
  if (originalMutationObserver === undefined) delete globalThis.MutationObserver;
  else globalThis.MutationObserver = originalMutationObserver;
  delete globalThis.gilRushAnimationHarness;
});

function render(view, mood = null) {
  refCursor = 0;
  effectCursor = 0;
  pending = [];
  useEventViewAnimation(view, mood);
  pending.forEach(run => run());
}

function mutate() { observers.filter(observer => !observer.disconnected).forEach(observer => observer.callback()); }
function flush() { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } }

test("view changes cancel prior reveals; reduced motion settles panels and cleans listeners", () => {
  panel.children = [element()];
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
  assert.ok(observers.every(observer => observer.disconnected));
});

test("initial reduced motion skips all reveals", () => {
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

test("missing mounted panel safely skips reveals", () => {
  mounted = false;
  render("game");
  render("game", "blue");
  assert.equal(animations.length, 0);
});

test("AnimeJS animates only changed game sections and restores their original styles", () => {
  const row = element(50), banner = element(200), nested = element(250), offscreen = element(601);
  row.style.opacity = ".75";
  row.style.transform = "translateX(2px)";
  banner.children = [nested];
  panel.children = [row, banner, nested, offscreen];
  render("game");
  assert.equal(animations[0].engine, "animejs");
  assert.deepEqual(animations[0].targets, [row, banner]);
  assert.deepEqual(animations[0].options.opacity, [0, 1]);
  assert.deepEqual(animations[0].options.translateY, [6, 0]);
  assert.equal(animations[0].options.duration, 280);
  assert.equal(animations[0].options.delay(2), 50);
  assert.equal(animations[0].options.height, undefined);
  assert.deepEqual(observers[0].options.attributeFilter, ["data-game-transition"]);
  animations[0].options.onComplete(animations[0]);
  assert.deepEqual(row.style, { opacity: ".75", transform: "translateX(2px)" });
  row.transition = "player:100000:10";
  mutate(); mutate();
  assert.equal(frames.size, 1);
  flush();
  assert.deepEqual(animations[1].targets, [row]);
  mutate(); flush();
  assert.equal(animations.length, 2, "unrelated edits and geometry updates do not replay animations");
  unmount();
  assert.deepEqual(row.style, { opacity: ".75", transform: "translateX(2px)" });
});

test("delayed chest players and prizes animate as they appear without replaying their parent", () => {
  const chest = element(50), player = element(100), prize = element(200);
  player.transition = "chest-player:Axo";
  prize.transition = "chest-prize:200k";
  panel.children = [chest];
  render("game");
  chest.children = [player];
  panel.children.push(player);
  mutate(); flush();
  assert.deepEqual(animations[1].targets, [player]);
  assert.equal(animations[1].options.duration, 850);
  assert.equal(animations[0].cancelled, true);
  chest.children.push(prize);
  panel.children.push(prize);
  mutate(); flush();
  assert.deepEqual(animations[2].targets, [prize]);
  assert.equal(animations[2].options.duration, 1150);
  assert.equal(animations[1].cancelled, false, "independent reveals finish without cutting each other off");
});

test("chest opening runs independently of gil updates and stops for reduced motion", () => {
  const chest = element(50), icon = element(60), row = element(200);
  panel.children = [chest, row];
  render("game");
  animations[0].options.onComplete(animations[0]);
  icon.transition = "chest-opening:1000";
  chest.children = [icon];
  panel.children.push(icon);
  mutate(); flush();
  const opening = animations.find(animation => animation.targets.includes(icon));
  assert.equal(opening.options.duration, 1600);
  row.transition = "player:gil-awarded";
  mutate(); flush();
  assert.equal(opening.cancelled, false);
  media.matches = true;
  for (const listener of listeners) listener();
  assert.ok(animations.every(animation => animation.cancelled));
  assert.deepEqual(icon.style, { opacity: "", transform: "" });
});

test("game observers and queued frames stop on navigation, unmount or reduced motion", () => {
  const row = element();
  panel.children = [row];
  render("game");
  row.transition = "updated";
  mutate();
  assert.equal(frames.size, 1);
  media.matches = true;
  for (const listener of listeners) listener();
  assert.equal(frames.size, 0);
  assert.equal(animations[0].cancelled, true);
  assert.deepEqual(row.style, { opacity: "", transform: "" });
  mutate();
  assert.equal(frames.size, 0);
  unmount();
  observers[0].callback();
  assert.equal(frames.size, 0);
  assert.equal(listeners.size, 0);
  assert.equal(observers[0].disconnected, true);
});

test("large game rosters are capped and hidden updates never animate", () => {
  const offscreen = element(601);
  panel.children = [offscreen, ...Array.from({ length: 30 }, () => element(100))];
  render("game");
  assert.equal(animations[0].targets.length, 18);
  assert.ok(!animations[0].targets.includes(offscreen));
  offscreen.transition = "new-total";
  mutate(); flush();
  assert.equal(animations.length, 1);
});

test("Split or Steal reveals paired decisions before payouts and cancels delayed work when cleared", () => {
  const first = element(50), second = element(100), payoutA = element(150), payoutB = element(200), sparkle = element(200), receipt = element(250);
  first.transition = "split-decision:0:split";
  second.transition = "split-decision:1:steal";
  payoutA.transition = "split-payout:0:0";
  payoutB.transition = "split-payout:1:200000";
  sparkle.transition = "split-celebration:1:200000";
  receipt.transition = "split-receipt";
  panel.children = [first, second, payoutA, payoutB, sparkle, receipt];
  render("game");
  const decisions = animations.find(animation => animation.targets.includes(first));
  const payouts = animations.find(animation => animation.targets.includes(payoutA));
  const celebration = animations.find(animation => animation.targets.includes(sparkle));
  const message = animations.find(animation => animation.targets.includes(receipt));
  assert.deepEqual(decisions.targets, [first, second]);
  assert.equal(decisions.options.delay(0), 550);
  assert.equal(decisions.options.delay(1), 670);
  assert.equal(decisions.options.duration, 950);
  assert.equal(payouts.options.delay(0), 1550);
  assert.equal(payouts.options.delay(1), 1670);
  assert.equal(payouts.options.duration, 1050);
  assert.equal(celebration.options.delay(0), 1300);
  assert.equal(message.options.delay, 2300);
  assert.ok(animations.every(animation => !animation.cancelled));
  panel.children = [];
  mutate(); flush();
  assert.ok(animations.every(animation => animation.cancelled));
  assert.deepEqual(payoutB.style, { opacity: "", transform: "" });
});
