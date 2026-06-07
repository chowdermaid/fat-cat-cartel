# Meowket Board Implementation

Meowket Board is a planned admin-only market profitability dashboard at `/meowketboard`. It helps admins estimate whether a craftable FFXIV item is profitable to craft, buy materials for, and sell on the Materia data center.

The MVP uses XIVAPI item and recipe data plus Universalis market listings. It must use XIVAPI item IDs as the shared item identifier for Universalis. Do not query Universalis with recipe IDs or item names.

Current implementation status:

- `/meowketboard` exists with admin gating, sidebar nav, craft search, quantity controls, optional child-material expansion, and React session-only cart state.
- `searchMeowketItems` returns compact craftable item results from XIVAPI.
- `calculateMeowketProfit` resolves recipes/materials from XIVAPI, fetches batched Universalis market listings, prices whole marketboard stacks, and returns Sophia sell/profit estimates.
- Material pricing is stack-aware: the cart buys whole listings only, may accept cheaper surplus, reports short supply, and uses actual checkout cost for profit.
- Material listings use batched `Oceania` Universalis calls with `listings[].worldName`; Sophia sell estimate uses Sophia listings when available and fallback world pricing when Sophia has no entries.
- Sell confidence uses 30-day Universalis sale history for Sophia, with Oceania history fallback only when Sophia has no recent sales.
- UI uses shadcn components and Recharts chart wrappers for summary cards, The Don confidence panel, sell-price-by-world chart, profit waterfall, per-world material-cost chart, direct-material ownership, and cart route review.

## Current Scope

- Add an admin-only `/meowketboard` page.
- Add `Meowket Board` under the existing Tools section in the sidebar.
- Let an admin search for a craftable item using protected callable `searchMeowketItems`, with the existing `/craftingboard` XIVAPI search behavior and styling as the reference.
- Let an admin choose one item from a search dialog, enter a quantity, optionally include child materials, mark owned materials, and calculate after-tax profit.
- Fetch recipe/material data from XIVAPI and market prices from Universalis through protected callable Functions.
- Keep market and recipe result data in React state only for the current browser session.
- Exclude shards, crystals, and clusters from materials, shopping list, material cost, and profit math.
- Treat price/profit output as an estimate and surface warnings for fallback, stale, missing, or excluded data.

Out of scope for MVP:

- Firebase market history.
- Scheduled market scans.
- Discord alerts.
- Automated polling.
- Watchlists.
- Mirroring XIVAPI or Universalis data into Firebase.
- New Firebase rules or market data paths.

## Route And UI Integration

The page should live at:

```text
src/features/meowket-board/index.tsx
```

Register the route in `src/app/router.tsx`:

```text
/meowketboard
```

Add a sidebar nav item in `src/components/layouts/AppSidebar.tsx` under the existing Tools group:

```text
Meowket Board
```

The sidebar item can be shown with the other Tools links. The page itself must enforce admin access.

The page should use compact dashboard layout patterns from existing admin and tooling surfaces:

- Search input with loading state.
- Search dialog with loading state.
- Search results with item name and icon when available.
- Compact selected item summary on the main dashboard.
- Quantity input.
- `Include child materials` checkbox or toggle.
- Calculate button.
- Summary cards for shopping cart cost, Sophia sell estimate, and profit.
- Tax-adjusted Sophia sell recommendation, margin, per-craft cost/profit, and last-check timestamp.
- Owned material checkboxes inside the material table that remove full required quantities after recalculation.
- React-only multi-craft cart with add/remove/clear batch actions and route review.
- Recharts dashboard cards for sell price by world, profit waterfall, and material cost by world.
- Direct/flattened material table with stack-aware buy quantities, surplus, actual cost, effective unit cost, world, and status.
- Cart route grouped by world in teleport order: Bismarck, Ravana, Sephirot, Zurvan, Sophia.
- Warnings section.
- Empty and error states.
- Mobile-friendly layout and dark mode support.

## Admin Auth And Callables

Use the existing admin auth/session model. Do not create a new auth system.

Frontend:

- Gate the page with `useAdminAuth`.
- Show the existing `AuthAccessState` pattern when checking, logged out, or unauthorized.
- Use `callAdminFunction` for meowket callables.
- Pass the existing admin session token with callable requests.

Functions:

- Export protected callable Functions from `functions/src/index.ts`.
- Call `requireAdminSession` before any XIVAPI or Universalis work.
- Use `HttpsError` for validation, auth, upstream, and timeout failures.
- Keep returned payloads compact before sending them back to the browser.

Stub or local dev mode can use static mock data for UI work. Production behavior must not depend on client-side secrets or direct browser calls for meowket external API requests.

## Market Scope And Future Data Centers

The first market scope is Materia:

```ts
const MARKET_SCOPES = {
  materia: {
    label: "Materia",
    worlds: ["Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan"],
    targetSellWorld: "Sophia",
  },
} as const;
```

MVP default:

```ts
const DEFAULT_MARKET_SCOPE = "materia";
```

