import { HttpsError } from "firebase-functions/v2/https";

const XIVAPI_BASE_URL = "https://v2.xivapi.com";
const UNIVERSALIS_BASE_URL = "https://universalis.app/api/v2";
const SEARCH_LIMIT = 10;
const UNIVERSALIS_BATCH_SIZE = 100;
const UNIVERSALIS_LISTING_LIMIT = 100;
const UNIVERSALIS_HISTORY_ENTRIES = 1000;
const SELL_HISTORY_WINDOW_SECONDS = 30 * 24 * 60 * 60;
const SELL_HISTORY_WINDOW_MS = SELL_HISTORY_WINDOW_SECONDS * 1000;
const CART_DP_QUANTITY_CAP = 50_000;
const MAX_RECIPE_DEPTH = 5;
const EXTERNAL_FETCH_TIMEOUT_MS = 20_000;
const STALE_MARKET_DATA_MS = 24 * 60 * 60 * 1000;
const MARKET_TAX_RATE = 0.05;
const MARKET_SCOPE = "Oceania";
const MARKET_WORLDS = [
  "Bismarck",
  "Ravana",
  "Sephirot",
  "Sophia",
  "Zurvan",
] as const;
const TARGET_SELL_WORLD = "Sophia";
const SEARCH_FIELDS = [
  "ItemResult.Name",
  "ItemResult.Icon",
  "ItemResult.LevelItem",
  "AmountResult",
  "CraftType.Name",
  "RecipeLevelTable.ClassJobLevel",
].join(",");
const RECIPE_FIELDS = [
  "ItemResult.Name",
  "ItemResult.Icon",
  "ItemResult.LevelItem",
  "AmountResult",
  "CraftType.Name",
  "RecipeLevelTable.ClassJobLevel",
  "Ingredient[].Name",
  "Ingredient[].Icon",
  "AmountIngredient",
].join(",");

type XivapiIcon = {
  path?: string;
  path_hr1?: string;
};

type XivapiRelation<TFields = Record<string, unknown>> = {
  row_id?: number;
  fields?: TFields;
};

type RecipeSearchResult = {
  row_id?: number;
  fields?: {
    AmountIngredient?: number[];
    AmountResult?: number;
    CraftType?: XivapiRelation<{ Name?: string }>;
    Ingredient?: Array<XivapiRelation<{ Name?: string; Icon?: XivapiIcon }>>;
    ItemResult?: XivapiRelation<{
      Name?: string;
      Icon?: XivapiIcon;
      LevelItem?: number;
    }>;
    RecipeLevelTable?: XivapiRelation<{ ClassJobLevel?: number }>;
  };
};

type RecipeSearchResponse = {
  results?: RecipeSearchResult[];
};

export type MeowketItemSearchResult = {
  itemId: number;
  name: string;
  iconUrl?: string;
  levelItem?: number;
  recipeId?: number;
};

type MeowketMaterialCategory =
  | "ingredient"
  | "crystal"
  | "cluster"
  | "precraft"
  | "base_material"
  | "unknown";

type MeowketMaterial = {
  itemId: number;
  name: string;
  iconUrl?: string;
  quantityPerCraft: number;
  requiredQuantity?: number;
  ownedQuantity?: number;
  totalQuantity: number;
  category: MeowketMaterialCategory;
  depth?: number;
  sourceItemNames?: string[];
  worldPrices: WorldPrice[];
  cheapestWorld?: string;
  cheapestUnitPrice?: number;
  estimatedTotalCost?: number;
  purchasedQuantity?: number;
  surplusQuantity?: number;
  checkoutCost?: number;
  effectiveUnitCost?: number;
  selectedListings?: SelectedListing[];
  availableListings?: SelectedListing[];
};

type MeowketWorld = (typeof MARKET_WORLDS)[number];

type WorldPrice = {
  world: MeowketWorld;
  lowestPricePerUnit: number | null;
  listings?: PriceListing[];
  averagePricePerUnit?: number | null;
  averageLowestTwentyPricePerUnit?: number | null;
  estimatedTotalForQuantity?: number | null;
  purchasedQuantity?: number;
  surplusQuantity?: number;
  checkoutCost?: number | null;
  effectiveUnitCost?: number | null;
  selectedListings?: SelectedListing[];
  fulfilledQuantity?: number;
  quantityShortfall?: number;
  quantityAvailable?: number;
  listingCount?: number;
  lastUploadTime?: number;
};

type ShoppingListGroup = {
  world: string;
  items: {
      itemId: number;
      name: string;
      key: string;
      listingKey: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
  }[];
  worldTotal: number;
};

type MeowketProfitResult = {
  item: {
    itemId: number;
    recipeId?: number;
    name: string;
    iconUrl?: string;
    requestedQuantity: number;
    sellQuantity: number;
    crafterJob?: string;
    recipeLevel?: number;
    yieldPerCraft?: number;
    craftsRequired: number;
  };
  finalItemPrices: WorldPrice[];
  directMaterials?: MeowketMaterial[];
  materials: MeowketMaterial[];
  cheapestShoppingList: ShoppingListGroup[];
  estimatedMaterialCost: number | null;
  sellEstimate: {
    world: string;
    unitPrice: number | null;
    averageLowestTwentyPricePerUnit?: number | null;
    totalRevenue: number | null;
    marketTaxRate: number;
    taxAmount: number | null;
    netRevenue: number | null;
    recommendedUnitPrice: number | null;
    source:
      | "sophia_lowest_listing"
      | "sophia_average_lowest_twenty"
      | "fallback_world_lowest_listing"
      | "unavailable";
  };
  sellConfidence: SellConfidence;
  estimatedGrossProfit: number | null;
  estimatedNetProfit: number | null;
  warnings: string[];
};

type SellConfidence = {
  source: "sophia_history" | "oceania_history_fallback" | "unavailable";
  label: "likely" | "moderate" | "risky" | "unknown";
  verdict: "worth_crafting" | "thin_margin" | "not_worth" | "missing_prices";
  salesCount: number;
  unitsSold: number;
  salesPerDay: number | null;
  unitsPerDay: number | null;
  lastSaleTime: number | null;
  medianSalePrice: number | null;
  averageSalePrice: number | null;
  demandLabel: string;
  demandComment: string;
  reason: string;
  tooltip: string;
};

type UniversalisListing = {
  pricePerUnit?: unknown;
  quantity?: unknown;
  worldName?: unknown;
};

type PriceListing = {
  listingKey: string;
  pricePerUnit: number;
  quantity: number;
  world: MeowketWorld;
};

