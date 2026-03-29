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
