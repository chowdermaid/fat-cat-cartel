import { CalendarDays, Dices, Hammer, Library, Users } from "lucide-react";
import type {
  HomeFeaturedTool,
  HomeHouseDetails,
  HomeNotice,
  HomeQuickTool,
  HomeStaticWeekItem,
} from "./types";

export const CLUBHOUSE = {
  maxVisible: 15,
  narrowVisible: 15,
  narrowWidth: 640,
  portraitSize: 52,
  narrowPortraitSize: 44,
  sceneHeight: 520,
  narrowSceneHeight: 480,
  artwork: { width: 1983, height: 793 },
  carpet: [{ x: 0.132, y: 0.605 }, { x: 0.868, y: 0.605 }, { x: 1.04, y: 0.96 }, { x: -0.04, y: 0.96 }],
  door: { x: 0.09, y: 0.475 },
  carpetEntry: { x: 0.17, y: 0.67 },
  doorwaySpeed: { min: 38, max: 48 },
  hatWidth: 1.4,
  hatLeft: -0.2,
  hatTop: -0.6,
  hatAspectRatio: 560 / 800,
  hatOrigin: { x: 0.5, y: 110 / 168 },
  hatEmbeddedTilt: -15,
  hatTilt: { min: -25, max: 10 },
  tooltipDelayMs: 250,
  edgeClearance: 16,
  nameWidth: 144,
  nameBottom: 30,
  region: { left: 0, right: 1, top: 0, bottom: 1 },
  speed: { min: 18, max: 28 },
  idleMs: { min: 1500, max: 4000 },
  replacementMs: { min: 15000, max: 25000 },
  fadeMs: 300,
  bobPx: 2,
  startStaggerMs: 180,
  destinationSamples: 32,
} as const;

export const HOME_STATIC_WEEK_ITEMS: readonly HomeStaticWeekItem[] = [
  {
    label: "Public Notice",
    title: "Mount Roulette",
    description: "Pick a mount quickly for the next run.",
    icon: Dices,
    to: "/mount-roulette",
  },
] as const;

export const HOME_GAZETTE = {
  name: "The Meowfia of Eorzea",
  issue: "Issue #060",
  edition: "Sophia Edition",
  dateline: "Plot 60, Ward 1, Sophia",
  headline: "House Bulletin",
  metadata: ["Sophia Edition", "Materia Dispatch", "Latest Issue"],
  tagline: "All the news fit to paw at",
} as const;

export const HOME_NOTICES: readonly HomeNotice[] = [
  {
    title: "Board open for weekly chaos",
    body: "Drop plans here first: farms, roulettes, glam runs, maps, and side quests.",
    tag: "Pinned",
  },
  {
    title: "Easter Social 2026 archived",
    body: "Scoreboards and event notes have been filed away in the archive.",
    tag: "Memory",
  },
  {
    title: "Crafting requests live nearby",
    body: "Need gear, furniture, food, or a clean handoff for materials? The crafting board is ready.",
    tag: "Errand",
  },
] as const;

export const HOME_QUICK_TOOLS: readonly HomeQuickTool[] = [
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/members", label: "Members", icon: Users },
  { to: "/fc-collection", label: "Collection", icon: Library },
  { to: "/craftingboard", label: "Crafting", icon: Hammer },
] as const;

export const HOME_HOUSE_DETAILS: HomeHouseDetails = {
  address: "Plot 60, Ward 1, Shirogane",
  badge: "Sophia · Large House",
  description: "Not evil base.",
};

export const HOME_FEATURED_TOOLS: readonly HomeFeaturedTool[] = [
  {
    to: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
    cta: "See what is next",
    description: "Check birthdays, FC plans, and Raid Helper imports.",
  },
  {
    to: "/mount-roulette",
    label: "Mount Roulette",
    icon: Dices,
    cta: "Roll a mount",
    description:
      "For when nobody can pick a mount before the pull timer starts.",
  },
  {
    to: "/craftingboard",
    label: "Crafting Board",
    icon: Hammer,
    cta: "Open requests",
    description: "Ask for gear, food, furniture, or help with a material list.",
  },
  {
    to: "/fc-collection",
    label: "FC Collection",
    icon: Library,
    cta: "Track progress",
    description: "See mounts, minions, titles, and other shiny evidence.",
  },
  {
    to: "/members",
    label: "Members",
    icon: Users,
    cta: "Browse members",
    description:
      "Find names, ranks, profiles, and who is probably online later.",
  },
] as const;
