import { TARGET_SELL_WORLD } from "../constants";
import type {
  CartShoppingRouteGroup,
  CartShoppingRouteItem,
  MeowketCartBatch,
  MeowketCartGroup,
  MeowketCartSummary,
  MeowketProfitResult,
  SelectedListing,
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
  batchId: string,
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
      items: group.items.map((item) => {
        const listingKey =
          item.listingKey ?? item.key ?? fallbackListingKey(group.world, item);
        return {
          ...item,
          key: item.key ?? listingKey,
          iconUrl: iconsByItemId.get(item.itemId),
          listingKey,
          sourceBatchId: batchId,
          status: "open",
        };
      }),
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
  const id = `${calculation.item.itemId}-${calculation.item.requestedQuantity}-${addedAt}-${index}`;
  return {
    id,
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
    shoppingList: buildCartShoppingList(calculation, id),
    replacementListings: buildReplacementListings(calculation),
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
          .set(group.world, {
            world: group.world,
            items: [],
            worldTotal: 0,
            openCount: 0,
          })
          .get(group.world)!;
      for (const item of group.items) {
        const key = item.key ?? cartItemMergeKey(group.world, item);
        existingGroup.items.push({ ...item, key });
        if (item.status === "open") {
          existingGroup.openCount += 1;
          existingGroup.worldTotal += item.totalPrice;
        }
      }
    }
  }

  const groups = buildShoppingRouteGroups(
    Array.from(groupsByWorld.values()).map((group) => ({
      ...group,
      items: group.items.sort(
        (left, right) =>
          statusSortIndex(left.status) - statusSortIndex(right.status) ||
          left.name.localeCompare(right.name),
      ),
    })),
  ) as unknown as MeowketCartGroup[];

  const remainingMaterialCost = groups.reduce(
    (total, group) => total + group.worldTotal,
    0,
  );
  const sellRevenue = batches.reduce((total, batch) => total + batch.sellRevenue, 0);
  const netRevenue = batches.reduce((total, batch) => total + batch.netRevenue, 0);

  return {
    materialCost: remainingMaterialCost,
    sellRevenue,
    netRevenue,
    grossProfit: sellRevenue - remainingMaterialCost,
    netProfit: netRevenue - remainingMaterialCost,
    groups,
    warningBadges: cartWarningBadges(batches),
  };
}

export function buildReplacementCartItem({
  batch,
  listing,
  missingItem,
}: {
  batch: MeowketCartBatch;
  listing: SelectedListing;
  missingItem: CartShoppingRouteItem;
}): CartShoppingRouteItem {
  return {
    itemId: missingItem.itemId,
    name: missingItem.name,
    key: `${missingItem.itemId}-${listing.listingKey}-replacement-${Date.now()}`,
    iconUrl: missingItem.iconUrl,
    listingKey: listing.listingKey,
    quantity: listing.quantity,
    unitPrice: listing.unitPrice,
    totalPrice: listing.totalPrice,
    sourceBatchId: batch.id,
    status: "open",
    replacementForKey: missingItem.listingKey,
    note: "Replacement.",
  };
}

export function allUsedListingKeys(batches: MeowketCartBatch[]) {
  return new Set(
    batches.flatMap((batch) =>
      batch.shoppingList.flatMap((group) =>
        group.items.map((item) => item.listingKey),
      ),
    ),
  );
}

export function nextAvailableListing(
  batch: MeowketCartBatch,
  itemId: number,
  usedListingKeys: Set<string>,
) {
  return (batch.replacementListings[itemId] ?? []).find(
    (listing) => !usedListingKeys.has(listing.listingKey),
  );
}

function cartItemMergeKey(world: string, item: CartShoppingRouteItem) {
  return `${world}-${item.itemId}-${item.name}-${item.unitPrice}-${item.listingKey}`;
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

  if (
    batches.some((batch) =>
      batch.shoppingList.some((group) =>
        group.items.some(
          (item) =>
            item.status === "missing" &&
            item.note === "Missing. Refresh needed.",
        ),
      ),
    )
  ) {
    badges.push({
      label: "Needs refresh",
      title: "At least one missing listing has no replacement.",
      variant: "destructive",
    });
  }

  return badges;
}

function buildReplacementListings(
  calculation: MeowketProfitResult,
): Record<number, SelectedListing[]> {
  return Object.fromEntries(
    calculation.materials.map((material) => [
      material.itemId,
      [...(material.availableListings ?? [])].sort(compareAvailableListings),
    ]),
  );
}

function compareAvailableListings(left: SelectedListing, right: SelectedListing) {
  const priceDelta = left.unitPrice - right.unitPrice;
  if (priceDelta !== 0) return priceDelta;
  const quantityDelta = left.quantity - right.quantity;
  if (quantityDelta !== 0) return quantityDelta;
  return worldSortIndex(left.world) - worldSortIndex(right.world);
}

function fallbackListingKey(
  world: string,
  item: Pick<CartShoppingRouteItem, "itemId" | "quantity" | "unitPrice">,
) {
  return `${item.itemId}-${world}-${item.quantity}-${item.unitPrice}`;
}

function statusSortIndex(status: CartShoppingRouteItem["status"]) {
  return status === "open" ? 0 : status === "bought" ? 1 : 2;
}