type SelectedListing = {
  listingKey: string;
  world: MeowketWorld;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type CartFill = {
  totalCost: number | null;
  effectiveUnitCost: number | null;
  purchasedQuantity: number;
  surplusQuantity: number;
  fulfilledQuantity: number;
  quantityShortfall: number;
  selectedListings: SelectedListing[];
};

type UniversalisItemData = {
  listings?: unknown;
  lastUploadTime?: unknown;
  listingsCount?: unknown;
  unitsForSale?: unknown;
};

type UniversalisResponse = {
  items?: Record<string, UniversalisItemData>;
  listings?: unknown;
  lastUploadTime?: unknown;
  listingsCount?: unknown;
  unitsForSale?: unknown;
};

type UniversalisSaleEntry = {
  pricePerUnit?: unknown;
  quantity?: unknown;
  timestamp?: unknown;
  worldName?: unknown;
};

type UniversalisHistoryResponse = {
  entries?: unknown;
  regularSaleVelocity?: unknown;
  lastUploadTime?: unknown;
};

type ItemWorldPrices = Map<number, WorldPrice[]>;

type MaterialResolution = {
  materials: MeowketMaterial[];
  warnings: string[];
};

export async function searchMeowketItemsForAdmin(
  data: unknown,
): Promise<MeowketItemSearchResult[]> {
  const query = parseSearchQuery(data);
  const params = new URLSearchParams({
    sheets: "Recipe",
    query: `ItemResult.Name~"${escapeXivapiQuery(query)}"`,
    limit: String(SEARCH_LIMIT),
    fields: SEARCH_FIELDS,
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${XIVAPI_BASE_URL}/api/search?${params.toString()}`,
    );
  } catch {
    throw new HttpsError("unavailable", "XIVAPI search is unavailable.");
  }

  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      `XIVAPI search failed with ${response.status}.`,
    );
  }

  let payload: RecipeSearchResponse;
  try {
    payload = (await response.json()) as RecipeSearchResponse;
  } catch {
    throw new HttpsError("internal", "XIVAPI search response was invalid.");
  }

  return compactSearchResults(payload.results ?? []);
}

export async function calculateMeowketProfitForAdmin(
  data: unknown,
): Promise<MeowketProfitResult> {
  const input = parseCalculateInput(data);
  const recipe = await fetchRecipeByOutputItemId(input.itemId);
  if (!recipe) {
    throw new HttpsError(
      "failed-precondition",
      "Selected item has no craftable recipe.",
    );
  }

  const item = recipe.fields?.ItemResult;
  const itemName = item?.fields?.Name?.trim();
  const itemId = item?.row_id;
  if (!itemId || !itemName) {
    throw new HttpsError("internal", "XIVAPI recipe response was incomplete.");
  }

  const yieldPerCraft = positiveInteger(recipe.fields?.AmountResult) ?? 1;
  const craftsRequired = Math.ceil(input.quantity / yieldPerCraft);
  const sellQuantity = craftsRequired * yieldPerCraft;
  const directBaseMaterials = normalizeMaterials(
    recipe,
    craftsRequired,
    craftsRequired,
    0,
  ).filter(isCostedMaterial);
  const materialResolution = input.includeChildMaterials
    ? await collectFlattenedMaterials(
        recipe,
        craftsRequired,
        craftsRequired,
        0,
        recipe.row_id ? new Set([recipe.row_id]) : new Set(),
      )
    : { materials: directBaseMaterials, warnings: [] };
  const baseMaterials = mergeMaterials(materialResolution.materials).filter(
    isCostedMaterial,
  );
  const materialsToBuy = applyOwnedMaterials(baseMaterials, input.ownedMaterials);
  const marketItemIds = [
    itemId,
    ...directBaseMaterials.map((material) => material.itemId),
    ...materialsToBuy.map((material) => material.itemId),
  ];
  const priceMap = await fetchWorldPrices(Array.from(new Set(marketItemIds)));
  const finalItemPrices = publicWorldPrices(
    await finalItemWorldPrices(priceMap, itemId),
  );
  const directMaterials = directBaseMaterials.map((material) =>
    materialWithPrices(material, worldPricesForItem(priceMap, material.itemId)),
  );
  const materials = materialsToBuy.map((material) =>
    materialWithPrices(material, worldPricesForItem(priceMap, material.itemId)),
  );
  const missingMaterials = materials.filter(
    (material) => material.cheapestUnitPrice === undefined,
  );
  const estimatedMaterialCost =
    missingMaterials.length > 0
      ? null
      : materials.reduce(
          (total, material) => total + (material.estimatedTotalCost ?? 0),
          0,
        );
  const sellEstimate = estimateSellPrice(finalItemPrices, sellQuantity);
  const estimatedGrossProfit =
    estimatedMaterialCost === null || sellEstimate.value.totalRevenue === null
      ? null
      : sellEstimate.value.totalRevenue - estimatedMaterialCost;
  const estimatedNetProfit =
    estimatedMaterialCost === null || sellEstimate.value.netRevenue === null
      ? null
      : sellEstimate.value.netRevenue - estimatedMaterialCost;
  const sellConfidence = await fetchSellConfidence(
    itemId,
    sellEstimate.value,
    estimatedMaterialCost,
    estimatedNetProfit,
  );
  const warnings: string[] = [];
  warnings.push(
    "Shards, crystals, and clusters are excluded from shopping cart cost and profit estimates.",
  );
  warnings.push(...materialResolution.warnings);
  if (missingMaterials.length > 0) {
    warnings.push(
      `Missing enough market listings for ${missingMaterials.length} material${missingMaterials.length === 1 ? "" : "s"}. Shopping cart cost and profit are unavailable.`,
    );
  }
  warnings.push(...staleMarketWarnings(finalItemPrices, materials));
  warnings.push(...sellEstimate.warnings);

  return {
    item: {
      itemId,
      ...(typeof recipe.row_id === "number" ? { recipeId: recipe.row_id } : {}),
      name: itemName,
      ...(xivapiIconUrl(item.fields?.Icon)
        ? { iconUrl: xivapiIconUrl(item.fields?.Icon) }
        : {}),
      requestedQuantity: input.quantity,
      sellQuantity,
      crafterJob: normalizeCrafter(recipe.fields?.CraftType?.fields?.Name),
      ...(typeof recipe.fields?.RecipeLevelTable?.fields?.ClassJobLevel ===
      "number"
        ? {
            recipeLevel:
              recipe.fields.RecipeLevelTable.fields.ClassJobLevel,
          }
        : {}),
      yieldPerCraft,
      craftsRequired,
    },
    finalItemPrices,
    ...(input.includeChildMaterials ? { directMaterials } : {}),
    materials,
    cheapestShoppingList: shoppingList(materials),
    estimatedMaterialCost,
    sellEstimate: sellEstimate.value,
    sellConfidence,
    estimatedGrossProfit,
    estimatedNetProfit,
    warnings,
  };
}

async function collectFlattenedMaterials(
  recipe: RecipeSearchResult,
  recipeCraftsRequired: number,
  rootCraftsRequired: number,
  depth: number,
  seenRecipeIds: Set<number>,
): Promise<MaterialResolution> {
  const warnings: string[] = [];
  const materials: MeowketMaterial[] = [];
  const amounts = recipe.fields?.AmountIngredient ?? [];
  const ingredients = recipe.fields?.Ingredient ?? [];
  const parentItemName = recipe.fields?.ItemResult?.fields?.Name?.trim();

  for (const [index, ingredient] of ingredients.entries()) {
    const amount = positiveInteger(amounts[index]) ?? 0;
    const itemId = ingredient.row_id;
    const name = ingredient.fields?.Name?.trim();
    if (!itemId || !name || amount <= 0) continue;

    const totalQuantity = amount * recipeCraftsRequired;
    const category = materialCategory(name);
    if (category === "crystal" || category === "cluster") {
      materials.push(
        materialFromIngredient(
          ingredient,
          totalQuantity,
          rootCraftsRequired,
          category,
          depth,
        ),
      );
      continue;
    }

    if (depth >= MAX_RECIPE_DEPTH) {
      warnings.push(
        `Max recipe depth reached at ${name}. Treating it as a purchasable precraft.`,
      );
      materials.push(
        materialFromIngredient(
          ingredient,
          totalQuantity,
          rootCraftsRequired,
          "precraft",
          depth,
        ),
      );
      continue;
    }

    const childRecipe = await fetchRecipeByOutputItemId(itemId);
    const childRecipeId = childRecipe?.row_id;
    if (!childRecipe || !childRecipeId) {
      materials.push(
        materialFromIngredient(
          ingredient,
          totalQuantity,
          rootCraftsRequired,
          depth > 0 ? "base_material" : "ingredient",
          depth,
          depth > 0 ? parentItemName : undefined,
        ),
      );
      continue;
    }

    if (seenRecipeIds.has(childRecipeId)) {
      warnings.push(
        `Recipe loop detected at ${name}. Treating it as a purchasable precraft.`,
      );
      materials.push(
        materialFromIngredient(
          ingredient,
          totalQuantity,
          rootCraftsRequired,
          "precraft",
          depth,
        ),
      );
      continue;
    }

    const childYield = positiveInteger(childRecipe.fields?.AmountResult) ?? 1;
    const childCraftsRequired = Math.ceil(totalQuantity / childYield);
    const childResolution = await collectFlattenedMaterials(
      childRecipe,
      childCraftsRequired,
      rootCraftsRequired,
      depth + 1,
      new Set([...seenRecipeIds, childRecipeId]),
    );
    materials.push(...childResolution.materials);
    warnings.push(...childResolution.warnings);
  }

  return { materials: mergeMaterials(materials), warnings };
}

async function fetchWorldPrices(itemIds: number[]): Promise<ItemWorldPrices> {
  const priceMap: ItemWorldPrices = new Map();
  for (const itemId of itemIds) {
    priceMap.set(
      itemId,
      MARKET_WORLDS.map((world) => ({ world, lowestPricePerUnit: null })),
    );
  }

  const chunks = chunk(itemIds, UNIVERSALIS_BATCH_SIZE);
  await Promise.all(
    chunks.map(async (ids) => {
      const response = await fetchUniversalisWorldChunk(MARKET_SCOPE, ids, true);
      for (const itemId of ids) {
        const itemData = universalisItemData(response, itemId);
        priceMap.set(itemId, worldPricesFromUniversalis(itemData, itemId));
      }
    }),
  );

  return priceMap;
}

async function fetchUniversalisWorldChunk(
  worldDcRegion: string,
  itemIds: number[],
  includeWorldName: boolean,
): Promise<UniversalisResponse> {
  const listingFields = [
    "listings.pricePerUnit",
    "listings.quantity",
    ...(includeWorldName ? ["listings.worldName"] : []),
    "lastUploadTime",
    "listingsCount",
    "unitsForSale",
  ];
  const fields =
    itemIds.length > 1
      ? listingFields.map((field) => `items.${field}`).join(",")
      : listingFields.join(",");
  const params = new URLSearchParams({
    listings: String(UNIVERSALIS_LISTING_LIMIT),
    entries: "0",
    fields,
  });
  const url = `${UNIVERSALIS_BASE_URL}/${encodeURIComponent(worldDcRegion)}/${itemIds.join(",")}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    throw new HttpsError(
      "unavailable",
      `Universalis prices are unavailable for ${worldDcRegion}.`,
    );
  }

  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      `Universalis price lookup for ${worldDcRegion} failed with ${response.status}.`,
    );
  }

  try {
    return (await response.json()) as UniversalisResponse;
  } catch {
    throw new HttpsError(
      "internal",
      `Universalis price response for ${worldDcRegion} was invalid.`,
    );
  }
}

