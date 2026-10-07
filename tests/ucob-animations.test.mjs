import assert from "node:assert/strict";
import { after, mock, test } from "node:test";

let harness;
const animations = [];
function scheduleEffect(effect, deps) {
  if (!harness.deps || deps.some((value, index) => !Object.is(value, harness.deps[index]))) {
    harness.pending = effect;
    harness.deps = deps;
  }
}
mock.module("react", { namedExports: {
  useRef: (value) => {
    const index = harness.cursor++;
    return harness.refs[index] ??= { current: value };
  },
  useEffect: scheduleEffect,
  useLayoutEffect: scheduleEffect,
} });
mock.module("animejs", { namedExports: {
  animate: (target, options) => {
    const initial = target.value;
    const initialOpacity = target.style?.opacity;
    const animation = {
      options,
      reverted: false,
      advance: (fraction) => {
        if (animation.reverted) return;
        if (options.value !== undefined) target.value = initial + (options.value - initial) * fraction;
        if (options.opacity) target.style.opacity = String(options.opacity[0] + (options.opacity[1] - options.opacity[0]) * fraction);
        options.onUpdate?.();
      },
      revert: () => {
        animation.reverted = true;
        if (options.value !== undefined) target.value = initial;
        if (options.opacity) target.style.opacity = initialOpacity;
      },
    };
    animations.push(animation);
    return animation;
  },
} });
const { useUcobEntrance, useUcobNumberAnimation, useUcobTextChange } = await import("../src/features/ucob-prog/hooks/useUcobAnimations.ts");
after(() => mock.restoreAll());

function fixture(reduced = false) {
  harness = { refs: [], cursor: 0, deps: null, pending: null, cleanup: null };
  animations.length = 0;
  const listeners = new Set();
  const observed = new Set();
  const media = {
    matches: reduced,
    addEventListener: (_event, callback) => listeners.add(callback),
    removeEventListener: (_event, callback) => listeners.delete(callback),
  };
  let intersect;
  const originals = ["window", "IntersectionObserver"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => media } });
  Object.defineProperty(globalThis, "IntersectionObserver", { configurable: true, value: class {
    constructor(callback) { intersect = callback; }
    observe(element) { observed.add(element); }
    disconnect() { observed.clear(); }
  } });
  return {
    render: (hook, attach) => {
      harness.cursor = 0;
      const result = hook();
      attach?.(result);
      if (harness.pending) {
        harness.cleanup?.();
        harness.cleanup = harness.pending();
        harness.pending = null;
      }
    },
    enter: () => intersect([{ isIntersecting: true }]),
    motion: (value) => { media.matches = value; for (const listener of listeners) listener(); },
    observed,
    dispose: () => {
      harness.cleanup?.();
      assert.equal(listeners.size, 0);
      assert.equal(observed.size, 0);
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("numeric displays start at real data and only tween changed known values", () => {
  const f = fixture();
  let displayed;
  const render = (value) => { displayed = value; };
  const update = (value) => f.render(() => useUcobNumberAnimation(value, render, 450));
  try {
    update(null);
    update(81.2);
    assert.equal(displayed, 81.2);
    update(81.2);
    assert.equal(animations.length, 0);
    update(85);
    assert.equal(displayed, 81.2);
    animations[0].advance(0.5);
    assert.equal(displayed, 83.1);
    animations[0].advance(1);
    assert.equal(displayed, 85);
    update(85);
    assert.equal(animations.length, 1);
  } finally { f.dispose(); }
  assert.equal(displayed, 85);
});

test("interrupted updates and live reduced motion settle on the latest target", () => {
  const f = fixture();
  let displayed;
  const render = (value) => { displayed = value; };
  const update = (value) => f.render(() => useUcobNumberAnimation(value, render, 350));
  try {
    update(72);
    update(80);
    animations[0].advance(0.5);
    update(90);
    assert.equal(animations[0].reverted, true);
    animations[1].advance(0.5);
    f.motion(true);
    assert.equal(displayed, 90);
    animations[1].advance(1);
    assert.equal(displayed, 90);
    update(95);
    assert.equal(displayed, 95);
    assert.equal(animations.length, 2);
    update(null);
    update(100);
    assert.equal(displayed, 100);
  } finally { f.dispose(); }
});

test("entrance waits for visibility and does not replay on data rerenders", () => {
  const f = fixture();
  const element = { style: { opacity: "" } };
  const update = (enabled) => f.render(() => useUcobEntrance(enabled, 120), (ref) => { ref.current = element; });
  try {
    update(false);
    assert.equal(f.observed.size, 0);
    update(true);
    assert.equal(animations.length, 0);
    assert.equal(f.observed.size, 1);
    assert.equal(element.style.opacity, "0");
    f.enter();
    assert.equal(animations.length, 1);
    assert.equal(animations[0].options.delay, 120);
    animations[0].advance(0.5);
    f.motion(true);
    assert.equal(element.style.opacity, "");
    update(false);
    update(true);
    assert.equal(animations.length, 1);
    assert.equal(f.observed.size, 0);
  } finally { f.dispose(); }
});

test("text fades only on changes and cleanup restores readable styles", () => {
  const f = fixture();
  const element = { style: { opacity: "" } };
  const update = (value) => f.render(() => useUcobTextChange(value), (ref) => { ref.current = element; });
  try {
    update("P4");
    update("P4");
    assert.equal(animations.length, 0);
    update("P5");
    assert.equal(animations.length, 1);
    animations[0].advance(0.5);
    f.motion(true);
    assert.equal(element.style.opacity, "");
    update("Cleared");
    assert.equal(animations.length, 1);
  } finally { f.dispose(); }
});

test("reduced motion reveals a pending entrance before its stagger begins", () => {
  const f = fixture();
  const element = { style: { opacity: "", transform: "" } };
  try {
    f.render(() => useUcobEntrance(true, 240), (ref) => { ref.current = element; });
    assert.equal(element.style.opacity, "0");
    f.motion(true);
    assert.equal(element.style.opacity, "");
    assert.equal(element.style.transform, "");
    assert.equal(f.observed.size, 0);
    assert.equal(animations.length, 0);
  } finally { f.dispose(); }
});

test("initial reduced motion skips entrance, text, and number animations", () => {
  for (const kind of ["entrance", "text", "number"]) {
    const f = fixture(true);
    const element = { style: { opacity: "" } };
    let displayed;
    const render = (value) => { displayed = value; };
    try {
      if (kind === "entrance") f.render(() => useUcobEntrance(), (ref) => { ref.current = element; });
      if (kind === "text") {
        for (const value of ["P4", "P5"]) f.render(() => useUcobTextChange(value), (ref) => { ref.current = element; });
      }
      if (kind === "number") {
        for (const value of [72, 80]) f.render(() => useUcobNumberAnimation(value, render, 350));
        assert.equal(displayed, 80);
      }
      assert.equal(animations.length, 0);
      assert.equal(f.observed.size, 0);
    } finally { f.dispose(); }
  }
});
