import { callAdminFunction } from "@/features/admin/lib/adminFunctions";
import {
  getXivapiIconUrl,
  searchCraftingRecipes,
} from "@/features/craftingboard/api/xivapi";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { firebaseApp } from "@/lib/firebase";

export type MeowketItemSearchResult = {
  itemId: number;
  name: string;
  iconUrl?: string;
  levelItem?: number;
  recipeId?: number;
};

export type MeowketMaterial = {
  itemId: number;
  name: string;
  iconUrl?: string;
  quantityPerCraft: number;
  requiredQuantity?: number;
  ownedQuantity?: number;
  totalQuantity: number;
  category:
    | "ingredient"
    | "crystal"
    | "cluster"
    | "precraft"
    | "base_material"
    | "unknown";
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
};

export type SelectedListing = {
  world: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type WorldPrice = {
  world: string;
  lowestPricePerUnit: number | null;
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

export type MeowketProfitResult = {
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
  cheapestShoppingList: {
    world: string;
    items: {
      itemId: number;
      name: string;
      key?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    worldTotal: number;
  }[];
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

export type SellConfidence = {
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

export const MOCK_MEOWKET_SEARCH_RESULTS: MeowketItemSearchResult[] = [
  {
    itemId: 44090,
    name: "Claro Walnut Lumber",
    levelItem: 710,
    recipeId: 35001,
  },
  {
    itemId: 44112,
    name: "Rroneek Serge",
    levelItem: 710,
    recipeId: 35002,
  },
  {
    itemId: 44125,
    name: "Black Star",
    levelItem: 710,
    recipeId: 35003,
  },
];

const LOCAL_MEOWKET_RESULTS: Record<number, MeowketProfitResult> = {
  44090: {
    item: {
      itemId: 44090,
      recipeId: 35001,
      name: "Claro Walnut Lumber",
      requestedQuantity: 1,
      sellQuantity: 1,
      crafterJob: "Carpenter",
      recipeLevel: 99,
      yieldPerCraft: 1,
      craftsRequired: 1,
    },
    finalItemPrices: [],
    materials: [
      {
        itemId: 43985,
        name: "Claro Walnut Log",
        quantityPerCraft: 5,
        totalQuantity: 5,
        category: "ingredient",
        worldPrices: [],
        cheapestWorld: "Ravana",
        cheapestUnitPrice: 3100,
        estimatedTotalCost: 15500,
        purchasedQuantity: 5,
        surplusQuantity: 0,
        checkoutCost: 15500,
        effectiveUnitCost: 3100,
        selectedListings: [
          {
            world: "Ravana",
            quantity: 5,
            unitPrice: 3100,
            totalPrice: 15500,
          },
        ],
      },
      {
        itemId: 8,
        name: "Wind Crystal",
        quantityPerCraft: 8,
        totalQuantity: 8,
        category: "crystal",
        worldPrices: [],
        cheapestWorld: "Bismarck",
        cheapestUnitPrice: 64,
        estimatedTotalCost: 512,
      },
    ],
    cheapestShoppingList: [
      {
        world: "Bismarck",
        items: [
          {
            itemId: 8,
            name: "Wind Crystal",
            key: "8-0-Bismarck-8-64",
            quantity: 8,
            unitPrice: 64,
            totalPrice: 512,
          },
        ],
        worldTotal: 512,
      },
      {
        world: "Ravana",
        items: [
          {
            itemId: 43985,
            name: "Claro Walnut Log",
            key: "43985-0-Ravana-5-3100",
            quantity: 5,
            unitPrice: 3100,
            totalPrice: 15500,
          },
        ],
        worldTotal: 15500,
      },
    ],
    estimatedMaterialCost: 16012,
    sellEstimate: {
      world: "Sophia",
      unitPrice: 47500,
      totalRevenue: 47500,
      marketTaxRate: 0.05,
      taxAmount: 2375,
      netRevenue: 45125,
      recommendedUnitPrice: 47499,
      source: "sophia_lowest_listing",
    },
    sellConfidence: {
      source: "sophia_history",
      label: "likely",
      verdict: "worth_crafting",
      salesCount: 24,
      unitsSold: 61,
      salesPerDay: 0.8,
      unitsPerDay: 2.03,
      lastSaleTime: Math.floor(Date.now() / 1000) - 6 * 60 * 60,
      medianSalePrice: 48000,
      averageSalePrice: 49200,
      demandLabel: "Occasional sales",
      demandComment:
        "Profitable with normal turnover. Good for a modest batch, not a warehouse pile. The price is close to recent sale history.",
      reason: "Healthy margin with 24 sales over 30 days.",
      tooltip:
        "30-day sales: 24. Units sold: 61. Sales/day: 0.80. Units/day: 2.03. Last sale: 6h ago. Median sale: 48,000 gil. Recommended: 47,499 gil. Source: Sophia sale history.",
    },
    estimatedGrossProfit: 31488,
    estimatedNetProfit: 29113,
    warnings: ["Local mock result."],
  },
};

export async function searchMeowketItems(
  sessionToken: string | null,
  query: string,
): Promise<MeowketItemSearchResult[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  if (DEV_AUTH_LAYER_ENABLED || !firebaseApp) {
    return localSearch(trimmedQuery);
  }

  if (!sessionToken) {
    throw new Error("Admin session is required.");
  }

  return callAdminFunction<MeowketItemSearchResult[]>(
    "searchMeowketItems",
    sessionToken,
    { query: trimmedQuery },
    { timeout: 30_000 },
  );
}

export async function calculateMeowketProfit(
  sessionToken: string | null,
  input: {
    itemId: number;
    quantity: number;
    includeChildMaterials?: boolean;
    ownedMaterials?: Record<number, number>;
  },
): Promise<MeowketProfitResult> {
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));

  if (!firebaseApp) {
    const result = LOCAL_MEOWKET_RESULTS[input.itemId];
    if (!result) {
      throw new Error("Local mock recipe is unavailable for this item.");
    }
    const craftsRequired = Math.ceil(
      quantity / (result.item.yieldPerCraft ?? 1),
    );
    const sellQuantity = craftsRequired * (result.item.yieldPerCraft ?? 1);
    return {
      ...result,
      item: {
        ...result.item,
        requestedQuantity: quantity,
        sellQuantity,
        craftsRequired,
      },
      materials: result.materials.map((material) => ({
        ...material,
        totalQuantity: material.quantityPerCraft * craftsRequired,
        estimatedTotalCost:
          material.cheapestUnitPrice === undefined
            ? undefined
            : material.cheapestUnitPrice *
              material.quantityPerCraft *
              craftsRequired,
        purchasedQuantity: material.quantityPerCraft * craftsRequired,
        surplusQuantity: 0,
        checkoutCost:
          material.cheapestUnitPrice === undefined
            ? undefined
            : material.cheapestUnitPrice *
              material.quantityPerCraft *
              craftsRequired,
        effectiveUnitCost: material.cheapestUnitPrice,
        selectedListings: material.selectedListings?.map((listing) => ({
          ...listing,
          quantity: listing.quantity * craftsRequired,
          totalPrice: listing.totalPrice * craftsRequired,
        })),
      })),
      ...(input.includeChildMaterials
        ? {
            directMaterials: result.materials.map((material) => ({
              ...material,
              totalQuantity: material.quantityPerCraft * craftsRequired,
            })),
          }
        : {}),
      cheapestShoppingList: result.cheapestShoppingList.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          key: item.key
            ? `${item.key}-${craftsRequired}`
            : `${item.itemId}-${item.quantity * craftsRequired}-${item.unitPrice}`,
          quantity: item.quantity * craftsRequired,
          totalPrice: item.totalPrice * craftsRequired,
        })),
        worldTotal: group.worldTotal * craftsRequired,
      })),
      estimatedMaterialCost:
        result.estimatedMaterialCost === null
          ? null
          : result.estimatedMaterialCost * craftsRequired,
      sellEstimate: {
        ...result.sellEstimate,
        totalRevenue:
          result.sellEstimate.unitPrice === null
            ? null
            : result.sellEstimate.unitPrice * sellQuantity,
        taxAmount:
          result.sellEstimate.unitPrice === null
            ? null
            : Math.round(
                result.sellEstimate.unitPrice *
                  sellQuantity *
                  result.sellEstimate.marketTaxRate,
              ),
        netRevenue:
          result.sellEstimate.unitPrice === null
            ? null
            : Math.round(
                result.sellEstimate.unitPrice *
                  sellQuantity *
                  (1 - result.sellEstimate.marketTaxRate),
              ),
      },
      estimatedGrossProfit:
        result.sellEstimate.unitPrice === null ||
        result.estimatedMaterialCost === null
          ? null
          : result.sellEstimate.unitPrice * sellQuantity -
            result.estimatedMaterialCost * craftsRequired,
      estimatedNetProfit:
        result.sellEstimate.unitPrice === null ||
        result.estimatedMaterialCost === null
          ? null
          : Math.round(
              result.sellEstimate.unitPrice *
                sellQuantity *
                (1 - result.sellEstimate.marketTaxRate),
            ) -
            result.estimatedMaterialCost * craftsRequired,
    };
  }

  if (!sessionToken) {
    throw new Error("Admin session is required.");
  }

  return callAdminFunction<MeowketProfitResult>(
    "calculateMeowketProfit",
    sessionToken,
    {
      itemId: input.itemId,
      quantity,
      includeChildMaterials: input.includeChildMaterials === true,
      ownedMaterials: input.ownedMaterials ?? {},
    },
    { timeout: 60_000 },
  );
}

async function localSearch(query: string): Promise<MeowketItemSearchResult[]> {
  try {
    const items = await searchCraftingRecipes(query);
    return items.map((item) => ({
      itemId: item.itemId,
      name: item.itemName,
      ...(getXivapiIconUrl(item.itemIcon)
        ? { iconUrl: getXivapiIconUrl(item.itemIcon) }
        : {}),
      recipeId: item.recipes[0]?.recipeId,
    }));
  } catch {
    const normalizedQuery = query.toLowerCase();
    return MOCK_MEOWKET_SEARCH_RESULTS.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery),
    );
  }
}
