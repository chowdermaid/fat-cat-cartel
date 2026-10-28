import goldCrown from "@/assets/icons/keybound-crown-gold.svg";
import silverCrown from "@/assets/icons/keybound-crown-silver.svg";
import bronzeCrown from "@/assets/icons/keybound-crown-bronze.svg";

export const KEYBOUND_SCORES_PATH = "keyboundBrawler";
export const KEYBOUND_USE_STUBS = import.meta.env.VITE_USE_STUBS === "true";
export const RANK_CROWNS: Record<number, string> = { 1: goldCrown, 2: silverCrown, 3: bronzeCrown };
export const RANK_CLASSES: Record<number, string> = {
  1: "text-amber-700 dark:text-amber-400",
  2: "text-slate-600 dark:text-slate-300",
  3: "text-orange-700 dark:text-orange-400",
};
export const RANK_AVATAR_CLASSES: Record<number, string> = {
  1: "border-amber-500 dark:border-amber-400",
  2: "border-slate-400 dark:border-slate-300",
  3: "border-orange-600 dark:border-orange-400",
};