async function fetchSellConfidence(
  itemId: number,
  sellEstimate: MeowketProfitResult["sellEstimate"],
  estimatedMaterialCost: number | null,
  estimatedNetProfit: number | null,
): Promise<SellConfidence> {
  try {
    const sophiaHistory = await fetchUniversalisHistory(
      TARGET_SELL_WORLD,
      itemId,
      false,
    );
    const sophiaEntries = saleEntries(sophiaHistory.entries);
    if (sophiaEntries.length > 0) {
      return buildSellConfidence(
        "sophia_history",
        sophiaHistory,
        sophiaEntries,
        sellEstimate,
        estimatedMaterialCost,
        estimatedNetProfit,
      );
    }

    const oceaniaHistory = await fetchUniversalisHistory(
      MARKET_SCOPE,
      itemId,
      true,
    );
    return buildSellConfidence(
      "oceania_history_fallback",
      oceaniaHistory,
      saleEntries(oceaniaHistory.entries),
      sellEstimate,
      estimatedMaterialCost,
      estimatedNetProfit,
    );
  } catch {
    return unavailableSellConfidence(
      confidenceVerdict(sellEstimate, estimatedMaterialCost, estimatedNetProfit),
      "Sale history unavailable.",
    );
  }
}

async function fetchUniversalisHistory(
  worldDcRegion: string,
  itemId: number,
  includeWorldName: boolean,
): Promise<UniversalisHistoryResponse> {
  const fields = [
    "entries.pricePerUnit",
    "entries.quantity",
    "entries.timestamp",
    ...(includeWorldName ? ["entries.worldName"] : []),
    "regularSaleVelocity",
    "lastUploadTime",
  ].join(",");
  const params = new URLSearchParams({
    entriesToReturn: String(UNIVERSALIS_HISTORY_ENTRIES),
    entriesWithin: String(SELL_HISTORY_WINDOW_SECONDS),
    statsWithin: String(SELL_HISTORY_WINDOW_MS),
    fields,
  });
  const url = `${UNIVERSALIS_BASE_URL}/history/${encodeURIComponent(worldDcRegion)}/${itemId}?${params.toString()}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      `Universalis sale history lookup for ${worldDcRegion} failed with ${response.status}.`,
    );
  }
  return (await response.json()) as UniversalisHistoryResponse;
}

function buildSellConfidence(
  source: SellConfidence["source"],
  history: UniversalisHistoryResponse,
  entries: SaleEntry[],
  sellEstimate: MeowketProfitResult["sellEstimate"],
  estimatedMaterialCost: number | null,
  estimatedNetProfit: number | null,
): SellConfidence {
  const verdict = confidenceVerdict(
    sellEstimate,
    estimatedMaterialCost,
    estimatedNetProfit,
  );
  if (entries.length === 0) {
    return unavailableSellConfidence(
      verdict === "missing_prices" ? "missing_prices" : "not_worth",
      source === "sophia_history"
        ? "No Sophia sales found in the last 30 days."
        : "No Oceania sales found in the last 30 days.",
    );
  }

  const prices = entries.map((entry) => entry.pricePerUnit).sort((a, b) => a - b);
  const salesCount = entries.length;
  const unitsSold = entries.reduce((total, entry) => total + entry.quantity, 0);
  const salesPerDay =
    numberValue(history.regularSaleVelocity) ?? salesCount / 30;
  const unitsPerDay = unitsSold / 30;
  const lastSaleTime = Math.max(...entries.map((entry) => entry.timestamp));
  const medianSalePrice = median(prices) ?? 0;
  const averageSalePrice = Math.round(
    prices.reduce((total, price) => total + price, 0) / prices.length,
  );
  const recommendedPrice = sellEstimate.recommendedUnitPrice;
  const margin =
    sellEstimate.netRevenue !== null &&
    estimatedNetProfit !== null &&
    sellEstimate.netRevenue > 0
      ? (estimatedNetProfit / sellEstimate.netRevenue) * 100
      : null;
  const priceOverMedian =
    recommendedPrice !== null && medianSalePrice !== null
      ? ((recommendedPrice - medianSalePrice) / medianSalePrice) * 100
      : null;
  const label = confidenceLabel({
    salesCount,
    salesPerDay,
    priceOverMedian,
    verdict,
    source,
  });
  const demand = demandInsight(salesPerDay, unitsPerDay, lastSaleTime, source);
  const demandComment = donComment({
    estimatedNetProfit,
    margin,
    priceOverMedian,
    salesPerDay,
    sellEstimateSource: sellEstimate.source,
    source,
    verdict,
  });
  const reason = confidenceReason(label, verdict, salesCount, salesPerDay);
  const tooltip = [
    `30-day sales: ${salesCount}`,
    `Units sold: ${unitsSold}`,
    `Sales/day: ${salesPerDay.toFixed(2)}`,
    `Units/day: ${unitsPerDay.toFixed(2)}`,
    `Last sale: ${formatHistoryTime(lastSaleTime)}`,
    `Median sale: ${medianSalePrice.toLocaleString()} gil`,
    `Avg sale: ${averageSalePrice.toLocaleString()} gil`,
    `Recommended: ${recommendedPrice?.toLocaleString() ?? "-"} gil`,
    `Net margin: ${margin === null ? "-" : `${margin.toFixed(1)}%`}`,
    source === "sophia_history"
      ? "Source: Sophia sale history"
      : "Source: Oceania fallback sale history",
  ].join(". ");

  return {
    source,
    label,
    verdict,
    salesCount,
    unitsSold,
    salesPerDay,
    unitsPerDay,
    lastSaleTime,
    medianSalePrice,
    averageSalePrice,
    demandLabel: demand.label,
    demandComment,
    reason,
    tooltip,
  };
}

function donComment({
  estimatedNetProfit,
  margin,
  priceOverMedian,
  salesPerDay,
  sellEstimateSource,
  source,
  verdict,
}: {
  estimatedNetProfit: number | null;
  margin: number | null;
  priceOverMedian: number | null;
  salesPerDay: number;
  sellEstimateSource: MeowketProfitResult["sellEstimate"]["source"];
  source: SellConfidence["source"];
  verdict: SellConfidence["verdict"];
}) {
  if (verdict === "missing_prices") {
    return "Missing prices. I cannot judge this craft until the material and sell data are complete.";
  }

  const fallbackNote =
    sellEstimateSource === "fallback_world_lowest_listing"
      ? " No Sophia listing was found, so this estimate is less grounded."
      : source !== "sophia_history"
        ? " Sophia sale history is thin, so confidence is weaker."
        : "";
  const medianNote =
    priceOverMedian !== null && priceOverMedian > 20
      ? " The recommended price is above recent sale median, so it may need patience."
      : priceOverMedian !== null && priceOverMedian <= 10
        ? " The price is close to recent sale history."
        : "";

  if (verdict === "not_worth") {
    if (salesPerDay >= 3) {
      return `It sells, but not at this material cost. Find cheaper mats or skip.${fallbackNote}`;
    }
    return `Bad deal. Demand is slow and profit is not positive.${fallbackNote}`;
  }

  if (verdict === "thin_margin") {
    if (salesPerDay >= 3) {
      return `Fast mover, thin cut. It can sell, but undercuts can erase the margin.${medianNote}${fallbackNote}`;
    }
    return `Thin margin and slow sales. Craft only if you already have materials or want a small test batch.${medianNote}${fallbackNote}`;
  }

  if (salesPerDay >= 10) {
    return `Strong craft. Profit is healthy and sales are moving very fast.${medianNote}${fallbackNote}`;
  }
  if (salesPerDay >= 3) {
    return `Good craft. Demand is steady enough to justify the margin.${medianNote}${fallbackNote}`;
  }
  if (salesPerDay >= 1) {
    return `Profitable with normal turnover. Good for a modest batch, not a warehouse pile.${medianNote}${fallbackNote}`;
  }
  if (salesPerDay > 0) {
    const profitText =
      estimatedNetProfit !== null
        ? `Profit is ${estimatedNetProfit.toLocaleString()} gil`
        : "Profitable";
    const marginText = margin !== null ? ` with ${margin.toFixed(1)}% margin` : "";
    return `${profitText}${marginText}, but this moves slowly. Craft one batch before scaling up.${medianNote}${fallbackNote}`;
  }

  return `Looks profitable on listings, but Sophia has no recent sales. Treat this as speculative.${fallbackNote}`;
}

function demandInsight(
  salesPerDay: number,
  unitsPerDay: number,
  lastSaleTime: number,
  source: SellConfidence["source"],
) {
  const sourceNote =
    source === "sophia_history" ? "" : " Fallback uses Oceania history.";
  const lastSale = formatHistoryTime(lastSaleTime);
  if (salesPerDay >= 10) {
    return {
      label: "Very hot lately",
      comment: `Very hot lately: ${salesPerDay.toFixed(1)} sales/day and ${unitsPerDay.toFixed(1)} units/day over 30 days.${sourceNote}`,
    };
  }
  if (salesPerDay >= 3) {
    return {
      label: "Selling steadily",
      comment: `Selling steadily: ${salesPerDay.toFixed(1)} sales/day, last sale ${lastSale}.${sourceNote}`,
    };
  }
  if (salesPerDay >= 1) {
    return {
      label: "Active market",
      comment: `Active market: ${salesPerDay.toFixed(1)} sales/day; expect normal turnover.${sourceNote}`,
    };
  }
  if (salesPerDay >= 0.35) {
    return {
      label: "Occasional sales",
      comment: `Occasional sales: ${salesPerDay.toFixed(2)} sales/day; margin matters more here.${sourceNote}`,
    };
  }
  if (salesPerDay > 0) {
    return {
      label: "Slow mover",
      comment: `Slow mover: ${salesPerDay.toFixed(2)} sales/day, so price risk is higher.${sourceNote}`,
    };
  }
  return {
    label: "No recent Sophia sales",
    comment: `No recent Sophia sales found in the 30-day sample.${sourceNote}`,
  };
}

type SaleEntry = {
  pricePerUnit: number;
  quantity: number;
  timestamp: number;
  worldName?: string;
};

function saleEntries(value: unknown): SaleEntry[] {
  return Array.isArray(value)
    ? value
        .map((entry): SaleEntry | null => {
          if (!entry || typeof entry !== "object") return null;
          const sale = entry as UniversalisSaleEntry;
          const pricePerUnit = numberValue(sale.pricePerUnit);
          const quantity = numberValue(sale.quantity);
          const timestamp = numberValue(sale.timestamp);
          if (
            pricePerUnit === null ||
            quantity === null ||
            timestamp === null ||
            pricePerUnit <= 0 ||
            quantity <= 0 ||
            timestamp <= 0
          ) {
            return null;
          }
          return {
            pricePerUnit,
            quantity,
            timestamp,
            ...(typeof sale.worldName === "string"
              ? { worldName: sale.worldName }
              : {}),
          };
        })
        .filter((entry): entry is SaleEntry => entry !== null)
    : [];
}

function confidenceVerdict(
  sellEstimate: MeowketProfitResult["sellEstimate"],
  estimatedMaterialCost: number | null,
  estimatedNetProfit: number | null,
): SellConfidence["verdict"] {
  if (
    sellEstimate.unitPrice === null ||
    sellEstimate.netRevenue === null ||
    estimatedMaterialCost === null ||
    estimatedNetProfit === null
  ) {
    return "missing_prices";
  }
  if (estimatedNetProfit <= 0) return "not_worth";
  const margin = (estimatedNetProfit / sellEstimate.netRevenue) * 100;
  if (margin < 15) return "thin_margin";
  return "worth_crafting";
}

function confidenceLabel({
  salesCount,
  salesPerDay,
  priceOverMedian,
  source,
  verdict,
}: {
  salesCount: number;
  salesPerDay: number;
  priceOverMedian: number | null;
  source: SellConfidence["source"];
  verdict: SellConfidence["verdict"];
}): SellConfidence["label"] {
  if (verdict === "missing_prices") return "unknown";
  if (verdict === "not_worth") return "risky";
  if (source !== "sophia_history") return "risky";
  if (salesCount < 3 || salesPerDay < 0.1) return "risky";
  if (priceOverMedian !== null && priceOverMedian > 20) return "risky";
  if (verdict === "thin_margin" || salesCount < 10 || salesPerDay < 0.35) {
    return "moderate";
  }
  return "likely";
}

function confidenceReason(
  label: SellConfidence["label"],
  verdict: SellConfidence["verdict"],
  salesCount: number,
  salesPerDay: number,
) {
  if (verdict === "missing_prices") return "Missing price data.";
  if (verdict === "not_worth") return "Estimated profit is not positive.";
  if (label === "likely") {
    return `Healthy margin with ${salesCount} sales over 30 days.`;
  }
  if (label === "moderate") {
    return `Positive estimate, but demand is ${salesPerDay.toFixed(2)} sales/day.`;
  }
  return "Recent demand or price alignment is weak.";
}

function unavailableSellConfidence(
  verdict: SellConfidence["verdict"],
  reason: string,
): SellConfidence {
  return {
    source: "unavailable",
    label: "unknown",
    verdict,
    salesCount: 0,
    unitsSold: 0,
    salesPerDay: null,
    unitsPerDay: null,
    lastSaleTime: null,
    medianSalePrice: null,
    averageSalePrice: null,
    demandLabel: "No recent Sophia sales",
    demandComment: reason,
    reason,
    tooltip: reason,
  };
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middle];
  return Math.round((values[middle - 1] + values[middle]) / 2);
}

function formatHistoryTime(timestampSeconds: number) {
  const elapsedMs = Date.now() - timestampSeconds * 1000;
  const elapsedHours = Math.max(0, Math.round(elapsedMs / (60 * 60 * 1000)));
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  return `${Math.round(elapsedHours / 24)}d ago`;
}

async function finalItemWorldPrices(
  priceMap: ItemWorldPrices,
  itemId: number,
): Promise<WorldPrice[]> {
  const prices = worldPricesForItem(priceMap, itemId);
  const sophia = prices.find((price) => price.world === TARGET_SELL_WORLD);
  if (sophia?.lowestPricePerUnit !== null && sophia?.lowestPricePerUnit !== undefined) {
    return prices;
  }

  const response = await fetchUniversalisWorldChunk(
    TARGET_SELL_WORLD,
    [itemId],
    false,
  );
  const sophiaPrice = worldPriceFromUniversalis(
    TARGET_SELL_WORLD,
    universalisItemData(response, itemId),
    TARGET_SELL_WORLD,
    itemId,
  );
  return prices.map((price) =>
    price.world === TARGET_SELL_WORLD ? sophiaPrice : price,
  );
}

function universalisItemData(
  response: UniversalisResponse,
  itemId: number,
): UniversalisItemData | null {
  if (response.items) return response.items[String(itemId)] ?? null;
  return response;
}

function worldPricesFromUniversalis(
  itemData: UniversalisItemData | null,
  itemId: number,
): WorldPrice[] {
  return MARKET_WORLDS.map((world) =>
    worldPriceFromUniversalis(world, itemData, world, itemId),
  );
}

function worldPriceFromUniversalis(
  world: MeowketWorld,
  itemData: UniversalisItemData | null,
  filterWorld?: MeowketWorld,
  itemId?: number,
): WorldPrice {
  const listings = priceListings(itemData?.listings, filterWorld, itemId);
  const hasWorldNames = listingArray(itemData?.listings).some(
    (listing) => worldNameValue(listing.worldName) !== undefined,
  );
  const prices = listings.map((listing) => listing.pricePerUnit);
  const lowestPricePerUnit = prices[0] ?? null;
  const lowestTwenty = prices.slice(0, 20);
  const averageLowestTwentyPricePerUnit =
    lowestTwenty.length > 0
      ? Math.round(
          lowestTwenty.reduce((total, price) => total + price, 0) /
            lowestTwenty.length,
        )
      : null;
  const quantityAvailable =
    hasWorldNames
      ? listings.reduce((total, listing) => total + listing.quantity, 0)
      : (numberValue(itemData?.unitsForSale) ??
        listings.reduce((total, listing) => total + listing.quantity, 0));
  const listingCount = hasWorldNames
    ? listings.length
    : (numberValue(itemData?.listingsCount) ?? listings.length);
  const lastUploadTime = numberValue(itemData?.lastUploadTime) ?? undefined;

  return {
    world,
    lowestPricePerUnit,
    listings,
    ...(averageLowestTwentyPricePerUnit !== null
      ? { averageLowestTwentyPricePerUnit }
      : {}),
    quantityAvailable,
    listingCount,
    ...(lastUploadTime !== undefined ? { lastUploadTime } : {}),
  };
}

function listingArray(value: unknown): UniversalisListing[] {
  return Array.isArray(value)
    ? value.filter(
        (listing): listing is UniversalisListing =>
          listing !== null && typeof listing === "object",
      )
    : [];
}

function priceListings(
  value: unknown,
  filterWorld?: MeowketWorld,
  itemId = 0,
): PriceListing[] {
  return listingArray(value)
    .map((listing) => {
      const pricePerUnit = numberValue(listing.pricePerUnit);
      const quantity = numberValue(listing.quantity);
      const listingWorld = worldNameValue(listing.worldName) ?? filterWorld;
      if (pricePerUnit === null || quantity === null) return null;
      if (!listingWorld) return null;
      if (filterWorld && listingWorld !== filterWorld) return null;
      if (pricePerUnit <= 0 || quantity <= 0) return null;
      return { pricePerUnit, quantity, world: listingWorld };
    })
    .filter(
      (listing): listing is Omit<PriceListing, "listingKey"> =>
        listing !== null,
    )
    .sort((left, right) => {
      const priceDelta = left.pricePerUnit - right.pricePerUnit;
      if (priceDelta !== 0) return priceDelta;
      const quantityDelta = left.quantity - right.quantity;
      if (quantityDelta !== 0) return quantityDelta;
      return worldSortIndex(left.world) - worldSortIndex(right.world);
    })
    .map((listing, index) => ({
      ...listing,
      listingKey: `${itemId}-${listing.world}-${index}-${listing.quantity}-${listing.pricePerUnit}`,
    }));
}

function worldPricesForItem(priceMap: ItemWorldPrices, itemId: number): WorldPrice[] {
  return (
    priceMap.get(itemId) ??
    MARKET_WORLDS.map((world) => ({ world, lowestPricePerUnit: null }))
  );
}

function materialWithPrices(
  material: MeowketMaterial,
  worldPrices: WorldPrice[],
): MeowketMaterial {
  const pricedWorlds = worldPrices.map((price) =>
    materialWorldPrice(price, material.totalQuantity),
  );
  const cart = fillWholeListings(
    worldPrices.flatMap((price) => price.listings ?? []),
    material.totalQuantity,
  );
  const availableListings = worldPrices
    .flatMap((price) => price.listings ?? [])
    .map(selectedListing)
    .sort(compareSelectedListings);
  const selectedWorlds = Array.from(
    new Set(cart.selectedListings.map((listing) => listing.world)),
  );
  return {
    ...material,
    worldPrices: pricedWorlds,
    ...(availableListings.length > 0 ? { availableListings } : {}),
    ...(cart.totalCost !== null
      ? {
          cheapestWorld:
            selectedWorlds.length === 1 ? selectedWorlds[0] : MARKET_SCOPE,
          cheapestUnitPrice: cart.effectiveUnitCost ?? undefined,
          estimatedTotalCost: cart.totalCost,
          purchasedQuantity: cart.purchasedQuantity,
          surplusQuantity: cart.surplusQuantity,
          checkoutCost: cart.totalCost,
          effectiveUnitCost: cart.effectiveUnitCost ?? undefined,
          selectedListings: cart.selectedListings,
        }
      : cart.selectedListings.length > 0
        ? {
            purchasedQuantity: cart.purchasedQuantity,
            surplusQuantity: cart.surplusQuantity,
            selectedListings: cart.selectedListings,
          }
      : {}),
  };
}

function materialWorldPrice(price: WorldPrice, quantityNeeded: number): WorldPrice {
  const fill = fillWholeListings(price.listings ?? [], quantityNeeded);
  return {
    ...publicWorldPrice(price),
    averagePricePerUnit: fill.effectiveUnitCost,
    estimatedTotalForQuantity: fill.totalCost,
    purchasedQuantity: fill.purchasedQuantity,
    surplusQuantity: fill.surplusQuantity,
    checkoutCost: fill.totalCost,
    effectiveUnitCost: fill.effectiveUnitCost,
    selectedListings: fill.selectedListings,
    fulfilledQuantity: fill.fulfilledQuantity,
    quantityShortfall: fill.quantityShortfall,
  };
}

function fillWholeListings(
  listings: PriceListing[],
  quantityNeeded: number,
): CartFill {
  if (quantityNeeded <= 0) {
    return {
      totalCost: 0,
      effectiveUnitCost: 0,
      purchasedQuantity: 0,
      surplusQuantity: 0,
      fulfilledQuantity: 0,
      quantityShortfall: 0,
      selectedListings: [],
    };
  }

  const usableListings = listings.filter(
    (listing) => listing.quantity > 0 && listing.pricePerUnit > 0,
  );
  const totalAvailable = usableListings.reduce(
    (total, listing) => total + listing.quantity,
    0,
  );
  if (totalAvailable < quantityNeeded) {
    const selectedListings = usableListings.map(selectedListing);
    return {
      totalCost: null,
      effectiveUnitCost: null,
      purchasedQuantity: totalAvailable,
      surplusQuantity: 0,
      fulfilledQuantity: totalAvailable,
      quantityShortfall: quantityNeeded - totalAvailable,
      selectedListings,
    };
  }

  const maxListingQuantity = Math.max(
    ...usableListings.map((listing) => listing.quantity),
    0,
  );
  const cap = Math.min(
    quantityNeeded + Math.max(0, maxListingQuantity - 1),
    CART_DP_QUANTITY_CAP,
  );
  const dp = new Map<number, { cost: number; purchased: number; indexes: number[] }>();
  dp.set(0, { cost: 0, purchased: 0, indexes: [] });

  usableListings.forEach((listing, index) => {
    const listingCost = listing.quantity * listing.pricePerUnit;
    const entries = Array.from(dp.entries());
    for (const [quantity, state] of entries) {
      const nextQuantity = Math.min(cap, quantity + listing.quantity);
      const candidate = {
        cost: state.cost + listingCost,
        purchased: state.purchased + listing.quantity,
        indexes: [...state.indexes, index],
      };
      const current = dp.get(nextQuantity);
      if (
        !current ||
        compareCartCandidate(candidate, current, quantityNeeded) < 0
      ) {
        dp.set(nextQuantity, candidate);
      }
    }
  });

  const best = Array.from(dp.values())
    .filter((state) => state.purchased >= quantityNeeded)
    .sort((left, right) =>
      compareCartCandidate(left, right, quantityNeeded),
    )[0];

  if (!best) {
    return greedyWholeListingFill(usableListings, quantityNeeded);
  }

  const selectedListings = best.indexes
    .map((index) => selectedListing(usableListings[index]))
    .sort(compareSelectedListings);
  return {
    totalCost: best.cost,
    effectiveUnitCost: best.cost / quantityNeeded,
    purchasedQuantity: best.purchased,
    surplusQuantity: best.purchased - quantityNeeded,
    fulfilledQuantity: quantityNeeded,
    quantityShortfall: 0,
    selectedListings,
  };
}

function greedyWholeListingFill(
  listings: PriceListing[],
  quantityNeeded: number,
): CartFill {
  const selected: PriceListing[] = [];
  let purchasedQuantity = 0;
  let totalCost = 0;
  for (const listing of [...listings].sort((left, right) => {
    const priceDelta = left.pricePerUnit - right.pricePerUnit;
    if (priceDelta !== 0) return priceDelta;
    return left.quantity - right.quantity;
  })) {
    if (purchasedQuantity >= quantityNeeded) break;
    selected.push(listing);
    purchasedQuantity += listing.quantity;
    totalCost += listing.quantity * listing.pricePerUnit;
  }
  const selectedListings = selected
    .map(selectedListing)
    .sort(compareSelectedListings);
  const quantityShortfall = Math.max(0, quantityNeeded - purchasedQuantity);
  return {
    totalCost: quantityShortfall > 0 ? null : totalCost,
    effectiveUnitCost:
      quantityShortfall > 0 ? null : totalCost / quantityNeeded,
    purchasedQuantity,
    surplusQuantity: Math.max(0, purchasedQuantity - quantityNeeded),
    fulfilledQuantity: Math.min(quantityNeeded, purchasedQuantity),
    quantityShortfall,
    selectedListings,
  };
}

function compareCartCandidate(
  left: { cost: number; purchased: number },
  right: { cost: number; purchased: number },
  quantityNeeded: number,
) {
  const costDelta = left.cost - right.cost;
  if (costDelta !== 0) return costDelta;
  const surplusDelta =
    Math.max(0, left.purchased - quantityNeeded) -
    Math.max(0, right.purchased - quantityNeeded);
  if (surplusDelta !== 0) return surplusDelta;
  return left.cost / quantityNeeded - right.cost / quantityNeeded;
}

function selectedListing(listing: PriceListing): SelectedListing {
  return {
    listingKey: listing.listingKey,
    world: listing.world,
    quantity: listing.quantity,
    unitPrice: listing.pricePerUnit,
    totalPrice: listing.quantity * listing.pricePerUnit,
  };
}

function compareSelectedListings(left: SelectedListing, right: SelectedListing) {
  const worldDelta = worldSortIndex(left.world) - worldSortIndex(right.world);
  if (worldDelta !== 0) return worldDelta;
  const priceDelta = left.unitPrice - right.unitPrice;
  if (priceDelta !== 0) return priceDelta;
  return left.quantity - right.quantity;
}

function publicWorldPrices(worldPrices: WorldPrice[]): WorldPrice[] {
  return worldPrices.map(publicWorldPrice);
}

function publicWorldPrice({
  listings: _listings,
  ...price
}: WorldPrice): WorldPrice {
  return price;
}

function estimateSellPrice(
  finalItemPrices: WorldPrice[],
  quantity: number,
): {
  value: MeowketProfitResult["sellEstimate"];
  warnings: string[];
} {
  const warnings: string[] = [];
  const sophia = finalItemPrices.find((price) => price.world === TARGET_SELL_WORLD);
  if (sophia?.lowestPricePerUnit !== null && sophia?.lowestPricePerUnit !== undefined) {
    const useAverage =
      (sophia.listingCount ?? 0) >= 20 &&
      sophia.averageLowestTwentyPricePerUnit !== undefined;
    if (!useAverage) {
      warnings.push(
        "Sophia has fewer than 20 active listings. Using lowest Sophia listing.",
      );
    }
    const unitPrice = useAverage
      ? sophia.averageLowestTwentyPricePerUnit ?? sophia.lowestPricePerUnit
      : sophia.lowestPricePerUnit;
    return {
      value: {
        world: TARGET_SELL_WORLD,
        unitPrice,
        ...(sophia.averageLowestTwentyPricePerUnit !== undefined
          ? {
              averageLowestTwentyPricePerUnit:
                sophia.averageLowestTwentyPricePerUnit,
            }
          : {}),
        totalRevenue: unitPrice * quantity,
        marketTaxRate: MARKET_TAX_RATE,
        taxAmount: Math.round(unitPrice * quantity * MARKET_TAX_RATE),
        netRevenue: Math.round(unitPrice * quantity * (1 - MARKET_TAX_RATE)),
        recommendedUnitPrice: Math.max(1, unitPrice - 1),
        source: useAverage
          ? "sophia_average_lowest_twenty"
          : "sophia_lowest_listing",
      },
      warnings,
    };
  }

  const fallback = finalItemPrices
    .filter(
      (price): price is WorldPrice & { lowestPricePerUnit: number } =>
        price.world !== TARGET_SELL_WORLD && price.lowestPricePerUnit !== null,
    )
    .sort(
      (left, right) => left.lowestPricePerUnit - right.lowestPricePerUnit,
    )[0];
  if (fallback) {
    warnings.push(
      `No Sophia listing found. Showing fallback listing from ${fallback.world}. Profit is less reliable.`,
    );
    return {
      value: {
        world: fallback.world,
        unitPrice: fallback.lowestPricePerUnit,
        ...(fallback.averageLowestTwentyPricePerUnit !== undefined
          ? {
              averageLowestTwentyPricePerUnit:
                fallback.averageLowestTwentyPricePerUnit,
            }
          : {}),
        totalRevenue: fallback.lowestPricePerUnit * quantity,
        marketTaxRate: MARKET_TAX_RATE,
        taxAmount: Math.round(
          fallback.lowestPricePerUnit * quantity * MARKET_TAX_RATE,
        ),
        netRevenue: Math.round(
          fallback.lowestPricePerUnit * quantity * (1 - MARKET_TAX_RATE),
        ),
        recommendedUnitPrice: Math.max(1, fallback.lowestPricePerUnit - 1),
        source: "fallback_world_lowest_listing",
      },
      warnings,
    };
  }

  warnings.push("No active listings found for the final item.");
  return {
    value: {
      world: TARGET_SELL_WORLD,
      unitPrice: null,
      totalRevenue: null,
      marketTaxRate: MARKET_TAX_RATE,
      taxAmount: null,
      netRevenue: null,
      recommendedUnitPrice: null,
      source: "unavailable",
    },
    warnings,
  };
}

function applyOwnedMaterials(
  materials: MeowketMaterial[],
  ownedMaterials: Map<number, number>,
): MeowketMaterial[] {
  return materials.map((material) => {
    const requiredQuantity = material.totalQuantity;
    const ownedQuantity = Math.min(
      requiredQuantity,
      Math.max(0, Math.floor(ownedMaterials.get(material.itemId) ?? 0)),
    );
    return {
      ...material,
      requiredQuantity,
      ...(ownedQuantity > 0 ? { ownedQuantity } : {}),
      totalQuantity: Math.max(0, requiredQuantity - ownedQuantity),
    };
  });
}

function shoppingList(materials: MeowketMaterial[]): ShoppingListGroup[] {
  const groups = new Map<string, ShoppingListGroup>();
  for (const material of materials) {
    if (
      material.totalQuantity <= 0 ||
      material.estimatedTotalCost === undefined ||
      material.selectedListings === undefined
    ) {
      continue;
    }
    material.selectedListings.forEach((listing, index) => {
      const group = groups.get(listing.world) ?? {
        world: listing.world,
        items: [],
        worldTotal: 0,
      };
      group.items.push({
        itemId: material.itemId,
        name: material.name,
        key: `${material.itemId}-${index}-${listing.world}-${listing.quantity}-${listing.unitPrice}`,
        listingKey: listing.listingKey,
        quantity: listing.quantity,
        unitPrice: listing.unitPrice,
        totalPrice: listing.totalPrice,
      });
      group.worldTotal += listing.totalPrice;
      groups.set(listing.world, group);
    });
  }
  return Array.from(groups.values()).sort((left, right) =>
    left.world.localeCompare(right.world),
  );
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function worldNameValue(value: unknown): MeowketWorld | undefined {
  return typeof value === "string" &&
    MARKET_WORLDS.includes(value as MeowketWorld)
    ? (value as MeowketWorld)
    : undefined;
}

function worldSortIndex(world: MeowketWorld) {
  const index = MARKET_WORLDS.indexOf(world);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EXTERNAL_FETCH_TIMEOUT_MS,
  );
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function staleMarketWarnings(
  finalItemPrices: WorldPrice[],
  materials: MeowketMaterial[],
): string[] {
  const now = Date.now();
  const warnings: string[] = [];
  const staleFinalWorlds = finalItemPrices
    .filter(
      (price) =>
        typeof price.lastUploadTime === "number" &&
        now - price.lastUploadTime > STALE_MARKET_DATA_MS,
    )
    .map((price) => price.world);
  if (staleFinalWorlds.length > 0) {
    warnings.push(
      `Final item market data is older than 24 hours on ${staleFinalWorlds.join(", ")}.`,
    );
  }

  const staleMaterialNames = materials
    .filter((material) => {
      const selectedWorlds = Array.from(
        new Set(material.selectedListings?.map((listing) => listing.world) ?? []),
      );
      const worldsToCheck =
        selectedWorlds.length > 0
          ? selectedWorlds
          : material.cheapestWorld && material.cheapestWorld !== MARKET_SCOPE
            ? [material.cheapestWorld]
            : [];
      return worldsToCheck.some((world) => {
        const price = material.worldPrices.find(
          (worldPrice) => worldPrice.world === world,
        );
        return (
          typeof price?.lastUploadTime === "number" &&
          now - price.lastUploadTime > STALE_MARKET_DATA_MS
        );
      });
    })
    .map((material) => material.name);
  if (staleMaterialNames.length > 0) {
    warnings.push(
      `Some cheapest material prices are older than 24 hours: ${staleMaterialNames.slice(0, 5).join(", ")}${staleMaterialNames.length > 5 ? ", ..." : ""}.`,
    );
  }

  return warnings;
}

async function fetchRecipeByOutputItemId(
  itemId: number,
): Promise<RecipeSearchResult | null> {
  const params = new URLSearchParams({
    sheets: "Recipe",
    query: `+ItemResult=${itemId}`,
    limit: "1",
    fields: RECIPE_FIELDS,
  });

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${XIVAPI_BASE_URL}/api/search?${params.toString()}`,
    );
  } catch {
    throw new HttpsError("unavailable", "XIVAPI recipe lookup is unavailable.");
  }

  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      `XIVAPI recipe lookup failed with ${response.status}.`,
    );
  }

  let payload: RecipeSearchResponse;
  try {
    payload = (await response.json()) as RecipeSearchResponse;
  } catch {
    throw new HttpsError("internal", "XIVAPI recipe response was invalid.");
  }

  return payload.results?.[0] ?? null;
}

