import type { Member } from "@/types";

export interface KeyboundScores {
  scores: Record<string, number>;
  updatedAt: number | null;
}

export interface ScoreChange {
  lodestoneId: string;
  bestScore: number | null;
}

export interface ScoreSaveResult {
  ok: true;
  changes: ScoreChange[];
  updatedAt: number;
}

export interface RankedMember extends Member {
  lodestoneId: string;
  bestScore: number | null;
  rank: number | null;
}

