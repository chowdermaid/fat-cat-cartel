export const NAMAZU_TILES = [16, 43, 63] as const;

export const NAMAZU_EFFECTS = [
  "All players tied for the lead move back 8 spaces.",
  "The bottom three players by board position receive 100,000 gil each.",
  "Everyone receives 50,000 gil.",
  "All players tied for last move forward 6 spaces.",
  "One randomly selected player moves backward 6 spaces.",
  "The landing player swaps positions with one randomly selected other player.",
  "The landing player rolls /random 6. Everyone receives 10,000 gil × the result.",
  "One randomly selected unfinished player moves back 6 spaces.",
] as const;

export const NAMAZU_RULES = [
  "Resolve one effect per normal landing. All eight effects have an equal chance.",
  "Use unfinished players' board positions for rankings, not turn order or gil totals.",
  "Finished players keep their finishing places and are excluded from movement, swaps and ranking-based effects.",
  "Finished players remain eligible for both everyone-receives-gil effects.",
  "Extra movement and swaps do not activate destination tiles. Movement cannot go below tile 1.",
  "The landing player is eligible for either random movement effect. Exclude them from the swap opponent pool; if no other unfinished player exists, nothing happens.",
  "The host checks eligibility, rerolls ineligible selections and resolves movement, swaps and the bottom-three payout manually. Everyone-receives-gil rewards use the event controls.",
] as const;

export function drawNamazuEffect(random = Math.random): number {
  return Math.floor(random() * NAMAZU_EFFECTS.length) + 1;
}

export function drawNamazuTarget(
  effect: number,
  playerIds: string[],
  random = Math.random,
): string | null {
  if (effect !== 5 && effect !== 6 && effect !== 8) return null;
  if (effect === 6 && playerIds.length < 2) return null;
  // Positions, finishers and the actual landing player are checked by the host.
  return playerIds.length
    ? playerIds[Math.floor(random() * playerIds.length)]
    : null;
}