function parseCalculateInput(data: unknown): {
  itemId: number;
  quantity: number;
  includeChildMaterials: boolean;
  ownedMaterials: Map<number, number>;
} {
  const input =
    data && typeof data === "object"
      ? (data as {
          itemId?: unknown;
          quantity?: unknown;
          includeChildMaterials?: unknown;
          ownedMaterials?: unknown;
        })
      : {};
  const itemId = Number(input.itemId);
  const quantity = Number(input.quantity);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    throw new HttpsError("invalid-argument", "A valid item ID is required.");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    throw new HttpsError(
      "invalid-argument",
      "Quantity must be a whole number between 1 and 9999.",
    );
  }
  return {
    itemId,
    quantity,
    includeChildMaterials: input.includeChildMaterials === true,
    ownedMaterials: parseOwnedMaterials(input.ownedMaterials),
  };
}

function parseOwnedMaterials(value: unknown): Map<number, number> {
  const ownedMaterials = new Map<number, number>();
  if (value === null || value === undefined) return ownedMaterials;
  if (typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Owned materials must be an object.");
  }

  for (const [itemIdValue, quantityValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const itemId = Number(itemIdValue);
    const quantity = Number(quantityValue);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new HttpsError("invalid-argument", "Owned material item ID is invalid.");
    }
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > 999_999) {
      throw new HttpsError(
        "invalid-argument",
        "Owned material quantity must be between 0 and 999999.",
      );
    }
    const ownedQuantity = Math.floor(quantity);
    if (ownedQuantity > 0) ownedMaterials.set(itemId, ownedQuantity);
  }

  return ownedMaterials;
}

