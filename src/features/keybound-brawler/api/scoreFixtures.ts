import type { KeyboundScores } from "../types";

export function createKeyboundScoreFixture(): KeyboundScores {
  return {
    scores: { "11111003": 64095, "11111002": 58420, "11111005": 52810, "11111001": 48875, "11111004": 48875, "11111006": 0 },
    updatedAt: Date.now() - 3_600_000,
  };
}
