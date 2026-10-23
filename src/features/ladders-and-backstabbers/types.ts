export interface Attendee {
  id: string;
  name: string;
}

export interface Crew {
  id: string;
  memberIds: string[];
  hand: string[];
}

export interface LocalEvent {
  phase: "setup" | "preview" | "live";
  attendees: Attendee[];
  crews: Crew[];
}

export interface EventHistory {
  version: 1;
  current: LocalEvent;
  previous: LocalEvent | null;
}

export type EventView = "game" | "rulebook";
export type RulebookChapter = "quick-start" | "special-tiles" | "ability-cards" | "secret-missions";

export interface EventController {
  history: EventHistory;
  error: string | null;
  run: (action: EventAction) => boolean;
}

export type EventAction =
  | { type: "add"; id: string; name: string }
  | { type: "rename"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "shuffle" }
  | { type: "swap"; first: string; second: string }
  | { type: "start" }
  | { type: "deal"; crewId: string }
  | { type: "discard"; crewId: string; card: string }
  | { type: "undo" }
  | { type: "reset" };
