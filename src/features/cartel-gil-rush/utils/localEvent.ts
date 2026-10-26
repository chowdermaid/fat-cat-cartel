import type { EventAction, LocalEvent, Mood, Player } from "../types.ts";

export const LOCAL_EVENT_KEY = "fcc_cartel_gil_rush_event_v1";

export function emptyEvent(): LocalEvent {
  return { version: 1, phase: "setup", players: [], mood: null, round: 1 };
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function isMood(value: unknown): value is Mood {
  return value === "yellow" || value === "blue" || value === "violet" || value === "red";
}

function isPlayer(value: unknown): value is Player {
  if (!value || typeof value !== "object") return false;
  const player = value as Player;
  return typeof player.id === "string" && player.id.trim().length > 0
    && typeof player.name === "string" && player.name.length > 0 && player.name.length <= 80
    && player.name === normalizeName(player.name)
    && (player.rosterId === undefined || (typeof player.rosterId === "string" && player.rosterId.trim().length > 0))
    && (player.avatarUrl === null || (typeof player.avatarUrl === "string" && /^(https?:\/\/|\/(?!\/))/i.test(player.avatarUrl)));
}

export function updateEvent(current: LocalEvent, action: EventAction, random = Math.random): LocalEvent {
  if (action.type === "reset") return emptyEvent();
  if (action.type === "set-mood") {
    if (!isMood(action.mood)) throw new Error("Choose a board mood.");
    return current.mood === action.mood ? current : { ...current, mood: action.mood };
  }
  if (action.type === "set-round") {
    if (current.phase !== "live") throw new Error("Start the event before changing rounds.");
    if (!Number.isSafeInteger(action.round) || action.round < 1) throw new Error("Round must be a positive whole number.");
    return current.round === action.round ? current : { ...current, round: action.round };
  }
  if (current.phase === "live") throw new Error("Player order is locked. Reset the event to change players.");
  if (action.type === "start") {
    if (!current.players.length) throw new Error("Add at least one player first.");
    if (!current.mood) throw new Error("Choose the opening mood first.");
    const players = [...current.players];
    for (let index = players.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [players[index], players[other]] = [players[other], players[index]];
    }
    return { ...current, phase: "live", players, round: 1 };
  }
  if (action.type === "remove") {
    if (!current.players.some((player) => player.id === action.id)) throw new Error("Player not found.");
    return { ...current, players: current.players.filter((player) => player.id !== action.id) };
  }
  const name = normalizeName(action.type === "add" ? action.player.name : action.name);
  if (!name) throw new Error("Enter a character name.");
  if (name.length > 80) throw new Error("Character names must be 80 characters or fewer.");
  const id = action.type === "add" ? action.player.id : action.id;
  if (current.players.some((player) => player.id !== id && player.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("That player is already on the list.");
  }
  if (action.type === "rename") {
    const player = current.players.find((player) => player.id === id);
    if (!player) throw new Error("Player not found.");
    if (player.rosterId) throw new Error("Roster names are saved from the member list. Remove and add the member again to refresh.");
    if (player.name === name) return current;
    return { ...current, players: current.players.map((player) => player.id === id ? { ...player, name } : player) };
  }
  const player = { ...action.player, name };
  if (!isPlayer(player)) throw new Error("Player details are invalid.");
  if (current.players.some((existing) => existing.id === id || (player.rosterId && existing.rosterId === player.rosterId)
    || existing.name.toLowerCase() === name.toLowerCase())) throw new Error("That player is already on the list.");
  return { ...current, players: [...current.players, player] };
}

export function parseEvent(saved: string): LocalEvent {
  const data = JSON.parse(saved) as LocalEvent;
  if (!data || data.version !== 1 || !["setup", "live"].includes(data.phase)
    || !Array.isArray(data.players) || !data.players.every(isPlayer)
    || !Number.isSafeInteger(data.round) || data.round < 1
    || (data.mood !== null && !isMood(data.mood))
    || (data.phase === "setup" && data.round !== 1)
    || (data.phase === "live" && (!data.players.length || !isMood(data.mood)))) {
    throw new Error("Saved event is invalid.");
  }
  const ids = new Set(data.players.map((player) => player.id));
  const names = new Set(data.players.map((player) => player.name.toLowerCase()));
  const rosterIds = data.players.flatMap((player) => player.rosterId ? [player.rosterId] : []);
  if (ids.size !== data.players.length || names.size !== data.players.length || new Set(rosterIds).size !== rosterIds.length) {
    throw new Error("Saved event is invalid.");
  }
  return { version: 1, phase: data.phase, players: data.players.map(({ id, name, avatarUrl, rosterId }) => ({ id, name, avatarUrl, ...(rosterId ? { rosterId } : {}) })), mood: data.mood, round: data.round };
}
