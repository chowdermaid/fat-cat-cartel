import { Award, Crown, Mountain, Rabbit } from "lucide-react";
import { ZONE_TABS } from "@/features/raid-stats/zones";
import type { CollectibleKey } from "@/features/fc-collection/types";
import type { MemberProfile } from "./types";

export type ProfileParseType = "savage" | "trial" | "alliance";
export type ActivityChartType = "timeline" | "progress" | "jobs" | "heatmap";
export const ACTIVITY_PAGE_SIZE = 10;

export const PROFILE_ZONE_IDS = ZONE_TABS.filter((tab) => tab.type === "savage" || tab.type === "trial" || tab.type === "alliance").flatMap((tab) => tab.zones.map((zone) => zone.id));
export const COLLECTIBLES_CACHE_KEY = "fcc_collectibles_v1";
export const COLLECTIBLES_TTL = 24 * 60 * 60 * 1000;

export const JOB_ICON_SLUG: Record<string, string> = {
  Paladin: "paladin",
  Warrior: "warrior",
  "Dark Knight": "darkknight",
  Gunbreaker: "gunbreaker",
  "White Mage": "whitemage",
  Scholar: "scholar",
  Astrologian: "astrologian",
  Sage: "sage",
  Monk: "monk",
  Dragoon: "dragoon",
  Ninja: "ninja",
  Samurai: "samurai",
  Reaper: "reaper",
  Viper: "viper",
  Bard: "bard",
  Machinist: "machinist",
  Dancer: "dancer",
  "Black Mage": "blackmage",
  Summoner: "summoner",
  "Red Mage": "redmage",
  Pictomancer: "pictomancer",
  "Blue Mage": "bluemage",
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
  Miner: "Miner",
  Botanist: "Botanist",
  Fisher: "Fisher",
};
export const JOB_NAME_ALIASES: Record<string, string> = {
  BlackMage: "Black Mage",
  BlueMage: "Blue Mage",
  DarkKnight: "Dark Knight",
  RedMage: "Red Mage",
  WhiteMage: "White Mage",
};
export const JOB_ABBR: Record<string, string> = {
  Paladin: "PLD",
  Warrior: "WAR",
  "Dark Knight": "DRK",
  Gunbreaker: "GNB",
  "White Mage": "WHM",
  Scholar: "SCH",
  Astrologian: "AST",
  Sage: "SGE",
  Monk: "MNK",
  Dragoon: "DRG",
  Ninja: "NIN",
  Samurai: "SAM",
  Reaper: "RPR",
  Viper: "VPR",
  Bard: "BRD",
  Machinist: "MCH",
  Dancer: "DNC",
  "Black Mage": "BLM",
  Summoner: "SMN",
  "Red Mage": "RDM",
  Pictomancer: "PCT",
  "Blue Mage": "BLU",
  Carpenter: "CRP",
  Blacksmith: "BSM",
  Armorer: "ARM",
  Goldsmith: "GSM",
  Leatherworker: "LTW",
  Weaver: "WVR",
  Alchemist: "ALC",
  Culinarian: "CUL",
  Miner: "MIN",
  Botanist: "BTN",
  Fisher: "FSH",
};
export const PROFILE_JOBS = [
  "Paladin",
  "Warrior",
  "Dark Knight",
  "Gunbreaker",
  "White Mage",
  "Scholar",
  "Astrologian",
  "Sage",
  "Monk",
  "Dragoon",
  "Ninja",
  "Samurai",
  "Reaper",
  "Viper",
  "Bard",
  "Machinist",
  "Dancer",
  "Black Mage",
  "Summoner",
  "Red Mage",
  "Pictomancer",
] as const;
export const PROFILE_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const PROFILE_DAYS = Array.from({ length: 31 }, (_, index) => index + 1);
export const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
  timezone: null,
  favoriteMountId: null,
  favoriteMinionId: null,
  favoriteContent: null,
};
export const DEFAULT_MAX_JOB_LEVEL = 100;
export const JOB_MAX_LEVELS: Partial<Record<string, number>> = {
  "Blue Mage": 80,
};
export const JOB_LEVEL_GROUPS = [
  {
    label: "Tank",
    jobs: ["Paladin", "Warrior", "Dark Knight", "Gunbreaker"],
  },
  {
    label: "Healer",
    jobs: ["White Mage", "Scholar", "Astrologian", "Sage"],
  },
  {
    label: "Melee DPS",
    jobs: ["Monk", "Dragoon", "Ninja", "Samurai", "Reaper", "Viper"],
  },
  {
    label: "Physical Ranged",
    jobs: ["Bard", "Machinist", "Dancer"],
  },
  {
    label: "Magical Ranged",
    jobs: ["Black Mage", "Summoner", "Red Mage", "Pictomancer"],
  },
  {
    label: "Limited",
    jobs: ["Blue Mage"],
  },
  {
    label: "Crafting",
    jobs: [
      "Carpenter",
      "Blacksmith",
      "Armorer",
      "Goldsmith",
      "Leatherworker",
      "Weaver",
      "Alchemist",
      "Culinarian",
    ],
  },
  {
    label: "Gathering",
    jobs: ["Miner", "Botanist", "Fisher"],
  },
] as const;
export type JobLevelGroup = (typeof JOB_LEVEL_GROUPS)[number];
export const COLLECTIBLE_META: Record<CollectibleKey, { label: string; icon: React.ElementType }> = {
  mounts: { label: "Mounts", icon: Mountain },
  minions: { label: "Minions", icon: Rabbit },
  titles: { label: "Titles", icon: Crown },
  achievements: { label: "Achievements", icon: Award },
};
