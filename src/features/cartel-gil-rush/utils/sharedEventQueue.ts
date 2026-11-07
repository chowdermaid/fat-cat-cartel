import type { SharedEvent, SharedEventAction } from "../types";

export function queuedActionKey(action: SharedEventAction): string {
  if (action.type === "add") return action.player.rosterId ? `roster:${action.player.rosterId}` : `guest:${action.player.name.trim().replace(/\s+/g, " ").toLowerCase()}`;
  if (["set-gil", "set-bonus-die", "rename", "remove"].includes(action.type) && "id" in action) return `player:${action.id}`;
  if (action.type === "set-round") return "round";
  if (action.type.includes("split")) return "split";
  if (action.type.includes("minigame") || action.type.includes("trivia") || action.type.includes("minority")) return "minigame";
  return "event";
}

export function canQueueEdit(action: SharedEventAction) {
  return ["set-gil", "set-bonus-die", "set-round", "add", "rename", "remove"].includes(action.type);
}

export function queuedEditContext(action: SharedEventAction, event: SharedEvent): string {
  const player = "id" in action ? event.players.find(player => player.id === action.id) : undefined;
  const roster = event.players.map(player => player.id);
  if (action.type === "set-gil") return JSON.stringify([event.phase, roster, player?.id, player?.gilWon]);
  if (action.type === "set-bonus-die") return JSON.stringify([event.phase, roster, event.minigame?.id, player?.id, player?.bonusDie]);
  if (action.type === "set-round") return JSON.stringify([event.phase, roster, event.round]);
  if (action.type === "add") {
    const name = action.player.name.trim().replace(/\s+/g, " ").toLowerCase();
    return JSON.stringify([event.phase, event.players.find(player => player.id === action.player.id || (action.player.rosterId && player.rosterId === action.player.rosterId) || player.name.toLowerCase() === name)]);
  }
  return JSON.stringify([event.phase, player]);
}
