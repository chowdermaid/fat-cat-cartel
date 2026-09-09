import assert from "node:assert/strict";
import { mock, test } from "node:test";

let cleanup: (() => void) | undefined;
const animations: { plays: number; reverses: number; reverted: boolean; play: () => void; reverse: () => void; revert: () => void }[] = [];
mock.module("react", { namedExports: { useEffect: (effect: () => (() => void)) => { cleanup = effect(); } } });
mock.module("animejs", { namedExports: {
  stagger: () => 0,
  animate: () => {
    const animation = {
      plays: 0, reverses: 0, reverted: false,
      play() { this.plays++; },
      reverse() { this.reverses++; },
      revert() { this.reverted = true; },
    };
    animations.push(animation);
    return animation;
  },
} });
const { useScrollReveal: mountScrollReveal } = await import("../src/features/home/hooks/useScrollReveal.ts");

function item(children: ReturnType<typeof leaf>[] = []) {
  return { ...leaf(), querySelectorAll: () => children };
}
function leaf() {
  return { style: { opacity: "", transform: "" }, dataset: {} };
}
function fixture(reduced = false) {
  animations.length = 0;
  const child = leaf();
  const card = item([child]);
  const cards = [card];
  const observed = new Set<unknown>();
  let intersection: (entries: unknown[]) => void = () => {};
  let mutation: () => void = () => {};
  let motionChange: (() => void) | undefined;
  let disconnected = false;
  const media = {
    matches: reduced,
    addEventListener: (_event: string, callback: () => void) => { motionChange = callback; },
    removeEventListener: () => { motionChange = undefined; },
  };
  const root = { querySelectorAll: () => cards, contains: (target: unknown) => cards.includes(target as typeof card) };
  const originals = ["window", "IntersectionObserver", "MutationObserver"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => media } });
  Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe(target: unknown) { observed.add(target); }
    unobserve(target: unknown) { observed.delete(target); }
    disconnect() { observed.clear(); }
  } });
  Object.defineProperty(globalThis, "MutationObserver", { configurable: true, value: class {
    constructor(callback: () => void) { mutation = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  } });
  mountScrollReveal({ current: root as unknown as HTMLElement });
  return {
    card, child, cards, observed,
    enter: (ratio = 0.5, top = 300) => intersection([{ target: card, isIntersecting: ratio > 0, intersectionRatio: ratio, boundingClientRect: { top }, rootBounds: { top: 0 } }]),
    mutate: () => mutation(),
    motion: (value: boolean) => { media.matches = value; motionChange?.(); },
    dispose: () => {
      cleanup?.();
      assert.equal(observed.size, 0);
      assert.equal(disconnected, true);
      assert.equal(motionChange, undefined);
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
      mock.restoreAll();
    },
  };
}

test("sections reverse below reveal threshold and replay using same animation handles", () => {
  const f = fixture();
  try {
    assert.equal(f.card.style.opacity, "0");
    f.enter();
    assert.equal(animations.length, 2);
    assert.ok(animations.every((animation) => animation.plays === 1));
    f.enter(0.1, 700);
    assert.ok(animations.every((animation) => animation.reverses === 1));
    f.enter();
    assert.equal(animations.length, 2);
    assert.ok(animations.every((animation) => animation.plays === 2));
    f.enter(0, -500);
    assert.ok(animations.every((animation) => animation.reverses === 1));
  } finally { f.dispose(); }
  assert.ok(animations.every((animation) => animation.reverted));
  assert.equal(f.card.style.opacity, "");
});

test("reduced motion reveals existing and new cards without animation", () => {
  const f = fixture(true);
  try {
    assert.equal(f.card.style.opacity, "1");
    assert.equal(f.child.style.opacity, "1");
    f.cards.push(item());
    f.mutate();
    assert.equal(f.cards[1].style.opacity, "1");
    assert.equal(animations.length, 0);
    assert.equal(f.observed.size, 0);
  } finally { f.dispose(); }
  assert.equal(f.child.style.opacity, "");
});

test("live motion preference changes cancel animations and restart observation", () => {
  const f = fixture();
  try {
    f.enter();
    f.motion(true);
    assert.ok(animations.every((animation) => animation.reverted));
    assert.equal(f.card.style.opacity, "1");
    f.motion(false);
    assert.equal(f.observed.size, 1);
    f.enter();
    assert.equal(animations.length, 4);
  } finally { f.dispose(); }
});

test("dynamic cards are observed and removed cards release animation handles", () => {
  const f = fixture();
  try {
    f.enter();
    f.cards.push(item());
    f.mutate();
    assert.equal(f.observed.size, 2);
    f.cards.shift();
    f.mutate();
    assert.equal(f.observed.size, 1);
    assert.ok(animations.every((animation) => animation.reverted));
  } finally { f.dispose(); }
});
