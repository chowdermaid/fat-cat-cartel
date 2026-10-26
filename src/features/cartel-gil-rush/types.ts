import type { GilRushAction, GilRushEvent, GilRushPlayer } from "../../../functions/src/cartel-gil-rush-model";

export type Mood = "yellow" | "blue" | "violet" | "red";
export type SharedEvent = GilRushEvent;
export type SharedPlayer = GilRushPlayer;
export type SharedEventAction = GilRushAction;

export interface Player {
  id: string;
  name: string;
  rosterId?: string;
  avatarUrl: string | null;
}

export interface LocalEvent {
  version: 1;
  phase: "setup" | "live";
  players: Player[];
  mood: Mood | null;
  round: number;
}

export type EventView = "game" | "rulebook";
export type RulebookChapter = "board-overview" | "quick-start" | "special-tiles" | "board-moods" | "rewards";

export interface EventController {
  current: SharedEvent;
  error: string | null;
  loading: boolean;
  pending: boolean;
  importable: LocalEvent | null;
  run: (action: SharedEventAction, expectedRevision?: number) => Promise<boolean>;
}

export type EventAction =
  | { type: "add"; player: Player }
  | { type: "rename"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "start" }
  | { type: "set-mood"; mood: Mood }
  | { type: "set-round"; round: number }
  | { type: "reset" };

export interface Tile {
  id: "shark" | "fatcat" | "chocobo" | "moogle" | "mushroom" | "ladder" | "red-arrow";
  name: string;
  category: string;
  activation: string;
  effect: string;
}

export interface BoardConnection {
  id: string;
  kind: "ladder" | "fall";
  from: number;
  to: number;
}

export interface BoardCell {
  number: number;
  symbol: Tile["id"] | "finish" | null;
  outgoing: BoardConnection | null;
  incoming: BoardConnection[];
}

export interface BoardPoint { x: number; y: number }
export interface BoardGeometry {
  width: number;
  height: number;
  cellSize: number;
  centers: Partial<Record<number, BoardPoint>>;
}
