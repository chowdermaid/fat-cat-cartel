import type { CraftingRequestDashboardRecord, CraftingRequestMember } from "../types";

export function sameCraftingMember(
  left:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
  right:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
): boolean {
  return (
    sameStringId(left?.lodestoneId, right?.lodestoneId) ||
    sameStringId(left?.discordUserId, right?.discordUserId)
  );
}

function sameStringId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

export function completedByMember(
  request: CraftingRequestDashboardRecord,
): CraftingRequestMember {
  return request.completedBy ?? request.acceptedBy ?? request.requester;
}

export function isCraftingAdminSession(
  session: { isAdmin?: boolean; fcRank?: string | null } | null,
): boolean {
  const rank = String(session?.fcRank ?? "")
    .trim()
    .toLowerCase();
  return session?.isAdmin === true || rank === "boss" || rank === "underpaw";
}
