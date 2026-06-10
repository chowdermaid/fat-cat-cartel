export interface MemberProfile {
  bio: string | null;
  birthday: string | null;
  mainJobs: string[];
  timezone?: string | null;
  favoriteMountId?: number | null;
  favoriteMinionId?: number | null;
  favoriteContent?: string | null;
}

export type ProfileParseType = "savage" | "trial" | "alliance";

export type ActivityChartType = "timeline" | "progress" | "jobs" | "heatmap";

export type CraftingProfileStats = {
  fulfilledRequests: number;
  fulfilledItems: number;
  updatedAt: number | null;
};
