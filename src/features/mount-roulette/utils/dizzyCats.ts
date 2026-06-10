import { CAT_POSITIONS } from "../constants";
import type { DizzyCat } from "../types";

export function generateDizzyCats(): DizzyCat[] {
  const count = Math.floor(Math.random() * 1) + 1;
  return [...CAT_POSITIONS]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((pos, i) => ({
      id: i,
      ...pos,
      rotation: Math.floor(Math.random() * 80) - 40,
    }));
}
