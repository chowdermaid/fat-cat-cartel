import { ArrowDown, ArrowUp, Bird, Cat, ClipboardList, Cloud, Fish, Grid3X3, LayoutGrid, Map, Users, Trophy, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RulebookChapter, Tile } from "./types";

export const chapters: { id: RulebookChapter; title: string; icon: LucideIcon }[] = [
  { id: "board-overview", title: "Board Overview", icon: LayoutGrid },
  { id: "quick-start", title: "Quick start", icon: ClipboardList },
  { id: "special-tiles", title: "Tiles & movement", icon: Map },
  { id: "group-minigames", title: "Group minigames", icon: Users },
  { id: "bingo", title: "Bingo", icon: Grid3X3 },
  { id: "rewards", title: "Rewards", icon: Trophy },
];

export const tilePresentation: Record<Tile["id"], { icon: LucideIcon; accent: string }> = {
  shark: { icon: Fish, accent: "border-[#60859a] text-[#355d75]" },
  fatcat: { icon: Cat, accent: "border-[#bd872f] text-[#8a5b14]" },
  chocobo: { icon: Bird, accent: "border-[#bd872f] text-[#8a5b14]" },
  moogle: { icon: Cloud, accent: "border-[#b65a80] text-[#943d65]" },
  mushroom: { icon: Undo2, accent: "border-[#9464a3] text-[#734480]" },
  ladder: { icon: ArrowUp, accent: "border-[#64826c] text-[#3c6246]" },
  "red-arrow": { icon: ArrowDown, accent: "border-[#b65a50] text-[#943d35]" },
};
