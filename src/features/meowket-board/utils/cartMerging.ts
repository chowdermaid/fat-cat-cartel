import { TARGET_SELL_WORLD } from "../constants";
import type {
  CartShoppingRouteGroup,
  CartShoppingRouteItem,
  MeowketCartBatch,
  MeowketCartGroup,
  MeowketCartSummary,
  MeowketProfitResult,
  ShoppingRouteGroup,
} from "../types";
import { materialSupplyStatus, worldSortIndex } from "./materialDisplay";

export function buildShoppingRouteGroups(
  groups: MeowketProfitResult["cheapestShoppingList"],
): ShoppingRouteGroup[] {
  return [...groups].sort((left, right) => {
    if (left.world === TARGET_SELL_WORLD && right.world !== TARGET_SELL_WORLD) {
      return 1;
    }
    if (right.world === TARGET_SELL_WORLD && left.world !== TARGET_SELL_WORLD) {
      return -1;
    }
    return worldSortIndex(left.world) - worldSortIndex(right.world);
  });
}

export function buildCartShoppingList(
  calculation: MeowketProfitResult,
): CartShoppingRouteGroup[] {
  const iconsByItemId = new Map(
    calculation.materials.map((material) => [
      material.itemId,
      material.iconUrl,
    ]),
  );
  return buildShoppingRouteGroups(calculation.cheapestShoppingList).map(
    (group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        iconUrl: iconsByItemId.get(item.itemId),
      })),
    }),
  );
}

export function canAddCalculationToCart(calculation: MeowketProfitResult) {
  return (
    typeof calculation.estimatedMaterialCost === "number" &&
    typeof calculation.sellEstimate.totalRevenue === "number" &&
    typeof calculation.sellEstimate.netRevenue === "number" &&
    typeof calculation.estimatedGrossProfit === "number" &&
    typeof calculation.estimatedNetProfit === "number" &&
    calculation.materials.every(
      (material) =>
        (material.ownedQuantity ?? 0) >=
          (material.requiredQuantity ?? material.totalQuantity) ||
        typeof material.estimatedTotalCost === "number",
    )
  );
}

export function addToCartTooltip(calculation: MeowketProfitResult) {
  if (canAddCalculationToCart(calculation)) {
    return "Adds current missing material stack buys to the shared cart.";
  }
  return "Cart needs complete material supply, sell revenue, and profit math.";
}

export function buildCartBatch(
  calculation: MeowketProfitResult,
  index: number,
): MeowketCartBatch {
  const addedAt = Date.now();
  return {
    id: `${calculation.item.itemId}-${calculation.item.requestedQuantity}-${addedAt}-${index}`,
    addedAt,
    itemId: calculation.item.itemId,
    itemName: calculation.item.name,
    itemIconUrl: calculation.item.iconUrl,
    requestedQuantity: calculation.item.requestedQuantity,
    sellQuantity: calculation.item.sellQuantity,
    sellUnitPrice: calculation.sellEstimate.unitPrice,
    materialCost: calculation.estimatedMaterialCost ?? 0,
    sellRevenue: calculation.sellEstimate.totalRevenue ?? 0,
    netRevenue: calculation.sellEstimate.netRevenue ?? 0,
    grossProfit: calculation.estimatedGrossProfit ?? 0,
    netProfit: calculation.estimatedNetProfit ?? 0,
    sellSource: calculation.sellEstimate.source,
    warnings: calculation.warnings,
    materialStatuses: calculation.materials.map(
      (material) => materialSupplyStatus(material).label,
    ),
    shoppingList: buildCartShoppingList(calculation),
  };
}

export function buildCartSummary(
  batches: MeowketCartBatch[],
): MeowketCartSummary {
  const groupsByWorld = new Map<string, MeowketCartGroup>();
  for (const batch of batches) {
    for (const group of batch.shoppingList) {
      const existingGroup =
        groupsByWorld.get(group.world) ??
        groupsByWorld
          .set(group.world, { world: group.world, items: [], worldTotal: 0 })
          .get(group.world)!;
      for (const item of group.items) {
        const key = cartItemMergeKey(group.world, item);
        const existingItem = existingGroup.items.find(
          (entry) => entry.key === key,
        );
        if (existingItem) {
          existingItem.quantity += item.quantity;
          existingItem.totalPrice += item.totalPrice;
        } else {
          existingGroup.items.push({ ...item, key });
        }
        existingGroup.worldTotal += item.totalPrice;
      }
    }
  }

  const groups = buildShoppingRouteGroups(
    Array.from(groupsByWorld.values()).map((group) => ({
      ...group,
      items: group.items.sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    })),
  ) as unknown as MeowketCartGroup[];

  return {
    materialCost: batches.reduce(
      (total, batch) => total + batch.materialCost,
      0,
    ),
    sellRevenue: batches.reduce((total, batch) => total + batch.sellRevenue, 0),
    netRevenue: batches.reduce((total, batch) => total + batch.netRevenue, 0),
    grossProfit: batches.reduce((total, batch) => total + batch.grossProfit, 0),
    netProfit: batches.reduce((total, batch) => total + batch.netProfit, 0),
    groups,
    warningBadges: cartWarningBadges(batches),
  };
}

function cartItemMergeKey(world: string, item: CartShoppingRouteItem) {
  return `${world}-${item.itemId}-${item.name}-${item.unitPrice}`;
}

function cartWarningBadges(
  batches: MeowketCartBatch[],
): MeowketCartSummary["warningBadges"] {
  const badges: MeowketCartSummary["warningBadges"] = [];
  const allWarnings = batches.flatMap((batch) => batch.warnings);
  const allStatuses = batches.flatMap((batch) => batch.materialStatuses);

  if (
    batches.some(
      (batch) => batch.sellSource === "fallback_world_lowest_listing",
    )
  ) {
    badges.push({
      label: "Fallback estimate",
      title: "At least one craft uses a non-Sophia fallback sell estimate.",
      variant: "destructive",
    });
    badges.push({
      label: "No Sophia entries",
      title: "At least one craft had no Sophia market entries.",
      variant: "destructive",
    });
  }

  if (
    allWarnings.some((warning) => warning.includes("older than 24 hours")) ||
    allStatuses.includes("Stale prices")
  ) {
    badges.push({
      label: "Stale prices",
      title: "At least one market price is older than 24 hours.",
      variant: "outline",
    });
  }

  if (allStatuses.includes("Listing cap risk")) {
    badges.push({
      label: "Listing cap risk",
      title: "At least one material used most of the fetched top 100 listings.",
      variant: "outline",
    });
  }

  if (allStatuses.includes("Short supply")) {
    badges.push({
      label: "Short supply",
      title: "At least one material did not have enough fetched supply.",
      variant: "destructive",
    });
  }

  return badges;
}
