import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const originalWindow = globalThis.window;
const originalResizeObserver = globalThis.ResizeObserver;
const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  ssr: { noExternal: ["react"] },
  plugins: [{ name: "board-hook-react", enforce: "pre",
    resolveId(id) { if (id === "react") return "\0board-react"; },
    load(id) { if (id === "\0board-react") return `
      export const useRef = () => ({ current: globalThis.boardHarness.canvas });
      export const useState = () => [null, value => { globalThis.boardHarness.geometry = value; }];
      export const useLayoutEffect = callback => { globalThis.boardHarness.cleanup = callback(); };
    `; },
  }],
});
const { useBoardGeometry } = await server.ssrLoadModule("/src/features/cartel-gil-rush/hooks/useBoardGeometry.ts");
after(async () => {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  if (originalResizeObserver === undefined) delete globalThis.ResizeObserver; else globalThis.ResizeObserver = originalResizeObserver;
  delete globalThis.boardHarness;
});

test("geometry is relative to the canvas, follows resizing, and cleans up while hidden", () => {
  const frames = new Map(), observers = [], attributes = {};
  let frameId = 0, left = 300, top = 200, scale = 1;
  const viewport = { setAttribute(name, value) { attributes[name] = value; } };
  const canvas = {
    closest: () => viewport,
    getBoundingClientRect: () => ({ left, top, width: 840 * scale, height: 400 * scale }),
    querySelector(selector) {
      const number = Number(selector.match(/\d+/)[0]);
      return { getBoundingClientRect: () => ({ left: left + number * scale, top: top + number * 2 * scale, width: 48 * scale, height: 48 * scale }) };
    },
  };
  globalThis.window = {
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  globalThis.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { assert.equal(target, canvas); }
    disconnect() { this.disconnected = true; }
  };
  globalThis.boardHarness = { canvas };
  const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } };
  useBoardGeometry(false);
  assert.equal(observers.length, 0);
  useBoardGeometry(true);
  assert.equal(viewport.tabIndex, 0);
  assert.equal(attributes['aria-label'], "Board diagram; scroll horizontally");
  observers[0].callback(); observers[0].callback();
  assert.equal(frames.size, 1);
  flush();
  assert.deepEqual(globalThis.boardHarness.geometry.centers[13], { x: 37, y: 50 });
  left = -200; top = -500; // Horizontal panning or reading-pane movement leaves relative positions unchanged.
  observers[0].callback(); flush();
  assert.deepEqual(globalThis.boardHarness.geometry.centers[13], { x: 37, y: 50 });
  scale = 1.5;
  observers[0].callback(); flush();
  assert.deepEqual(globalThis.boardHarness.geometry.centers[13], { x: 55.5, y: 75 });
  assert.equal(globalThis.boardHarness.geometry.width, 1260);
  observers[0].callback();
  const dispose = globalThis.boardHarness.cleanup;
  dispose();
  assert.equal(frames.size, 0);
  assert.ok(observers[0].disconnected);
  observers[0].callback();
  assert.equal(frames.size, 0);
  useBoardGeometry(false);
  assert.equal(observers.length, 1);
  useBoardGeometry(true); flush();
  assert.equal(observers.length, 2);
  globalThis.boardHarness.cleanup();
});
