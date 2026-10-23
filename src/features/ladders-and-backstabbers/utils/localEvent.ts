import { abilities } from "../constants.ts";
import type { EventAction, EventHistory, LocalEvent } from "../types.ts";

export const LOCAL_EVENT_KEY = "fcc_ladders_and_backstabbers_event_v1";
const cardNames = abilities.map((card) => card.name);

export function emptyEvent(): EventHistory {
  return { version: 1, current: { phase: "setup", attendees: [], crews: [] }, previous: null };
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function randomCard(hand: string[], random: () => number) {
  const available = cardNames.filter((card) => !hand.includes(card));
  return available[Math.floor(random() * available.length)];
}

export function updateEvent(history: EventHistory, action: EventAction, random = Math.random): EventHistory {
  const current = history.current;
  if (action.type === "undo") {
    if (!history.previous) return history;
    return { version: 1, current: history.previous, previous: null };
  }
  let next: LocalEvent;
  if (action.type === "reset") {
    next = emptyEvent().current;
  } else if (action.type === "add" || action.type === "rename" || action.type === "remove") {
    if (current.phase === "live") throw new Error("Crews are locked. Undo confirmation or reset the event to change attendees.");
    if (action.type !== "add" && !current.attendees.some((person) => person.id === action.id)) throw new Error("Attendee not found.");
    if (action.type === "remove") {
      next = { phase: "setup", attendees: current.attendees.filter((person) => person.id !== action.id), crews: [] };
    } else {
      const name = normalizeName(action.name);
      if (!name) throw new Error("Enter a character name.");
      if (name.length > 80) throw new Error("Character names must be 80 characters or fewer.");
      if (action.type === "rename" && current.attendees.some((person) => person.id === action.id && person.name === name)) return history;
      if (current.attendees.some((person) => person.id !== action.id && person.name.toLowerCase() === name.toLowerCase())) {
        throw new Error("That attendee is already on the list.");
      }
      if (action.type === "add" && current.attendees.some((person) => person.id === action.id)) throw new Error("Attendee already exists.");
      next = {
        phase: "setup", crews: [],
        attendees: action.type === "add"
          ? [...current.attendees, { id: action.id, name }]
          : current.attendees.map((person) => person.id === action.id ? { ...person, name } : person),
      };
    }
  } else if (action.type === "shuffle") {
    if (current.phase === "live") throw new Error("Confirmed crews cannot be reshuffled.");
    if (current.attendees.length < 2) throw new Error("Add at least two attendees first.");
    const ids = current.attendees.map((person) => person.id);
    for (let index = ids.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [ids[index], ids[other]] = [ids[other], ids[index]];
    }
    const crews = [];
    for (let index = 0; index < ids.length;) {
      const size = ids.length - index === 3 ? 3 : 2;
      crews.push({ id: `crew-${crews.length + 1}`, memberIds: ids.slice(index, index + size), hand: [] });
      index += size;
    }
    next = { ...current, phase: "preview", crews };
  } else if (action.type === "swap") {
    if (current.phase !== "preview") throw new Error("Swaps are only available in the pairing preview.");
    if (action.first === action.second) return history;
    if (![action.first, action.second].every((id) => current.crews.some((crew) => crew.memberIds.includes(id)))) throw new Error("Choose two attendees to swap.");
    next = { ...current, crews: current.crews.map((crew) => ({
      ...crew,
      memberIds: crew.memberIds.map((id) => id === action.first ? action.second : id === action.second ? action.first : id),
    })) };
  } else if (action.type === "start") {
    if (current.phase !== "preview") throw new Error("Preview pairings before confirming crews.");
    next = { ...current, phase: "live", crews: current.crews.map((crew) => ({ ...crew, hand: [randomCard([], random)] })) };
  } else {
    if (current.phase !== "live") throw new Error("Confirm crews before dealing or discarding cards.");
    if (!current.crews.some((crew) => crew.id === action.crewId)) throw new Error("Crew not found.");
    next = { ...current, crews: current.crews.map((crew) => {
      if (crew.id !== action.crewId) return crew;
      if (action.type === "deal") {
        if (crew.hand.length >= 2) throw new Error("This crew already holds two cards. Discard one first.");
        return { ...crew, hand: [...crew.hand, randomCard(crew.hand, random)] };
      }
      if (!crew.hand.includes(action.card)) throw new Error("This crew no longer holds that card.");
      return { ...crew, hand: crew.hand.filter((card) => card !== action.card) };
    }) };
  }
  return { version: 1, current: next, previous: current };
}

function isLocalEvent(value: unknown): value is LocalEvent {
  if (!value || typeof value !== "object") return false;
  const data = value as LocalEvent;
  if (!["setup", "preview", "live"].includes(data.phase) || !Array.isArray(data.attendees) || !Array.isArray(data.crews)) return false;
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const person of data.attendees) {
    if (!person || typeof person.id !== "string" || !person.id || typeof person.name !== "string" || !normalizeName(person.name) || person.name !== normalizeName(person.name) || person.name.length > 80) return false;
    if (ids.has(person.id) || names.has(person.name.toLowerCase())) return false;
    ids.add(person.id);
    names.add(person.name.toLowerCase());
  }
  const crewIds = new Set<string>();
  const assigned = new Set<string>();
  let trios = 0;
  for (const crew of data.crews) {
    if (!crew || typeof crew.id !== "string" || !crew.id || crewIds.has(crew.id) || !Array.isArray(crew.memberIds) || ![2, 3].includes(crew.memberIds.length) || !Array.isArray(crew.hand)) return false;
    crewIds.add(crew.id);
    if (crew.memberIds.length === 3) trios++;
    for (const id of crew.memberIds) {
      if (!ids.has(id) || assigned.has(id)) return false;
      assigned.add(id);
    }
    if (crew.hand.length > 2 || new Set(crew.hand).size !== crew.hand.length || !crew.hand.every((card) => cardNames.includes(card))) return false;
    if (data.phase !== "live" && crew.hand.length) return false;
  }
  if (data.phase === "setup") return data.crews.length === 0;
  return data.attendees.length >= 2 && assigned.size === ids.size && trios === data.attendees.length % 2;
}

export function parseEvent(saved: string): EventHistory {
  const data = JSON.parse(saved) as EventHistory;
  if (!data || data.version !== 1 || !isLocalEvent(data.current) || (data.previous !== null && !isLocalEvent(data.previous))) {
    throw new Error("Saved event is invalid.");
  }
  return { version: 1, current: data.current, previous: data.previous };
}
