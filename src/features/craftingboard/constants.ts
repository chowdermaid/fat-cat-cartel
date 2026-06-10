import { CheckCircle2, Clock3, Inbox } from "lucide-react";
import type { ElementType } from "react";
import type { CraftingMaterialStatus } from "./types";

export const materialStatusLabels: Record<CraftingMaterialStatus, string> = {
  requester_has_all_materials: "I have all the materials",
  requester_has_some_materials: "I have some of the materials",
  crafter_to_provide_materials: "Crafter to provide materials",
};

export type RequestSectionConfig = {
  title: string;
  description: string;
  emptyText: string;
  icon: ElementType;
  accent: string;
  laneClass: string;
};

export const sectionConfigs = {
  open: {
    title: "Open requests",
    description: "Waiting for a willing crafter to pick up the leve.",
    emptyText: "No open requests. Astrid is behaving.",
    icon: Inbox,
    accent: "text-primary",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  inProgress: {
    title: "In progress",
    description: "Claimed by a crafter.",
    emptyText: "Nothing is in progress. The workshop is quiet.",
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  completed: {
    title: "Completed",
    description: "Finished requests (last 30 days)",
    emptyText: "No completed requests from the last 30 days.",
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    laneClass: "",
  },
} satisfies Record<string, RequestSectionConfig>;

export const SEARCH_DELAY_MS = 300;
export const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]";
export const REQUEST_SECTION_PAGE_SIZE = 3;
export const COMPLETED_SECTION_PAGE_SIZE = 8;
export const TEAMCRAFT_IMPORT_BASE_URL = "https://ffxivteamcraft.com/import";
export const MATERIAL_NOTE_MAX_LENGTH = 200;
export const DEFAULT_MATERIAL_STATUS: CraftingMaterialStatus =
  "requester_has_all_materials";

export const CRAFTING_JOB_ICON_SLUG: Record<string, string> = {
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
};
