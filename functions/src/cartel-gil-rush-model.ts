export const GIL_RUSH_PATH = "events/cartelGilRush/current";

export type GilRushMood = "yellow" | "blue" | "violet" | "red";
export interface GilRushPlayer {
  id: string;
  name: string;
  rosterId?: string;
  avatarUrl: string | null;
  gilWon: number;
}
export interface GilRushEvent {
  version: 1;
  revision: number;
  phase: "setup" | "live";
  players: GilRushPlayer[];
  mood: GilRushMood | null;
  round: number;
}
export type GilRushAction =
  | { type: "add"; player: Omit<GilRushPlayer, "gilWon"> }
  | { type: "rename"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "start" }
  | { type: "set-mood"; mood: GilRushMood | null }
  | { type: "set-round"; round: number }
  | { type: "set-gil"; id: string; gilWon: number }
  | { type: "reset" }
  | { type: "import"; event: unknown };

export class GilRushError extends Error {
  readonly code: "invalid-argument" | "failed-precondition" | "aborted";
  constructor(message: string, code: "invalid-argument" | "failed-precondition" | "aborted" = "invalid-argument") {
    super(message);
    this.code = code;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new GilRushError("Event details are invalid.");
  return value as Record<string, unknown>;
}

function integer(value: unknown, minimum: number, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) throw new GilRushError(`${label} must be a ${minimum ? "positive" : "non-negative"} whole number.`);
  return Number(value);
}

function nameOf(value: unknown): string {
  if (typeof value !== "string") throw new GilRushError("Enter a character name.");
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new GilRushError("Character names must contain 1 to 80 characters.");
  return name;
}

function idOf(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new GilRushError("Player details are invalid.");
  return value;
}

function moodOf(value: unknown): GilRushMood | null {
  if (value === null || value === undefined) return null;
  if (value !== "yellow" && value !== "blue" && value !== "violet" && value !== "red") throw new GilRushError("Choose a board mood.");
  return value;
}

function playerOf(value: unknown, importing = false): GilRushPlayer {
  const player = record(value);
  const avatarUrl = player.avatarUrl ?? null;
  if (avatarUrl !== null && (typeof avatarUrl !== "string" || !/^(https?:\/\/|\/(?!\/))/i.test(avatarUrl))) throw new GilRushError("Player avatar is invalid.");
  return {
    id: idOf(player.id), name: nameOf(player.name), avatarUrl,
    ...(player.rosterId === undefined ? {} : { rosterId: idOf(player.rosterId) }),
    gilWon: importing ? 0 : integer(player.gilWon, 0, "Gil"),
  };
}

function checkUnique(players: GilRushPlayer[]): void {
  for (const values of [players.map(p => p.id), players.map(p => p.name.toLowerCase()), players.flatMap(p => p.rosterId ? [p.rosterId] : [])]) {
    if (new Set(values).size !== values.length) throw new GilRushError("That player is already on the list.");
  }
}

export function emptyGilRushEvent(): GilRushEvent {
  return { version: 1, revision: 0, phase: "setup", players: [], mood: null, round: 1 };
}

export function readGilRushEvent(value: unknown, importing = false): GilRushEvent {
  if (value === null || value === undefined) {
    if (importing) throw new GilRushError("Local event is invalid.");
    return emptyGilRushEvent();
  }
  const data = record(value);
  if (data.version !== 1 || (data.phase !== "setup" && data.phase !== "live")) throw new GilRushError("Saved event is invalid.");
  // RTDB omits empty arrays and null fields from snapshots.
  const rawPlayers = data.players ?? [];
  if (!Array.isArray(rawPlayers)) throw new GilRushError("Saved players are invalid.");
  const players = rawPlayers.map(p => playerOf(p, importing));
  checkUnique(players);
  const round = integer(data.round, 1, "Round");
  if ((data.phase === "setup" && (round !== 1 || players.some(p => p.gilWon !== 0))) || (data.phase === "live" && !players.length)) throw new GilRushError("Saved event is invalid.");
  return { version: 1, revision: importing ? 0 : integer(data.revision, 0, "Revision"), phase: data.phase, players, mood: moodOf(data.mood), round };
}

export function isEmptyGilRushEvent(event: GilRushEvent): boolean {
  return event.phase === "setup" && !event.players.length && event.mood === null && event.round === 1;
}

export function nextGilRushEvent(value: unknown, input: unknown, expectedRevision: unknown, random = Math.random): GilRushEvent {
  const current = readGilRushEvent(value);
  const expected = integer(expectedRevision, 0, "Revision");
  if (current.revision !== expected) throw new GilRushError("Event changed on another host. Review latest values and retry.", "aborted");
  if (current.revision === Number.MAX_SAFE_INTEGER) throw new GilRushError("Event revision limit reached.", "failed-precondition");
  const action = record(input);
  let next = { ...current, players: [...current.players], revision: current.revision + 1 };
  if (action.type === "reset") return { ...emptyGilRushEvent(), revision: next.revision };
  if (action.type === "import") {
    if (!isEmptyGilRushEvent(current)) throw new GilRushError("Import requires an empty shared event.", "failed-precondition");
    return { ...readGilRushEvent(action.event, true), revision: next.revision };
  }
  if (action.type === "set-mood") {
    if (action.mood === undefined) throw new GilRushError("Choose a board mood.");
    next.mood = moodOf(action.mood);
  } else if (action.type === "set-round" || action.type === "set-gil") {
    if (current.phase !== "live") throw new GilRushError("Start the event first.", "failed-precondition");
    if (action.type === "set-round") next.round = integer(action.round, 1, "Round");
    else {
      const id = idOf(action.id);
      if (!current.players.some(p => p.id === id)) throw new GilRushError("Player not found.");
      const gilWon = integer(action.gilWon, 0, "Gil");
      next.players = current.players.map(p => p.id === id ? { ...p, gilWon } : p);
    }
  } else {
    if (current.phase === "live") throw new GilRushError("Player order is locked. Reset the event to change players.", "failed-precondition");
    if (action.type === "start") {
      if (!current.players.length) throw new GilRushError("Add at least one player first.");
      for (let index = next.players.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [next.players[index], next.players[other]] = [next.players[other], next.players[index]];
      }
      next = { ...next, phase: "live", round: 1 };
    } else if (action.type === "add") {
      next.players.push(playerOf(action.player, true));
      checkUnique(next.players);
    } else if (action.type === "remove" || action.type === "rename") {
      const id = idOf(action.id);
      const player = current.players.find(p => p.id === id);
      if (!player) throw new GilRushError("Player not found.");
      if (action.type === "remove") next.players = current.players.filter(p => p.id !== id);
      else {
        if (player.rosterId) throw new GilRushError("Remove and add the roster member again to refresh their name.");
        const name = nameOf(action.name);
        next.players = current.players.map(p => p.id === id ? { ...p, name } : p);
        checkUnique(next.players);
      }
    } else throw new GilRushError("Event action is invalid.");
  }
  return next;
}
