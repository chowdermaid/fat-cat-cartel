import { BINGO_EVENT_ID, bingoMissions } from "../constants";
import type { BingoCardState } from "../types";

export function readBingoCard(raw: string | null, eventId = BINGO_EVENT_ID): BingoCardState | null {
  try {
    const data = JSON.parse(raw ?? "null");
    if (!data || data.version !== 1 || data.eventId !== eventId) return null;
    const { missionIds, completedIds } = data;
    if (!Array.isArray(missionIds) || missionIds.length !== 9 || new Set(missionIds).size !== 9 || missionIds.some(id => !bingoMissions.some(mission => mission.id === id))) return null;
    if (!Array.isArray(completedIds) || new Set(completedIds).size !== completedIds.length || completedIds.some(id => !missionIds.includes(id))) return null;
    return { version: 1, eventId, missionIds: [...missionIds], completedIds: [...completedIds] };
  } catch { return null; }
}

export function generateBingoCard(eventId = BINGO_EVENT_ID, random = Math.random): BingoCardState {
  const ids = bingoMissions.map(mission => mission.id);
  for (let index = ids.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  return { version: 1, eventId, missionIds: ids.slice(0, 9), completedIds: [] };
}

export function toggleBingoMission(card: BingoCardState, id: number): BingoCardState {
  if (!card.missionIds.includes(id)) return card;
  return { ...card, completedIds: card.completedIds.includes(id) ? card.completedIds.filter(value => value !== id) : [...card.completedIds, id] };
}

export function bingoReward(count: number) {
  return count >= 9 ? 1_000_000 : count >= 6 ? 500_000 : count >= 3 ? 250_000 : 0;
}
