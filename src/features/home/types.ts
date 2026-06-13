import type { LucideIcon } from "lucide-react";

export type HomeStaticWeekItem = {
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
};

export type HomeWeeklyEventSummary = {
  title: string;
  when: string;
};

export type HomeWeeklyBirthdaySummary = {
  people: {
    name: string;
    avatarUrl: string | null;
  }[];
  remaining: number;
};

export type HomeNextBirthdaySummary = {
  name: string;
  when: string;
};

export type HomeWeeklyData = {
  profiles: Record<string, import("@/features/member-profile/types").MemberProfile>;
  plannerEvents: import("@/features/calendar/types").PlannerEvent[];
};

export type HomeOpenErrandSummary = {
  title: string;
  requesterName: string;
  requesterAvatarUrl: string | null;
  itemCount: number;
  materialStatus: string;
  commissionStatus: string;
};

export type HomeCraftingStatus = {
  openCount: number;
  inProgressCount: number;
};

export type HomeNotice = {
  title: string;
  body: string;
  tag: string;
  dateLabel?: string;
  timeLabel?: string;
  location?: string;
};

export type HomeNoticeItem = HomeNotice & {
  to?: "/calendar";
};

export type HomeQuickTool = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export type HomeFeaturedTool = HomeQuickTool & {
  cta: string;
  description: string;
};

export type HomeHouseDetails = {
  address: string;
  badge: string;
  description: string;
};

export type HomeSpotlightMember = {
  lodestoneId: string;
  name: string;
  server: string;
  avatarUrl: string | null;
  fcRank: string | null;
  totalMounts?: number | null;
  totalMinions?: number | null;
};
