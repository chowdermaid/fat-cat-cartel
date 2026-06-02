import type { CraftingIngredient, XivapiIcon } from "./api/xivapi";

export const CRAFTING_REQUEST_STATUSES = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type CraftingRequestStatus = (typeof CRAFTING_REQUEST_STATUSES)[number];

export const CRAFTING_MATERIAL_STATUSES = [
  "requester_has_all_materials",
  "requester_has_some_materials",
  "crafter_to_provide_materials",
] as const;

export type CraftingMaterialStatus =
  (typeof CRAFTING_MATERIAL_STATUSES)[number];

export type CraftingRequestMember = {
  lodestoneId: string;
  discordUserId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
};

export type CraftingEligibleCrafter = {
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  job: string;
  level: number;
};

export type CraftingPrecraftSnapshot = {
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  quantity: number;
  recipeId: number;
  crafter: string;
  recipeLevel: number | null;
  depth?: number;
};

export type CraftingRecipeSnapshot = {
  recipeId: number;
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  amountResult: number;
  crafter: string;
  recipeLevel: number | null;
  ingredients: CraftingIngredient[];
  crystals: CraftingIngredient[];
  clusters: CraftingIngredient[];
  precrafts: CraftingPrecraftSnapshot[];
  eligibleCrafters: CraftingEligibleCrafter[];
  snapshottedAt: number;
  source: "xivapi";
};

export type CraftingSelectedItem = {
  itemId: number;
  itemName: string;
  itemIcon?: XivapiIcon;
  quantity: number;
  selectedRecipeId: number;
  recipeSnapshot: CraftingRecipeSnapshot;
};

export type CraftingDiscordMessageMetadata = {
  channelId: string;
  messageId: string;
  url: string | null;
};

export type CraftingRequestCommission = {
  offered: boolean;
  gil: number | null;
};

export type CraftingRequest = {
  id: string;
  status: CraftingRequestStatus;
  materialStatus: CraftingMaterialStatus;
  materialNote?: string | null;
  requester: CraftingRequestMember;
  acceptedBy?: (CraftingRequestMember & {
    acceptedAt: number;
  }) | null;
  completedBy?: (CraftingRequestMember & {
    completedAt: number;
  }) | null;
  items: CraftingSelectedItem[];
  commission?: CraftingRequestCommission | null;
  discordMessage: CraftingDiscordMessageMetadata | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  cancelledAt?: number | null;
};

export type CraftingRequestDashboardItem = Pick<
  CraftingSelectedItem,
  "itemId" | "itemName" | "itemIcon" | "quantity" | "selectedRecipeId"
> & {
  recipeSnapshot: Pick<
    CraftingRecipeSnapshot,
    | "recipeId"
    | "crafter"
    | "recipeLevel"
    | "amountResult"
    | "ingredients"
    | "crystals"
    | "clusters"
    | "precrafts"
    | "eligibleCrafters"
  >;
};

export type CraftingRequestDashboardRecord = Pick<
  CraftingRequest,
  | "id"
  | "status"
  | "materialStatus"
  | "materialNote"
  | "requester"
  | "acceptedBy"
  | "completedBy"
  | "commission"
  | "createdAt"
  | "updatedAt"
  | "completedAt"
> & {
  itemCount: number;
  itemNames: string[];
  items: CraftingRequestDashboardItem[];
};

export type CraftingRequestDashboardData = {
  open: CraftingRequestDashboardRecord[];
  inProgress: CraftingRequestDashboardRecord[];
  completed: CraftingRequestDashboardRecord[];
  stats: {
    completedTotal: number;
  };
};
