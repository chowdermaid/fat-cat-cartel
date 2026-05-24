export interface Member {
  name: string;
  server: string;
  fflogsId?: string | null;
  avatarUrl: string | null;
  fcRank: string | null;
  jobLevels?: Record<string, number | null>;
  jobLevelsLastFetched?: number | null;
  tomestoneProfile?: {
    id?: string | number | null;
    name?: string | null;
    server?: string | null;
    datacenter?: string | null;
    avatar?: string | null;
    portrait?: string | null;
    banner?: string | null;
    freeCompany?: unknown;
    title?: unknown;
    race?: string | null;
    tribe?: string | null;
    gender?: string | null;
    achievementPoints?: number | null;
    totalMounts?: number | null;
    totalMinions?: number | null;
    externalUrls?: unknown;
    lastUpdated?: string | number | null;
  } | null;
}

export interface Scores {
  hideAndSeek: number;
  trivia: number;
  eorzoaGuessr: number;
}

export interface Participant {
  id: string;
  name: string;
  scores: Scores;
  total: number;
}

export type ScoreCategory = keyof Scores;

export const SCORE_CATEGORIES: { key: ScoreCategory; label: string }[] = [
  { key: "hideAndSeek", label: "Hide & Seek" },
  { key: "trivia", label: "Trivia" },
  { key: "eorzoaGuessr", label: "Eorzea Guessr" },
];
