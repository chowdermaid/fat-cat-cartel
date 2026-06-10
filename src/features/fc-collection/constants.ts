import {
  Mountain,
  Rabbit,
  Crown,
  Award,
  Ticket,
  Swords,
  Leaf,
  BookOpen,
  Shield,
  Flame,
  Hammer,
  Compass,
  type LucideIcon,
} from "lucide-react";
import type { CollectibleConfig, CollectibleKey } from "./types";

export const COLLECTIBLE_KEYS: CollectibleKey[] = [
  "mounts",
  "minions",
  "titles",
  "achievements",
];

export const FC_COLLECTION_CACHE_KEY = "fcc_collection_v3";
export const FC_COLLECTION_CACHE_TTL = 3 * 60 * 60 * 1000;
export const COLLECTION_SCOPE_STORAGE_KEY = "fcc_collection_scope_v1";

export const EXPANSIONS = [
  { key: "all", label: "All" },
  { key: "ARR", label: "ARR", min: 2, max: 3 },
  { key: "HW", label: "HW", min: 3, max: 4 },
  { key: "SB", label: "SB", min: 4, max: 5 },
  { key: "ShB", label: "ShB", min: 5, max: 6 },
  { key: "EW", label: "EW", min: 6, max: 7 },
  { key: "DT", label: "DT", min: 7, max: 8 },
] as const;

export const ACHIEVEMENT_GROUPS = {
  All: null,
  Battle: ["Trials", "Raids", "Dungeons", "Duty", "Deep Dungeon Weapons", "Phantom Weapons"],
  PvP: ["Frontline", "The Wolves' Den"],
  Exploration: ["Field Operations", "Treasure Hunt", "Gold Saucer"],
  Crafting: ["Carpenter", "Blacksmith", "Armorer", "Goldsmith", "Leatherworker", "Weaver", "Alchemist", "Culinarian", "Cosmic Tools", "All Disciplines"],
  Gathering: ["Miner", "Botanist", "Fisher"],
  Story: ["Main Scenario", "Allied Society Quests", "General"],
} as const;

export const OVERVIEW_NICHES: Array<{
  label: string;
  desc: string;
  cats: string[];
  icon: LucideIcon;
}> = [
  {
    label: "Arcade Goer",
    desc: "Gold Saucer",
    cats: ["Gold Saucer"],
    icon: Ticket,
  },
  {
    label: "PVP Enthusiast",
    desc: "Frontline Â· Wolves' Den",
    cats: ["Frontline", "The Wolves' Den"],
    icon: Swords,
  },
  {
    label: "Grass Toucher",
    desc: "Miner Â· Botanist Â· Fisher",
    cats: ["Miner", "Botanist", "Fisher"],
    icon: Leaf,
  },
  {
    label: "Quest Enjoyer",
    desc: "Main Scenario Â· Allied Society Â· General",
    cats: ["Main Scenario", "Allied Society Quests", "General"],
    icon: BookOpen,
  },
  {
    label: "Sweat",
    desc: "Trials Â· Raids Â· Dungeons Â· Duty",
    cats: ["Trials", "Raids", "Dungeons", "Duty"],
    icon: Shield,
  },
  {
    label: "The Deep Diver",
    desc: "Deep Dungeons Â· Phantom Weapons",
    cats: ["Deep Dungeon Weapons", "Phantom Weapons"],
    icon: Flame,
  },
  {
    label: "The Artisan",
    desc: "All Crafters",
    cats: [
      "Carpenter",
      "Blacksmith",
      "Armorer",
      "Goldsmith",
      "Leatherworker",
      "Weaver",
      "Alchemist",
      "Culinarian",
      "Cosmic Tools",
      "All Disciplines",
    ],
    icon: Hammer,
  },
  {
    label: "The Explorer",
    desc: "Field Operations Â· Treasure Hunt",
    cats: ["Field Operations", "Treasure Hunt"],
    icon: Compass,
  },
];

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
