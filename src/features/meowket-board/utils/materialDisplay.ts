import { CART_ROUTE_WORLDS } from "../constants";
import type { MeowketMaterial } from "../types";
import { formatGil, formatQuantity } from "./formatting";

export function materialSupplyStatus(material: MeowketMaterial): {
  label: string;
  title?: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (
    (material.ownedQuantity ?? 0) >=
    (material.requiredQuantity ?? material.totalQuantity)
  ) {
    return {
      label: "Owned",
      title: "Owned quantity covers this material.",
      variant: "default",
    };
  }
  if (
    material.cheapestWorld === undefined ||
    material.cheapestUnitPrice === undefined ||
    material.estimatedTotalCost === undefined
  ) {
    return {
      label: "Short supply",
      title: "Fetched listings cannot cover the required quantity.",
      variant: "destructive",
    };
  }
  if ((material.surplusQuantity ?? 0) > 0) {
    return {
      label: `+${formatQuantity(material.surplusQuantity ?? 0)} surplus`,
      title: surplusTooltip(material),
      variant: "outline",
    };
  }
  if ((material.selectedListings?.length ?? Number.MAX_SAFE_INTEGER) >= 95) {
    return {
      label: "Listing cap risk",
      title:
        "Cart uses most of the fetched top 100 listings. Cheaper deeper listings may exist.",
      variant: "outline",
    };
  }
  return {
    label: "Exact fill",
    title: "Bought quantity equals required quantity.",
    variant: "secondary",
  };
}

export function worldSortIndex(world: string) {
  const index = CART_ROUTE_WORLDS.indexOf(
    world as (typeof CART_ROUTE_WORLDS)[number],
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function selectedWorldSummary(material: MeowketMaterial) {
  const listings = material.selectedListings ?? [];
  const worlds = Array.from(new Set(listings.map((listing) => listing.world)));
  if (worlds.length === 0) return "No cart";
  if (worlds.length === 1) {
    return `${listings.length} stack${listings.length === 1 ? "" : "s"}`;
  }
  return `${worlds.length} worlds, ${listings.length} stacks`;
}

export function actualCostTooltip(material: MeowketMaterial) {
  if (
    !material.selectedListings?.length ||
    material.estimatedTotalCost === undefined
  ) {
    return "No complete cart found in fetched listings.";
  }
  return `${stackMath(material.selectedListings)} = ${formatGil(material.estimatedTotalCost)}`;
}

export function effectiveUnitTooltip(material: MeowketMaterial) {
  if (
    material.effectiveUnitCost === undefined ||
    material.estimatedTotalCost === undefined
  ) {
    return "No complete cart found in fetched listings.";
  }
  return `${formatGil(material.estimatedTotalCost)} / ${formatQuantity(material.totalQuantity)} needed = ${formatGil(material.effectiveUnitCost)}`;
}

export function surplusTooltip(material: MeowketMaterial) {
  const bought = material.purchasedQuantity ?? material.totalQuantity;
  const surplus =
    material.surplusQuantity ?? Math.max(0, bought - material.totalQuantity);
  return `Bought ${formatQuantity(bought)} - needed ${formatQuantity(material.totalQuantity)} = ${formatQuantity(surplus)} extra`;
}

export function ownedTooltip(material: MeowketMaterial) {
  const needed = material.requiredQuantity ?? material.totalQuantity;
  return `Owned covers ${formatQuantity(needed)} needed, buy cost removed.`;
}

export function stackMath(
  listings: NonNullable<MeowketMaterial["selectedListings"]>,
) {
  return listings
    .slice(0, 8)
    .map(
      (listing) =>
        `${formatQuantity(listing.quantity)} x ${formatGil(listing.unitPrice).replace(" gil", "")}`,
    )
    .join(" + ")
    .concat(listings.length > 8 ? " + ..." : "");
}

export function materialLabel(material: MeowketMaterial) {
  if (
    material.category === "base_material" &&
    material.sourceItemNames?.length
  ) {
    const [firstSource, ...otherSources] = material.sourceItemNames;
    return `${firstSource} ingredient${
      otherSources.length > 0 ? ` + ${otherSources.length} more` : ""
    }`;
  }
  return material.category;
}
