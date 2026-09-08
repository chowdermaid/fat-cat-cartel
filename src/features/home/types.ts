import type { LucideIcon } from "lucide-react";
import type { Member } from "@/types";
import type { JSAnimation, Timer } from "animejs";

export type ClubhouseProps = {
  members: Record<string, Member>;
  profiles: HomeWeeklyData["profiles"];
};

export type ClubhouseQueue = { visible: string[]; waiting: string[] };
export type ClubhousePoint = { x: number; y: number };
export type ClubhouseBounds = { left: number; top: number; width: number; height: number };
export type ClubhouseProtection = "hover" | "focus" | "tooltip";
export type ClubhouseEnvironment = {
  hidden: boolean;
  offscreen: boolean;
  reducedMotion: boolean;
};
export type ClubhouseLayout = { narrow: boolean; size: number; limit: number; height: number };
export type ClubhouseGeometry = {
  height: number;
  bounds: ClubhouseBounds;
  carpet: ClubhousePoint[];
  walkPolygon: ClubhousePoint[];
  door: ClubhousePoint;
  carpetEntry: ClubhousePoint;
};
export type ClubhouseActor = {
  point: ClubhousePoint;
  destination: ClubhousePoint;
  protection: Set<ClubhouseProtection>;
  element: HTMLDivElement | null;
  body: HTMLElement | null;
  fade: HTMLElement | null;
  movement?: JSAnimation;
  bob?: JSAnimation;
  transition?: JSAnimation;
  idle?: Timer;
  entering: boolean;
  journey: "arriving" | "departing" | "returning" | null;
  route: ClubhousePoint[];
};

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