Treat Sophia as the target sell world. Treat the other Materia worlds as potential buy worlds, while still showing Sophia material prices for comparison.

Future data centers and worlds should be added to the market scope config instead of hardcoding world lists throughout UI, calculation, or Functions logic. Calculation input may later accept a scope key, but MVP can default to Materia and keep the scope internal.

## Callable API Contract

Suggested callables:

```ts
searchMeowketItems(query: string): Promise<MeowketItemSearchResult[]>

calculateMeowketProfit(input: {
  itemId: number;
  quantity: number;
  includeChildMaterials?: boolean;
}): Promise<MeowketProfitResult>
```

Suggested compact shared types:

```ts
type MeowketItemSearchResult = {
  itemId: number;
  name: string;
  iconUrl?: string;
  levelItem?: number;
  recipeId?: number;
};

type MeowketWorld =
  | "Bismarck"
  | "Ravana"
  | "Sephirot"
  | "Sophia"
  | "Zurvan";

type WorldPrice = {
  world: MeowketWorld;
  lowestPricePerUnit: number | null;
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

type SelectedListing = {
  world: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type MeowketMaterial = {
  itemId: number;
  name: string;
  iconUrl?: string;
  quantityPerCraft: number;
  totalQuantity: number;
  category:
    | "ingredient"
    | "crystal"
    | "cluster"
    | "precraft"
    | "base_material"
    | "unknown";
  depth?: number;
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

type MeowketProfitResult = {
  item: {
    itemId: number;
    recipeId?: number;
    name: string;
    iconUrl?: string;
    requestedQuantity: number;
    crafterJob?: string;
    recipeLevel?: number;
    yieldPerCraft?: number;
    craftsRequired: number;
    sellQuantity: number;
  };
  finalItemPrices: WorldPrice[];
  materials: MeowketMaterial[];
  cheapestShoppingList: {
    world: string;
    items: {
      itemId: number;
      name: string;
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
```

The frontend should own display formatting only. Recipe resolution, market lookup, sell estimate selection, material totals, and profit math should happen in the callable.

## XIVAPI Usage

Reuse or adapt the `/craftingboard` search and recipe normalization pattern. Do not invent a second incompatible search model when the existing crafting board behavior can be reused.

Important identity rules:

- Search the `Recipe` sheet for craftable output items.
- Return the output item ID from `ItemResult.row_id`.
- Return recipe IDs only for recipe lookup and display.
- Use item IDs when calling Universalis.
- Validate that selected items are craftable and marketable where practical.

Direct materials are implemented first. Recursive child material support is optional through `includeChildMaterials` and performs bounded recipe lookup by output item ID.

## Universalis Usage

Use Universalis endpoints with comma-separated item IDs in the `itemIds` path parameter. Batch item IDs where practical.

Rules:

- Fetch market prices for the final crafted item and all material item IDs.
- Fetch material listings through `GET /api/v2/Oceania/{itemIds}` with `listings=100`, `entries=0`, and `listings.worldName` included in `fields`.
- Use `listings[].worldName` to split Oceania listings into Bismarck, Ravana, Sephirot, Sophia, and Zurvan material prices.
- Deduplicate item IDs before requesting prices.
- Fetch up to 100 item IDs per request where practical.
- If more than 100 item IDs are needed, chunk requests in batches of 100.
- Keep the returned payload compact.
- Keep one Sophia-only final-item fallback lookup when the Oceania response has no Sophia listing for the crafted item.
- Fetch sell confidence from `GET /api/v2/history/Sophia/{itemId}` for the last 30 days; fallback to `GET /api/v2/history/Oceania/{itemId}` only when Sophia has no recent sales.

Do not call Universalis once per material when a batch request can answer the same question.

## Profit Rules

Calculation:

- `craftsRequired = ceil(requestedQuantity / recipeYield)`.
- `totalQuantity = materialQuantityPerCraft * craftsRequired`.
- For each material, buy whole marketboard listings only.
- Choose the lowest total gil cart that satisfies the required quantity across available Oceania listings; allow surplus when a surplus stack is cheaper than exact alternatives.
- Tie-break by lower surplus, then lower effective unit cost.
- Also calculate each material's per-world whole-stack checkout cost for Bismarck, Ravana, Sephirot, Sophia, and Zurvan so the UI can chart all worlds.
- `estimatedMaterialCost` is the sum of selected material checkout costs after owned material reductions.
- `sellQuantity = craftsRequired * yieldPerCraft`.
- `totalRevenue = sellEstimate.unitPrice * sellQuantity`.
- `taxAmount = totalRevenue * marketTaxRate`.
- `netRevenue = totalRevenue - taxAmount`.
- UI label `Profit` means `estimatedNetProfit = netRevenue - estimatedMaterialCost`.

Keep `estimatedGrossProfit` in the callable for compatibility, but do not label it as primary UI profit. Surplus receives no resale or reuse credit in this pass. MVP does not account for undercuts, stale listings, unsold stock, travel time, transfer costs, or market friction.

