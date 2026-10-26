import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const originalWindow = globalThis.window;
const originalResizeObserver = globalThis.ResizeObserver;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react"] },
  plugins: [{ name: "rulebook-hook-react", enforce: "pre",
    resolveId(id) { if (id === "react") return "\0rulebook-react"; },
    load(id) { if (id === "\0rulebook-react") return `
      export const useRef = value => globalThis.rulebookHarness.useRef(value);
      export const useState = value => globalThis.rulebookHarness.useState(value);
      export const useCallback = callback => callback;
      export const useLayoutEffect = (callback, deps) => globalThis.rulebookHarness.useLayoutEffect(callback, deps);
    `; },
  }],
});
const { useRulebookScroll } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useRulebookScroll.ts");

after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  if (originalResizeObserver === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = originalResizeObserver;
  delete globalThis.rulebookHarness;
});

function mount() {
  const slots = [];
  const frames = new Map();
  const scrollListeners = new Set();
  const resizeListeners = new Set();
  const observers = [];
  const scrolls = [];
  const focus = [];
  const contentStyles = new Map();
  const ids = ["board-overview", "quick-start", "special-tiles", "board-moods", "rewards"];
  let cursor = 0, frameId = 0, effect, cleanup, dependencies, api;
  let reducedMotion = false;
  const viewport = {
    scrollTop: 0, clientHeight: 500, scrollHeight: 3000,
    setAttribute() {}, getBoundingClientRect: () => ({ top: 200 }),
    addEventListener: (_, listener) => scrollListeners.add(listener),
    removeEventListener: (_, listener) => scrollListeners.delete(listener),
    scrollTo(options) { scrolls.push(options); this.scrollTop = options.top; for (const listener of scrollListeners) listener(); },
  };
  const content = { style: { getPropertyValue: name => contentStyles.get(name), setProperty: (name, value) => contentStyles.set(name, value) }, querySelector(selector) {
    const index = ids.findIndex(id => selector === `#rulebook-${id} h2`);
    return index < 0 ? null : {
      getBoundingClientRect: () => ({ top: 216 + index * 600 - viewport.scrollTop }),
      focus: options => focus.push({ id: ids[index], options }),
    };
  } };
  globalThis.window = {
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    addEventListener: (_, listener) => resizeListeners.add(listener),
    removeEventListener: (_, listener) => resizeListeners.delete(listener),
    matchMedia: () => ({ matches: reducedMotion }),
  };
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
  };
  globalThis.rulebookHarness = {
    useRef(value) { const index = cursor++; return slots[index] ??= { current: index === 0 ? { querySelector: () => viewport } : index === 1 ? content : value }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = value; }]; },
    useLayoutEffect(callback, deps) { if (!dependencies || deps.some((value, index) => value !== dependencies[index])) { effect = callback; dependencies = deps; } },
  };
  function render(active = true) {
    cursor = 0; effect = null; api = useRulebookScroll(active);
    if (effect) { cleanup?.(); cleanup = effect(); }
    return api;
  }
  function flush() { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } return render(); }
  return { render, flush, viewport, scrolls, focus, frames, scrollListeners, resizeListeners, observers, contentStyles,
    setReducedMotion(value) { reducedMotion = value; },
    scroll(top) { viewport.scrollTop = top; for (const listener of scrollListeners) listener(); },
    unmount() { cleanup?.(); },
  };
}

test("navigation focuses headings without ancestor scrolling and honours reduced motion", () => {
  const app = mount();
  try {
    const api = app.render();
    api.navigateToChapter("board-moods");
    assert.equal(api.activeChapter, "board-overview");
    assert.deepEqual(app.scrolls.at(-1), { top: 1800, behavior: "smooth" });
    assert.deepEqual(app.focus.at(-1), { id: "board-moods", options: { preventScroll: true } });
    assert.equal(app.flush().activeChapter, "board-moods");
    app.setReducedMotion(true);
    app.render().navigateToChapter("rewards");
    assert.deepEqual(app.scrolls.at(-1), { top: 2400, behavior: "instant" });
    assert.equal(app.flush().activeChapter, "rewards");
  } finally { app.unmount(); }
});

test("reading height follows the viewport so final chapters can align above the bottom", () => {
  const app = mount();
  try {
    app.render();
    assert.equal(app.contentStyles.get("--rulebook-viewport-height"), "500px");
    app.viewport.clientHeight = 900;
    app.observers[0].callback(); app.flush();
    assert.equal(app.contentStyles.get("--rulebook-viewport-height"), "900px");
  } finally { app.unmount(); }
});

test("scroll updates coalesce, passive reading keeps focus, hidden views restore position", () => {
  const app = mount();
  try {
    app.render();
    app.scroll(500); app.scroll(1900);
    assert.equal(app.frames.size, 1);
    assert.equal(app.flush().activeChapter, "board-moods");
    assert.equal(app.focus.length, 0);
    app.scroll(2000);
    const hidden = app.render(false);
    assert.equal(app.frames.size, 0);
    assert.equal(app.scrollListeners.size, 0);
    assert.equal(app.resizeListeners.size, 0);
    assert.ok(app.observers[0].disconnected);
    hidden.navigateToChapter("quick-start");
    assert.equal(app.scrolls.length, 0);
    app.viewport.scrollTop = 0;
    app.render(true);
    assert.equal(app.viewport.scrollTop, 2000);
    assert.equal(app.render().activeChapter, "board-moods");
    assert.equal(app.observers.at(-1).targets.length, 2);
    app.observers.at(-1).callback();
    assert.equal(app.frames.size, 1);
  } finally { app.unmount(); }
  assert.equal(app.frames.size, 0);
  assert.equal(app.scrollListeners.size, 0);
  assert.equal(app.resizeListeners.size, 0);
  assert.ok(app.observers.every(observer => observer.disconnected));
});
