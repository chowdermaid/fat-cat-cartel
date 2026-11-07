import type { MinorityChestReveal } from "../../../../functions/src/cartel-gil-rush-model";

export const CHEST_OPENING_DURATION = 1800;
export const CHEST_REVEAL_INTERVAL = 1500;
export const CHEST_PRIZE_PAUSE = 2000;

export function chestRevealStepTime(reveal: MinorityChestReveal, step: number) {
  const count = reveal.playerIds.length;
  const offset = step > count
    ? CHEST_OPENING_DURATION + Math.max(0, count - 1) * CHEST_REVEAL_INTERVAL + (count ? CHEST_PRIZE_PAUSE : 0)
    : CHEST_OPENING_DURATION + (step - 1) * CHEST_REVEAL_INTERVAL;
  return reveal.revealedAt + offset;
}

export function chestRevealProgress(reveal: MinorityChestReveal | undefined, now = Date.now()) {
  if (!reveal) return 0;
  const count = reveal.playerIds.length;
  if (now >= chestRevealStepTime(reveal, count + 1)) return count + 1;
  return Math.min(count, Math.max(0, 1 + Math.floor((now - reveal.revealedAt - CHEST_OPENING_DURATION) / CHEST_REVEAL_INTERVAL)));
}