If any required material has unknown price data, include it in the material table, show a warning, and mark total cost/profit as partial or `null`. Do not hide unknowns.

## Sell Estimate Rules

Sophia is preferred as the sell world.

If Sophia has active listings:

- Show Sophia lowest listing.
- Also calculate the average of the lowest 20 Sophia listings where available.
- Use average lowest 20 as the preferred sell estimate when at least 20 listings exist.
- If fewer than 20 listings exist, use the lowest Sophia listing and warn that the sample size is small.

If Sophia has no active listing:

- Use the lowest active listing from another Materia world as fallback.
- Clearly label the result as fallback pricing, not Sophia sell price.
- Add warning text: `No Sophia listing found. Showing fallback listing from {world}. Profit is less reliable.`

If no world has an active listing, set sell estimate and profit to `null`.

## Child Materials

Recursive material support:

- Use `includeChildMaterials`.
- Defaults to `false`.
- Walks child recipes by `ItemResult=<itemId>`.
- Avoids infinite recursion with seen recipe IDs.
- Uses max recipe depth.
- Deduplicates and merges flattened material item IDs before Universalis lookup.
- Preserves direct recipe materials in the callable result when child expansion is enabled.
- Produces flattened priced materials and shopping list for the estimate.

Suggested max depth:

```ts
const MAX_RECIPE_DEPTH = 5;
```

If max depth is reached or a loop is detected, the affected item is treated as a purchasable precraft and a warning is returned.

## Cost Impact

Firebase cost should stay near zero except existing admin auth reads and callable invocations.

Do:

- Keep market results in React state only.
- Call external APIs only when admin searches or clicks calculate.
- Use callable Functions for external API access.
- Batch Universalis IDs.
- Return compact results.
- Timeout external API calls instead of letting the callable hang indefinitely.

Do not:

- Store Universalis responses in Firebase.
- Store XIVAPI responses in Firebase.
- Mirror item databases into Firebase.
- Use `onValue` for market data.
- Add polling.
- Add scheduled scans.
- Add Firebase market rules or paths.

Expected production cost per calculation is one admin callable invocation, one XIVAPI recipe lookup for the selected item, optional extra XIVAPI recipe lookups when child materials are enabled, and batched Universalis requests across the configured worlds. No RTDB market reads or writes should be introduced.

## Implementation Phases

Phase 1:

- Add `/meowketboard` admin-only route and page shell.
- Add sidebar item under Tools.
- Add search input, quantity input, calculate button, and placeholder result layout.
- Reference `/craftingboard` search UI/style.
- Use static mock data.
- Build app.

Phase 2:

- Add or reuse callable search for XIVAPI item search.
- Prefer reusing crafting board search normalization where practical.
- Return compact craftable item results with item IDs suitable for Universalis.
- Wire frontend search to callable.
- Add loading and error states.
- Build app and Functions.

Phase 3:

- Add `calculateMeowketProfit`.
- Resolve selected item recipe and direct materials from XIVAPI.
- Return recipe/material structure without Universalis prices.
- Show item, recipe, quantities, crystals, clusters, and warnings.
- Build app and Functions.

Phase 4:

- Implemented: `calculateMeowketProfit` fetches Universalis current listings for final item and direct materials.
- Implemented: item IDs are deduplicated and fetched in Oceania chunks of up to 100 IDs.
- Implemented: stack-aware material pricing, Sophia sell estimate, fallback sell estimate, shopping list, material checkout cost, and after-tax profit.
- Build app and Functions.

Phase 5:

- Implemented: optional child material support through `Include child materials`.
- Implemented: max recursion depth of 5 and recipe loop detection.
- Implemented: flattened base material merge and direct material preservation.
- Implemented: deduplicated material IDs before Universalis lookup, with existing 100-ID chunks.
- Build app and Functions.

Phase 6:

- Implemented: stale market data warnings for final item and cheapest material prices older than 24 hours.
- Implemented: external API timeout wrapper for XIVAPI and Universalis requests.
- Implemented: sell estimate details, material per-world checkout costs, warnings, empty states, and callable error states.
- Existing callable errors cover missing recipe, non-craftable item, API failure, missing material prices, no Sophia listing, fallback pricing, and small Sophia sample size.
- Build app and Functions.

## Verification

Doc-only changes need no build.

For future implementation work, run:

```bash
npm run build
```

```bash
cd functions
npm run build
```

Manual checks:

- Logged-out user cannot access `/meowketboard`.
- Non-admin member cannot access `/meowketboard`.
- Boss or Underpaw admin can access the page.
- Search waits for input, shows loading, and handles empty/error states.
- Calculate button requires a selected item and quantity of at least 1.
- Universalis calls use item IDs, not names or recipe IDs.
- Sell recommendation shows a world comparison chart for final item lowest listing and average low 20.
- Material cost by world shows Bismarck, Ravana, Sephirot, Zurvan, and Sophia in route order.
- Sophia sell estimate and fallback warnings match the documented rules.
- Unknown material prices remain visible and affect total/profit state.
- UI works on mobile and desktop in dark and light mode.
