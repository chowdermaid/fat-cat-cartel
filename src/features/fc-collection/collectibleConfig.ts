import type { LucideIcon } from "lucide-react";
import { Mountain, Rabbit, Crown, Award } from "lucide-react";

export const COLLECTIBLE_KEYS = ["mounts", "minions", "titles", "achievements"] as const;

export type CollectibleKey = (typeof COLLECTIBLE_KEYS)[number];

export interface CollectibleConfig {
  key: CollectibleKey;
  label: string;
  singular: string;
  apiPath: string;
  icon: LucideIcon;
  rankBy?: "count" | "points";
  categoryFilter?: string[];
  fetchLimit?: number;
}

export const COLLECTIBLE_CONFIG: CollectibleConfig[] = [
  { key: "mounts",  label: "Mounts",  singular: "Mount",  apiPath: "mounts",  icon: Mountain },
  { key: "minions", label: "Minions", singular: "Minion", apiPath: "minions", icon: Rabbit },
  { key: "titles",  label: "Titles",  singular: "Title",  apiPath: "titles",  icon: Crown },
  {
    key: "achievements",
    label: "Achievements",
    singular: "Achievement",
    apiPath: "achievements",
    icon: Award,
    rankBy: "points",
    fetchLimit: 5000,
    categoryFilter: [
      // Battle
      "Trials", "Raids", "Dungeons", "Duty", "Deep Dungeon Weapons", "Phantom Weapons",
      // PvP
      "Frontline", "The Wolves' Den",
      // Exploration
      "Field Operations", "Treasure Hunt", "Gold Saucer",
      // Character / Story
      "Main Scenario", "General", "Allied Society Quests", "All Disciplines",
      // Crafting
      "Carpenter", "Blacksmith", "Armorer", "Goldsmith", "Leatherworker", "Weaver", "Alchemist", "Culinarian", "Cosmic Tools",
      // Gathering
      "Miner", "Botanist", "Fisher",
    ],
  },
];
