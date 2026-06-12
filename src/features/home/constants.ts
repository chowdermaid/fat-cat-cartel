import { CalendarDays, Dices, Hammer, Library, Users } from "lucide-react";
import type {
  HomeFeaturedTool,
  HomeHouseDetails,
  HomeNotice,
  HomeQuickTool,
  HomeStaticWeekItem,
} from "./types";

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
  headline: "Today’s Front Page",
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
