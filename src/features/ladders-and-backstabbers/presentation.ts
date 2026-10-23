import { ArrowDown, ArrowUp, CircleHelp, ClipboardList, Construction, Crown, Route, Scissors, ShieldCheck, Swords, Undo2, VenetianMask } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RulebookChapter } from "./types";

export const abilityPresentation: Record<string, { category: string; icon: LucideIcon; accent: string }> = {
  "Tall Poppy": { category: "Attack", icon: Crown, accent: "border-[#b65a50] text-[#943d35]" },
  "Cut the Brakes": { category: "Attack", icon: Scissors, accent: "border-[#b65a50] text-[#943d35]" },
  "Handbrake Turn": { category: "Movement", icon: Undo2, accent: "border-[#bd872f] text-[#8a5b14]" },
  "Clean Getaway": { category: "Tile defence", icon: ShieldCheck, accent: "border-[#60859a] text-[#355d75]" },
  "Roadblock": { category: "Attack", icon: Construction, accent: "border-[#b65a50] text-[#943d35]" },
};

export const crewAccents = [
  "border-amber-600 text-amber-800 dark:border-amber-400 dark:text-amber-300",
  "border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300",
  "border-violet-500 text-violet-700 dark:border-violet-400 dark:text-violet-300",
  "border-teal-600 text-teal-800 dark:border-teal-400 dark:text-teal-300",
  "border-rose-500 text-rose-700 dark:border-rose-400 dark:text-rose-300",
  "border-lime-600 text-lime-800 dark:border-lime-400 dark:text-lime-300",
  "border-orange-600 text-orange-800 dark:border-orange-400 dark:text-orange-300",
];

export const chapters: { id: RulebookChapter; title: string; icon: LucideIcon }[] = [
  { id: "quick-start", title: "Quick start", icon: ClipboardList },
  { id: "special-tiles", title: "Special tiles", icon: Route },
  { id: "ability-cards", title: "Ability cards", icon: Construction },
  { id: "secret-missions", title: "Secret missions", icon: VenetianMask },
];

export const tilePresentation: Record<string, { icon: LucideIcon; accent: string }> = {
  "Duel Chow": { icon: Swords, accent: "text-orange-700 dark:text-orange-300" },
  "Wrong Getaway Car": { icon: Undo2, accent: "text-purple-700 dark:text-purple-300" },
  "Police Raid": { icon: ShieldCheck, accent: "text-blue-700 dark:text-blue-300" },
  "Connections Upstairs": { icon: ArrowUp, accent: "text-emerald-700 dark:text-emerald-300" },
  "Ratted Out": { icon: ArrowDown, accent: "text-red-700 dark:text-red-300" },
  "Axo's Trivia": { icon: CircleHelp, accent: "text-amber-800 dark:text-amber-300" },
  "The Big Boss": { icon: Crown, accent: "text-amber-700 dark:text-primary" },
};
