import assert from "node:assert/strict";
import { after, test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

const server = await createServer({
  configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false },
  resolve: { alias: { "@": path.resolve("src") } },
  plugins: [{ name: "board-selection-state", enforce: "pre", transform(code, id) {
    if (id.replaceAll("\\", "/").endsWith("/rulebook/BoardOverview.tsx")) return code.replace('import { useState } from "react";', 'const useState = () => globalThis.boardSelectionState();');
  } }],
});
const { BoardOverview } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/BoardOverview.tsx");
after(async () => { await server.close(); delete globalThis.boardSelectionState; });

function descendants(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(descendants)];
}

test("origin selection toggles locally and Escape restores all routes without extra controls", () => {
  let selected = null;
  globalThis.boardSelectionState = () => [selected, update => { selected = typeof update === "function" ? update(selected) : update; }];
  const render = active => BoardOverview({ active });
  const find = predicate => descendants(render(true)).find(predicate);
  const grid = () => find(element => element.type?.name === "BoardGrid");
  assert.equal(grid().props.selected, null);
  grid().props.onSelect("ladder-14-45");
  assert.equal(grid().props.selected, "ladder-14-45");
  grid().props.onSelect("fall-74-13");
  assert.equal(grid().props.selected, "fall-74-13");
  assert.match(find(element => element.props?.role === "status").props.children, /Fall from 74 to 13 selected/);
  grid().props.onSelect("fall-74-13");
  assert.equal(grid().props.selected, null);
  grid().props.onSelect("ladder-14-45");
  render(true).props.onKeyDown({ key: "Escape" });
  assert.equal(grid().props.selected, null);
  assert.equal(find(element => element.props?.['aria-label'] === "Ladder routes"), undefined);
  assert.equal(find(element => element.props?.children?.includes?.("Clear selection")), undefined);
  grid().props.onSelect("ladder-33-60");
  assert.equal(descendants(render(false)).find(element => element.type?.name === "BoardGrid").props.active, false);
  assert.equal(grid().props.selected, "ladder-33-60");
  assert.equal(descendants(render(true)).filter(element => element.type === "input").length, 0);
});