function normalizeMaterials(
  recipe: RecipeSearchResult,
  recipeCraftsRequired: number,
  rootCraftsRequired: number,
  depth: number,
): MeowketMaterial[] {
  const amounts = recipe.fields?.AmountIngredient ?? [];
  const ingredients = recipe.fields?.Ingredient ?? [];
  return ingredients
    .map((ingredient, index): MeowketMaterial | null => {
      const amount = positiveInteger(amounts[index]) ?? 0;
      const itemId = ingredient.row_id;
      const name = ingredient.fields?.Name?.trim();
      if (!itemId || !name || amount <= 0) return null;
      return materialFromIngredient(
        ingredient,
        amount * recipeCraftsRequired,
        rootCraftsRequired,
        materialCategory(name),
        depth,
      );
    })
    .filter((material): material is MeowketMaterial => material !== null);
}

function materialFromIngredient(
  ingredient: XivapiRelation<{ Name?: string; Icon?: XivapiIcon }>,
  totalQuantity: number,
  rootCraftsRequired: number,
  category: MeowketMaterialCategory,
  depth: number,
  sourceItemName?: string,
): MeowketMaterial {
  const name = ingredient.fields?.Name?.trim() ?? "Unknown item";
  return {
    itemId: ingredient.row_id ?? 0,
    name,
    ...(xivapiIconUrl(ingredient.fields?.Icon)
      ? { iconUrl: xivapiIconUrl(ingredient.fields?.Icon) }
      : {}),
    quantityPerCraft:
      rootCraftsRequired > 0 ? totalQuantity / rootCraftsRequired : totalQuantity,
    totalQuantity,
    category,
    ...(depth > 0 ? { depth } : {}),
    ...(sourceItemName ? { sourceItemNames: [sourceItemName] } : {}),
    worldPrices: MARKET_WORLDS.map((world) => ({
      world,
      lowestPricePerUnit: null,
    })),
  };
}

