export type MeowketItemSearchResult = {
  itemId: number;
  name: string;
  iconUrl?: string;
  levelItem?: number;
  recipeId?: number;
};

export type SelectedListing = {
  listingKey: string;
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
  availableListings?: SelectedListing[];
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
      listingKey?: string;
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

export type ShoppingRouteGroup =
  MeowketProfitResult["cheapestShoppingList"][number];
export type ShoppingRouteItem = ShoppingRouteGroup["items"][number];
export type MeowketCartItemStatus = "open" | "bought" | "missing";
export type CartShoppingRouteItem = ShoppingRouteItem & {
  iconUrl?: string;
  listingKey: string;
  sourceBatchId: string;
  status: MeowketCartItemStatus;
  replacementForKey?: string;
  note?: string;
};
export type CartShoppingRouteGroup = Omit<ShoppingRouteGroup, "items"> & {
  items: CartShoppingRouteItem[];
};

export type MeowketCartBatch = {
  id: string;
  addedAt: number;
  itemId: number;
  itemName: string;
  itemIconUrl?: string;
  requestedQuantity: number;
  sellQuantity: number;
  sellUnitPrice: number | null;
  materialCost: number;
  sellRevenue: number;
  netRevenue: number;
  grossProfit: number;
  netProfit: number;
  sellSource: MeowketProfitResult["sellEstimate"]["source"];
  warnings: string[];
  materialStatuses: string[];
  shoppingList: CartShoppingRouteGroup[];
  replacementListings: Record<number, SelectedListing[]>;
};

export type MeowketCartGroup = {
  world: string;
  items: Array<CartShoppingRouteItem & { key: string }>;
  worldTotal: number;
  openCount: number;
};

export type MeowketCartSummary = {
  materialCost: number;
  sellRevenue: number;
  netRevenue: number;
  grossProfit: number;
  netProfit: number;
  groups: MeowketCartGroup[];
  warningBadges: Array<{
    label: string;
    title: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }>;
};
