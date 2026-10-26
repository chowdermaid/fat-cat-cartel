import type { BoardConnection, Tile } from "./types";

export const BOARD_COLUMNS = 15;
export const BOARD_ROWS = 6;

export const boardSymbols: Partial<Record<number, Tile["id"] | "finish">> = {
  6: "mushroom", 10: "moogle", 19: "fatcat", 23: "chocobo", 25: "shark",
  35: "fatcat", 39: "moogle", 49: "mushroom", 53: "shark", 57: "chocobo",
  62: "moogle", 70: "fatcat", 76: "shark", 81: "chocobo",
  89: "mushroom", 90: "finish",
};

const connections: Omit<BoardConnection, "id">[] = [
  { kind: "ladder", from: 14, to: 45 },
  { kind: "ladder", from: 33, to: 60 },
  { kind: "fall", from: 34, to: 3 },
  { kind: "fall", from: 54, to: 24 },
  { kind: "fall", from: 68, to: 20 },
  { kind: "fall", from: 72, to: 51 },
  { kind: "fall", from: 74, to: 13 },
  { kind: "fall", from: 87, to: 59 },
];

export const boardConnections: BoardConnection[] = connections.map((connection) => ({ ...connection, id: `${connection.kind}-${connection.from}-${connection.to}` }));