function mergeMaterials(materials: MeowketMaterial[]): MeowketMaterial[] {
  const merged = new Map<number, MeowketMaterial>();
  for (const material of materials) {
    const existing = merged.get(material.itemId);
    if (!existing) {
      merged.set(material.itemId, { ...material });
      continue;
    }
    const totalQuantity = existing.totalQuantity + material.totalQuantity;
    merged.set(material.itemId, {
      ...existing,
      totalQuantity,
      quantityPerCraft:
        existing.quantityPerCraft + material.quantityPerCraft,
      depth: Math.min(existing.depth ?? 0, material.depth ?? 0),
      category: mergeMaterialCategory(existing.category, material.category),
      sourceItemNames: mergeSourceItemNames(
        existing.sourceItemNames,
        material.sourceItemNames,
      ),
    });
  }
  return Array.from(merged.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function mergeSourceItemNames(
  left: string[] | undefined,
  right: string[] | undefined,
): string[] | undefined {
  const names = Array.from(new Set([...(left ?? []), ...(right ?? [])]));
  return names.length > 0 ? names : undefined;
}

function mergeMaterialCategory(
  left: MeowketMaterialCategory,
  right: MeowketMaterialCategory,
): MeowketMaterialCategory {
  if (left === right) return left;
  if (left === "crystal" || right === "crystal") return "crystal";
  if (left === "cluster" || right === "cluster") return "cluster";
  if (left === "precraft" || right === "precraft") return "precraft";
  if (left === "base_material" || right === "base_material") {
    return "base_material";
  }
  return "ingredient";
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

const CRAFT_TYPE_TO_JOB: Record<string, string> = {
  Carpentry: "Carpenter",
  Smithing: "Blacksmith",
  Armorcraft: "Armorer",
  Goldsmithing: "Goldsmith",
  Leatherworking: "Leatherworker",
  Clothcraft: "Weaver",
  Alchemy: "Alchemist",
  Cooking: "Culinarian",
};

function normalizeCrafter(value: string | undefined): string | undefined {
  const craftType = value?.trim();
  if (!craftType) return undefined;
  return CRAFT_TYPE_TO_JOB[craftType] ?? craftType;
}

function materialCategory(name: string): MeowketMaterialCategory {
  if (/\b(Crystal|Shard)\b/i.test(name)) return "crystal";
  if (/\bCluster\b/i.test(name)) return "cluster";
  return "ingredient";
}

function isCostedMaterial(material: MeowketMaterial): boolean {
  return material.category !== "crystal" && material.category !== "cluster";
}

function parseSearchQuery(data: unknown): string {
  const input =
    data && typeof data === "object"
      ? (data as { query?: unknown }).query
      : undefined;
  const query = typeof input === "string" ? input.trim() : "";
  if (query.length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Search query must be at least 2 characters.",
    );
  }
  return query.slice(0, 80);
}

function escapeXivapiQuery(query: string): string {
  return query.replace(/"/g, '\\"');
}

function compactSearchResults(
  results: RecipeSearchResult[],
): MeowketItemSearchResult[] {
  const items = new Map<number, MeowketItemSearchResult>();

  for (const result of results) {
    const item = result.fields?.ItemResult;
    const itemId = item?.row_id;
    const name = item?.fields?.Name?.trim();
    if (!itemId || !name) continue;
    if (items.has(itemId)) continue;

    const iconUrl = xivapiIconUrl(item.fields?.Icon);
    items.set(itemId, {
      itemId,
      name,
      ...(iconUrl ? { iconUrl } : {}),
      ...(typeof item.fields?.LevelItem === "number"
        ? { levelItem: item.fields.LevelItem }
        : {}),
      ...(typeof result.row_id === "number" ? { recipeId: result.row_id } : {}),
    });
  }

  return Array.from(items.values());
}

function xivapiIconUrl(icon: XivapiIcon | undefined): string | undefined {
  const path = icon?.path_hr1 || icon?.path;
  if (!path) return undefined;
  const params = new URLSearchParams({ path, format: "png" });
  return `${XIVAPI_BASE_URL}/api/asset?${params.toString()}`;
}
