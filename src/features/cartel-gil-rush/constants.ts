import type { Mood, Tile } from "./types";

export const MOOD_START_ROUND = 4;

export const moods: Record<Mood, { label: string; name: string; rule: string; details: string[] }> = {
  yellow: {
    label: "Yellow", name: "Lucky Sixes",
    rule: "Roll a natural 6 on your normal first roll to earn the announced Lucky Sixes gil reward.",
    details: ["The host announces the payout before play. You keep it even if your destination moves you backwards.", "Shark, moogle, mushroom, challenge and tiebreak rolls do not qualify."],
  },
  blue: {
    label: "Blue", name: "Underdog Bonus",
    rule: "Start your turn tied for last among unfinished players to receive 50,000 gil.",
    details: ["Compare positions immediately before your first roll. All players tied for lowest qualify when their own turns begin, including when everyone is tied.", "Check separately on each player's turn; pay once on that turn. Finished players are excluded."],
  },
  violet: {
    label: "Violet", name: "Push Your Luck",
    rule: "Keep your first roll, or roll once more. Strictly higher: add both rolls. Equal or lower: move only 1 space.",
    details: ["Only one extra attempt, only for normal movement. A first roll of 6 cannot be beaten: keep it and move 6.", "Choose within approximately 10 seconds. No choice means keep your first roll. Determine final movement before resolving the destination tile."],
  },
  red: {
    label: "Red", name: "Workers' Compensation",
    rule: "Resolve a fall down a red arrow, then receive 200,000 gil. The reward does not cancel the fall.",
    details: ["Move to the arrow's lower endpoint before receiving the payout. Sharks and mushrooms do not qualify.", "Passing over an arrow or being moved onto one by another tile does not activate it or earn compensation."],
  },
};

export const moodOrder: Mood[] = ["yellow", "blue", "violet", "red"];

export const tiles: Tile[] = [
  { id: "shark", name: "Shark", category: "Chance movement", activation: "Standalone tile roll: /random 10", effect: "Even: move forward by the result. Odd: move backwards by the result. Stop at tile 90 or the start. No violet attempt or Lucky Sixes reward; the destination does not activate." },
  { id: "fatcat", name: "Fatcat", category: "Chow's Deathroll", activation: "One challenge per normal landing", effect: "Challenge Chow to one /deathroll. Win: 200,000 gil. Lose: no payout. No rematch for this landing. Remain on the fatcat tile afterwards." },
  { id: "chocobo", name: "Chocobo", category: "Axo's Trivia", activation: "One question per normal landing", effect: "Answer Axo's trivia without help. Correct: 200,000 gil. Incorrect or no answer: no payout. Remain on the chocobo tile afterwards." },
  { id: "moogle", name: "Moogle", category: "Forward movement", activation: "Standalone tile roll: /random 6", effect: "Immediately move forward by the result, stopping at tile 90. This can earn a finishing place. No violet attempt or Lucky Sixes reward; the destination does not activate." },
  { id: "mushroom", name: "Mushroom", category: "Backward movement", activation: "Standalone tile roll: /random 6", effect: "Immediately move backwards by the result, stopping at the start. No violet attempt or Lucky Sixes reward; the destination does not activate." },
  { id: "ladder", name: "Ladder", category: "Climb", activation: "Land at its marked lower endpoint", effect: "Move to the marked upper endpoint. An endpoint on tile 90 can earn a finishing place. Do not activate the destination tile." },
  { id: "red-arrow", name: "Red arrow", category: "Fall", activation: "Land at its marked upper endpoint", effect: "Move to the marked lower endpoint, never below the start. Under red, receive 200,000 gil after the fall. Do not activate the destination tile." },
];
