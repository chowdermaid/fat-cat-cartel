import type { CraftingMaterialStatus, CraftingRequestDashboardRecord } from "../types";

export function commissionLabel(
  commission: NonNullable<CraftingRequestDashboardRecord["commission"]>,
) {
  return typeof commission.gil === "number" && commission.gil > 0
    ? `${commission.gil.toLocaleString()} gil`
    : "";
}

export function gilCommissionLabel(
  commission: CraftingRequestDashboardRecord["commission"],
) {
  if (!commission?.offered) return null;
  const label = commissionLabel(commission);
  return label || null;
}

export function materialGuidanceText(status: CraftingMaterialStatus) {
  if (status === "crafter_to_provide_materials") {
    return "Crafter to provide materials.";
  }
  return "Materials: FC chest tab 2 or coordinate with crafter.";
}

export function requestTitle(request: CraftingRequestDashboardRecord) {
  return `${request.requester.characterName}'s order`;
}

export function formatRequestDate(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function statusLabel(status: CraftingRequestDashboardRecord["status"]) {
  if (status === "in_progress") return "In progress";
  return status[0].toUpperCase() + status.slice(1);
}