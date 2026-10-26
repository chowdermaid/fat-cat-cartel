import { BOARD_COLUMNS, BOARD_ROWS, boardConnections, boardSymbols } from "../boardData";
import { tiles } from "../constants";
import type { BoardCell, BoardPoint } from "../types";

export function getBoardPosition(number: number) {
  if (!Number.isSafeInteger(number) || number < 1 || number > BOARD_COLUMNS * BOARD_ROWS) throw new RangeError("Invalid board tile");
  const rowFromStart = Math.floor((number - 1) / BOARD_COLUMNS);
  const offset = (number - 1) % BOARD_COLUMNS;
  return { row: BOARD_ROWS - 1 - rowFromStart, column: rowFromStart % 2 === 0 ? offset : BOARD_COLUMNS - 1 - offset };
}

export const boardCells: BoardCell[] = Array.from({ length: BOARD_COLUMNS * BOARD_ROWS }, (_, index) => {
  const number = index + 1;
  const outgoing = boardConnections.find((connection) => connection.from === number) ?? null;
  return {
    number,
    symbol: outgoing ? outgoing.kind === "ladder" ? "ladder" : "red-arrow" : boardSymbols[number] ?? null,
    outgoing,
    incoming: boardConnections.filter((connection) => connection.to === number),
  };
});

export function describeBoardCell(cell: BoardCell) {
  const name = cell.symbol === "finish" ? "Crown / finish" : tiles.find((tile) => tile.id === cell.symbol)?.name;
  const effect = cell.outgoing ? `${cell.outgoing.kind === "ladder" ? "Ladder" : "Fall"} to ${cell.outgoing.to}` : name;
  const arrivals = cell.incoming.map((connection) => `${connection.kind === "ladder" ? "Ladder" : "Fall"} destination from ${connection.from}`);
  return [`Tile ${cell.number}`, effect, ...arrivals].filter(Boolean).join(". ");
}

export function getConnectionEndpoints(from: BoardPoint, to: BoardPoint, cellSize: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { from, to };
  const inset = Math.min(cellSize * 0.16, length / 4);
  const offset = { x: dx / length * inset, y: dy / length * inset };
  return {
    from: { x: from.x + offset.x, y: from.y + offset.y },
    to: { x: to.x - offset.x, y: to.y - offset.y },
  };
}

export function getLadderLines(from: BoardPoint, to: BoardPoint, cellSize: number) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!length) return [];
  const unit = { x: dx / length, y: dy / length };
  const normal = { x: -unit.y * cellSize * 0.13, y: unit.x * cellSize * 0.13 };
  const point = (distance: number, side: number): BoardPoint => ({ x: from.x + unit.x * distance + normal.x * side, y: from.y + unit.y * distance + normal.y * side });
  const lines = [-1, 1].map((side) => ({ from: point(0, side), to: point(length, side) }));
  const spacing = cellSize * 0.25;
  const count = Math.max(1, Math.floor(length / spacing));
  for (let index = 0; index < count; index++) {
    const distance = (length - (count - 1) * spacing) / 2 + index * spacing;
    lines.push({ from: point(distance, -1), to: point(distance, 1) });
  }
  return lines;
}

export function getFallPath(from: BoardPoint, to: BoardPoint) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export const boardGeometryTiles = [...new Set([
  ...boardConnections.flatMap(({ from, to }) => [from, to]),
  ...Array.from({ length: BOARD_ROWS }, (_, row) => [row * BOARD_COLUMNS + 1, (row + 1) * BOARD_COLUMNS]).flat(),
])];
