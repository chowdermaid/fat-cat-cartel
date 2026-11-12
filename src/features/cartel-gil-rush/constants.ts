import type { MinigameKind, MinorityPrize } from "../../../functions/src/cartel-gil-rush-model";
import type { BingoMission, Tile } from "./types";

// Change this ID only when starting a new Bingo event.
export const BINGO_EVENT_ID = "cartel-gil-rush-1";
export const BINGO_STORAGE_KEY = "fcc_cartel_gil_rush_bingo_v1";
export const bingoMissions: BingoMission[] = [
  { id: 1, text: "Win gil from any tile or minigame", icon: "coins" },
  { id: 2, text: "Roll a 6 on normal movement", icon: "die" },
  { id: 5, text: "Climb a ladder", icon: "ladder" },
  { id: 6, text: "Slide down a red-arrow fall", icon: "red-arrow" },
  { id: 7, text: "A Shark roll sends you forward", icon: "shark" },
  { id: 8, text: "A Shark roll sends you backwards", icon: "shark" },
  { id: 9, text: "A Moogle moves you forward", icon: "moogle" },
  { id: 10, text: "A Mushroom moves you backwards", icon: "mushroom" },
  { id: 11, text: "Beat Chow at deathroll", icon: "fatcat" },
  { id: 12, text: "Lose to Chow and collect 50k gil", icon: "fatcat" },
  { id: 13, text: "Both players choose Split", icon: "chocobo" },
  { id: 14, text: "Choose Steal while your partner chooses Split", icon: "chocobo" },
  { id: 15, text: "Both players choose Steal", icon: "chocobo" },
  { id: 20, text: "Win Minority Draw", icon: "minority-draw" },
  { id: 24, text: "Finish top three in Eorzeaguessr", icon: "eorzeaguessr" },
  { id: 25, text: "Finish top three in Marble Rush", icon: "marbles" },
  { id: 27, text: "Reach or pass tile 45", icon: "flag" },
  { id: 28, text: "Land on a Namazu tile", icon: "namazu" },
  { id: 29, text: "Receive gil from a Namazu event", icon: "namazu" },
  { id: 30, text: "A Namazu effect moves you forward", icon: "namazu" },
  { id: 31, text: "A Namazu effect moves you backwards", icon: "namazu" },
  { id: 32, text: "Swap positions during a Namazu event", icon: "namazu" },
];

export const minorityPrizes: { value: MinorityPrize; label: string }[] = [
  { value: "300k", label: "300,000 gil" },
  { value: "200k", label: "200,000 gil" },
  { value: "100k", label: "100,000 gil" },
  { value: "50k", label: "50,000 gil" },
];

export const minigames: { value: MinigameKind; label: string }[] = [
  { value: "trivia", label: "Group Trivia" },
  { value: "minority", label: "Treasure Draw" },
  { value: "minority-draw", label: "Minority Draw" },
  { value: "eorzeaguessr", label: "Eorzeaguessr" },
  { value: "marbles", label: "Marble Rush" },
  { value: "deathroll", label: "Group Deathroll" },
];

export const tiles: Tile[] = [
  { id: "shark", name: "Shark", category: "Chance movement", activation: "Standalone tile roll: /random 10", effect: "Even: move forward by the result. Odd: move backwards by the result. Stop at tile 90 or the start. The destination does not activate." },
  { id: "fatcat", name: "Fatcat", category: "Chow's Deathroll", activation: "One challenge per normal landing", effect: "Challenge Chow to one /deathroll. Win: 200,000 gil. Lose: 50,000 gil. Remain on the fatcat tile afterwards. A later normal landing grants another attempt." },
  { id: "chocobo", name: "Chocobo", category: "Split or Steal", activation: "One challenge per normal landing", effect: "Choose a partner you have not previously picked for your Chocobo challenge. Submit Split or Steal privately. Both split: 100,000 gil each. One steals: 200,000 gil for the thief. Both steal: no payout. The event bank funds the pot. Remain on the tile afterwards." },
  { id: "namazu", name: "Namazu", category: "Chance event", activation: "One effect per normal landing", effect: "Perform a random event" },
  { id: "moogle", name: "Moogle", category: "Forward movement", activation: "Standalone tile roll: /random 6", effect: "Immediately move forward by the result, stopping at tile 90. This can earn a finishing place. The destination does not activate." },
  { id: "mushroom", name: "Mushroom", category: "Backward movement", activation: "Standalone tile roll: /random 6", effect: "Immediately move backwards by the result, stopping at the start. The destination does not activate." },
  { id: "ladder", name: "Ladder", category: "Climb", activation: "Land at its marked lower endpoint", effect: "Move to the marked upper endpoint. An endpoint on tile 90 can earn a finishing place. Do not activate the destination tile." },
  { id: "red-arrow", name: "Red arrow", category: "Fall", activation: "Land at its marked upper endpoint", effect: "Move to the marked lower endpoint, never below the start. Do not activate the destination tile." },
];

export const chocoboMovementRules = {
  partner: "Play Split or Steal with a player you have not picked before across all three Chocobo tiles.",
  outcomes: [
    "Both split: 100,000 gil each.",
    "One steals: 200,000 gil to the thief, nothing to the other.",
    "Both steal: no payout.",
  ],
};

export const tileMovementRules: Record<Tile["id"] | "finish", string> = {
  shark: "Roll /random 10. Even: move forward by the result. Odd: move backwards by the result.",
  moogle: "Roll /random 6. Move forward by the result.",
  mushroom: "Roll /random 6. Move backwards by the result.",
  fatcat: "Challenge Chow to one /deathroll. Win: 200,000 gil. Lose: 50,000 gil.",
  chocobo: [chocoboMovementRules.partner, ...chocoboMovementRules.outcomes].join(" "),
  namazu: "Perform a random event",
  ladder: "Move to its marked upper endpoint.",
  "red-arrow": "Move to its marked lower endpoint.",
  finish: "Reach or pass tile 90 and finish resolving your turn to claim the next available place.",
};
