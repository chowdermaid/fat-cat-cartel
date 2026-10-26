import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import path from "node:path";

const server = await createServer({ configFile: false, envFile: false, logLevel: "silent", server: { middlewareMode: true, ws: false }, resolve: { alias: { "@": path.resolve("src") } } });
const { boardConnections } = await server.ssrLoadModule("/src/features/cartel-gil-rush/boardData.ts");
const { boardCells, describeBoardCell, getBoardPosition } = await server.ssrLoadModule("/src/features/cartel-gil-rush/utils/board.ts");
const { BoardConnections } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/board/BoardConnections.tsx");
const { BoardGrid } = await server.ssrLoadModule("/src/features/cartel-gil-rush/components/rulebook/board/BoardGrid.tsx");
after(() => server.close());

test("all 90 cells occupy unique serpentine positions with continuous adjacent steps", () => {
  assert.deepEqual(boardCells.map(({ number }) => number), Array.from({ length: 90 }, (_, i) => i + 1));
  const positions = boardCells.map(({ number }) => getBoardPosition(number));
  assert.equal(new Set(positions.map(({ row, column }) => `${row}:${column}`)).size, 90);
  for (const [number, position] of [[1, { row: 5, column: 0 }], [15, { row: 5, column: 14 }], [16, { row: 4, column: 14 }], [30, { row: 4, column: 0 }], [76, { row: 0, column: 14 }], [90, { row: 0, column: 0 }]]) assert.deepEqual(getBoardPosition(number), position);
  positions.forEach((position, index) => {
    assert.ok(position.row >= 0 && position.row < 6 && position.column >= 0 && position.column < 15);
    if (index) assert.equal(Math.abs(position.row - positions[index - 1].row) + Math.abs(position.column - positions[index - 1].column), 1);
  });
  for (const invalid of [0, 91, 1.5, NaN, Infinity]) assert.throws(() => getBoardPosition(invalid), RangeError);
});

test("the revised 24 special tiles and eight routes are reproduced exactly", () => {
  const expected = {
    6: "mushroom", 10: "moogle", 14: "ladder", 19: "fatcat", 23: "chocobo", 25: "shark",
    33: "ladder", 34: "red-arrow", 35: "fatcat", 39: "moogle", 49: "mushroom", 53: "shark",
    54: "red-arrow", 57: "chocobo", 62: "moogle", 68: "red-arrow", 70: "fatcat", 72: "red-arrow",
    74: "red-arrow", 76: "shark", 81: "chocobo", 87: "red-arrow", 89: "mushroom", 90: "finish",
  };
  assert.deepEqual(Object.fromEntries(boardCells.filter(({ symbol }) => symbol).map(({ number, symbol }) => [number, symbol])), expected);
  assert.deepEqual(boardConnections.map(({ kind, from, to }) => [kind, from, to]), [
    ["ladder", 14, 45], ["ladder", 33, 60], ["fall", 34, 3], ["fall", 54, 24], ["fall", 68, 20], ["fall", 72, 51], ["fall", 74, 13], ["fall", 87, 59],
  ]);
  for (const cell of boardCells) assert.deepEqual(cell.incoming, boardConnections.filter(({ to }) => to === cell.number));
  const thirteen = boardCells[12];
  assert.equal(thirteen.symbol, null);
  assert.equal(thirteen.outgoing, null);
  assert.deepEqual(thirteen.incoming.map(({ from }) => from), [74]);
  assert.equal(describeBoardCell(thirteen), "Tile 13. Fall destination from 74");
  assert.equal(boardCells[13].outgoing.to, 45);
  assert.equal(describeBoardCell(boardCells[13]), "Tile 14. Ladder to 45");
  assert.equal(describeBoardCell(boardCells[24]), "Tile 25. Shark");
});

