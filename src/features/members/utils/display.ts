import { RANK_SORT_ORDER } from "../constants";

export function rankLabel(rank: string | null) {
  if (rank === "Friend") return "Friend";
  return rank && RANK_SORT_ORDER.has(rank) ? rank : "Member";
}

export function rankBadgeClass(rank: string | null) {
  if (rank === "Friend") {
    return "border-pink-300/60 bg-pink-500/10 text-pink-600 dark:border-pink-400/40 dark:bg-pink-400/10 dark:text-pink-200";
  }

  return "";
}
