import type { Member } from "@/types";
import { HOME_FEATURED_TOOLS } from "../constants";
import type { HomeFeaturedTool, HomeSpotlightMember } from "../types";

function localDayNumber(date: Date): number {
  return Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() /
      86_400_000,
  );
}

export function getDailyIndex(count: number, date = new Date()): number {
  if (count <= 0) return 0;
  return localDayNumber(date) % count;
}

export function selectDailyFeaturedTool(date = new Date()): HomeFeaturedTool {
  return HOME_FEATURED_TOOLS[
    getDailyIndex(HOME_FEATURED_TOOLS.length, date)
  ];
}

function numericTomestoneTotal(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && value) {
    const record = value as Record<string, unknown>;
    return (
      numericTomestoneTotal(record.count) ??
      numericTomestoneTotal(record.total) ??
      numericTomestoneTotal(record.value)
    );
  }
  return null;
}

export function selectDailyMember(
  members: Record<string, Member>,
  date = new Date(),
): HomeSpotlightMember | null {
  const eligibleMembers = Object.entries(members)
    .filter(([, member]) => member.name.trim().length > 0)
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  if (eligibleMembers.length === 0) return null;

  const [lodestoneId, member] =
    eligibleMembers[getDailyIndex(eligibleMembers.length, date)];

  return {
    lodestoneId,
    name: member.name,
    server: member.server,
    avatarUrl: member.avatarUrl,
    fcRank: member.fcRank,
    totalMounts: numericTomestoneTotal(member.tomestoneProfile?.totalMounts),
    totalMinions: numericTomestoneTotal(member.tomestoneProfile?.totalMinions),
  };
}

export function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}