test("SVG rails and straight falls stay aligned with their endpoint cells across board sizes", () => {
  for (const width of [840, 1200]) {
    const size = (width - 56 - 14 * 4) / 15;
    const centers = Object.fromEntries(boardCells.map(({ number }) => {
      const { row, column } = getBoardPosition(number);
      return [number, { x: 28 + column * (size + 4) + size / 2, y: 4 + row * (size + 4) + size / 2 }];
    }));
    const html = renderToStaticMarkup(createElement(BoardConnections, { geometry: { width, height: 32 + size * 6 + 60, cellSize: size, centers }, selected: null }));
    assert.equal(html.split("data-board-connection=").length - 1, 8);
    assert.match(html, /pointer-events-none/);
    assert.match(html, /data-fall-arrowhead="" d="M 3 2 L 11 8 L 3 14" fill="none"/);
    assert.match(html, /orient="auto"/);
    const cues = html.split('data-board-direction-cues=""')[1].split('data-board-connection=')[0];
    assert.equal((cues.match(/<path /g) ?? []).length, 6);
    assert.doesNotMatch(cues, /[CQ] /);
    for (const connection of boardConnections) {
      const route = html.split(`data-board-connection="${connection.id}"`)[1].split('data-board-connection=')[0];
      const from = centers[connection.from], to = centers[connection.to];
      let start, end;
      if (connection.kind === "fall") {
        const path = route.match(/data-fall-route="" d="([^"]+)"/)[1];
        assert.match(path, /^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/);
        const values = path.match(/[-\d.]+/g).map(Number);
        start = { x: values[0], y: values[1] }; end = { x: values[2], y: values[3] };
      } else {
        const lines = [...route.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)].slice(0, 4).map(match => match.slice(1).map(Number));
        const [railA, , railB] = lines;
        start = { x: (railA[0] + railB[0]) / 2, y: (railA[1] + railB[1]) / 2 };
        end = { x: (railA[2] + railB[2]) / 2, y: (railA[3] + railB[3]) / 2 };
        assert.ok(Math.abs((railA[2] - railA[0]) - (railB[2] - railB[0])) < 1e-8);
        assert.ok(Math.abs((railA[3] - railA[1]) - (railB[3] - railB[1])) < 1e-8);
      }
      for (const [point, center] of [[start, from], [end, to]]) {
        assert.ok(Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - size * 0.16) < 1e-8);
        assert.ok(Math.abs(point.x - center.x) < size / 2 && Math.abs(point.y - center.y) < size / 2);
        assert.ok(Math.abs((point.x - from.x) * (to.y - from.y) - (point.y - from.y) * (to.x - from.x)) < 1e-7);
      }
    }
  }
});

test("floor panels alternate by numbered row, preserve role colours and contrasting numbers", () => {
  const html = renderToStaticMarkup(createElement(BoardGrid, { active: false, selected: null, onSelect() {} }));
  const panels = new Map([...html.matchAll(/<li\b([^>]+)>/g)].map((match) => [Number(match[1].match(/data-board-tile="(\d+)"/)[1]), match[1]]));
  const special = new Map();
  for (const [numbers, colour, ink] of [
    [[25, 53, 76], "10BDCD", "171717"], [[6, 49, 89], "741744", "FFFFFF"],
    [[10, 39, 62], "C18B43", "171717"], [[23, 57, 81], "FF741F", "171717"],
    [[19, 35, 70], "F4CB54", "171717"], [[14, 33, 45, 60], "C4E94B", "171717"],
    [[34, 54, 68, 72, 74, 87], "B60922", "FFFFFF"], [[1, 90], "FFD451", "171717"],
  ]) for (const number of numbers) special.set(number, [colour, ink]);
  assert.equal(panels.size, 90);
  assert.match(html, /aria-label="Tile 1. Start"/);
  assert.match(html, /lucide-flag/);
  assert.match(html, /Start here, moving horizontally across/);
  for (const [number, panel] of panels) {
    const [colour, ink] = special.get(number) ?? (Math.ceil(number / 15) % 2 ? ["696664", "FFFFFF"] : ["F2EFE7", "171717"]);
    assert.ok(panel.includes(`bg-[#${colour}]`), `Tile ${number} colour`);
    assert.ok(panel.includes(`text-[#${ink}]`), `Tile ${number} number contrast`);
  }
  assert.doesNotMatch(html, /bg-\[#DDD9D0\]|bg-\[#171717\]|bg-\[#ffdcdf\]|bg-\[#f6efdf\]|rounded-md|data-board-arrival|>to \d+</);
});

test("route highlighting dims the other seven connections without removing them", () => {
  const centers = Object.fromEntries(boardCells.map(({ number }) => [number, { x: number * 2, y: number * 3 }]));
  const html = renderToStaticMarkup(createElement(BoardConnections, { geometry: { width: 840, height: 400, cellSize: 48, centers }, selected: "fall-74-13" }));
  assert.match(html, /data-board-connection="fall-74-13"[^>]+opacity="1"/);
  assert.equal((html.match(/opacity="0.12"/g) ?? []).length, 7);
});
