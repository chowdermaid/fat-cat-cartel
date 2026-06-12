import type { CraftingRequestDashboardRecord } from "@/features/craftingboard/types";
import type { HomeOpenErrandSummary } from "../types";

const MATERIAL_STATUS_LABELS: Record<string, string> = {
  requester_has_all_materials: "Materials ready",
  requester_has_some_materials: "Some mats supplied",
  crafter_to_provide_materials: "Crafter mats needed",
};

export function summarizeOpenErrand(
  requests: CraftingRequestDashboardRecord[],
): HomeOpenErrandSummary | null {
  const request = requests
    .filter((item) => item.status === "open")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (!request) return null;

  const itemNames = request.itemNames.length
    ? request.itemNames
    : request.items.map((item) => item.itemName);
  const firstItem = itemNames[0] ?? "Crafting request";
  const remainingItems = Math.max(0, request.itemCount - 1);
  const commissionOffered = Boolean(request.commission?.offered);

  return {
    title:
      remainingItems > 0
        ? `${firstItem} +${remainingItems} more`
        : firstItem,
    requesterName: request.requester.characterName,
    requesterAvatarUrl: request.requester.avatarUrl,
    itemCount: request.itemCount,
    materialStatus:
      MATERIAL_STATUS_LABELS[request.materialStatus] ?? "Materials unknown",
    commissionStatus: commissionOffered
      ? "Commission offered"
      : "No commission listed",
  };
}
