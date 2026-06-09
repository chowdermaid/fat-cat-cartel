import { useState } from "react";
import {
  Calculator,
  Coins,
  HandCoins,
  Loader2,
  PackageSearch,
  TrendingUp,
} from "lucide-react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import type {
  MeowketItemSearchResult,
} from "../types";
import { formatGil } from "../utils/formatting";
import { useStaggeredEntrance } from "../hooks/useMeowketAnimations";
import { useMeowketCalculation } from "../hooks/useMeowketCalculation";
import { useMeowketCart } from "../hooks/useMeowketCart";
import { useMeowketSearch } from "../hooks/useMeowketSearch";
import { useOwnedMaterials } from "../hooks/useOwnedMaterials";
import {
  addToCartTooltip,
  canAddCalculationToCart,
} from "../utils/cartMerging";
import {
  sellEstimateDetail,
  sellEstimateTooltip,
} from "../utils/marketDisplay";
import {
  profitDetail,
  profitToneClass,
  profitTooltip,
  shoppingCartCostTooltip,
  shoppingCostDetail,
} from "../utils/profitDisplay";
import { AddCurrentCraftButton } from "./Cart/AddCurrentCraftButton";
import { MeowketCartPopover } from "./Cart/MeowketCartPopover";
import { ItemSearchDialog } from "./ItemSearchDialog";
import { MarketStatusCard } from "./MarketStatusCard";
import { MaterialsTable } from "./Materials/MaterialsTable";
import { SelectedCraftCard } from "./SelectedCraftCard";
import { MaterialCostByWorldChart } from "./Summary/MaterialCostByWorldChart";
import { ProfitWaterfallChart } from "./Summary/ProfitWaterfallChart";
import { SellRecommendationCard } from "./Summary/SellRecommendationCard";
import { SummaryCard } from "./Summary/SummaryCards";
import { TheDonPanel } from "./TheDonPanel";

export function MeowketBoardPage() {
  const auth = useAdminAuth();
  const {
    query,
    results,
    searchDialogOpen,
    searchError,
    searchLoading,
    setQuery,
    setSearchDialogOpen,
  } = useMeowketSearch(auth.sessionToken);
  const [selectedItem, setSelectedItem] =
    useState<MeowketItemSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [includeChildMaterials, setIncludeChildMaterials] = useState(false);
  const {
    calculate: calculateProfit,
    calculation,
    calculationError,
    calculating,
    lastCalculatedAt,
    resetCalculation,
    setCalculation,
  } = useMeowketCalculation({
    includeChildMaterials,
    quantity,
    selectedItem,
    sessionToken: auth.sessionToken,
    setQuantity,
  });
  const {
    ownedMaterialDisplays,
    ownedMaterials,
    resetOwnedMaterials,
    setMaterialOwned,
  } = useOwnedMaterials({
    onRecalculate: (nextOwnedMaterials) => {
      void calculateProfit(nextOwnedMaterials, { showSuccessToast: false });
    },
  });
  const {
    addCalculationToCart: addCalculationToCartBase,
    cartBatches,
    cartSummary,
    clearCart,
    removeCartBatch,
  } = useMeowketCart();
  const topRowRef = useStaggeredEntrance<HTMLDivElement>(
    "[data-meowket-top-card]",
    [selectedItem?.itemId ?? "empty", calculation?.item.itemId ?? "pending"],
  );
  const resultGridRef = useStaggeredEntrance<HTMLDivElement>(
    "[data-meowket-result-card]",
    [calculation?.item.itemId, calculation?.item.requestedQuantity],
  );

  if (!auth.authed) {
    return (
      <AuthAccessState
        title="Meowket Board"
        description={
          auth.unauthorized
            ? "This page requires a linked character and the Fat Cat Cartel member Discord role."
            : "Login with Discord to verify your linked character and member role."
        }
        error={auth.error}
        checking={auth.checking}
        onLogin={auth.login}
      />
    );
  }

  function selectItem(item: MeowketItemSearchResult) {
    setSelectedItem(item);
    resetCalculation();
    resetOwnedMaterials();
    setSearchDialogOpen(false);
  }

  function calculate(
    ownedOverride = ownedMaterials,
    options: { showSuccessToast?: boolean } = { showSuccessToast: true },
  ) {
    return calculateProfit(ownedOverride, options);
  }

  function addCalculationToCart() {
    addCalculationToCartBase(calculation);
  }
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <HandCoins className="h-7 w-7 text-muted-foreground" />
            Meowket Board
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Embezzle the market! Disclaimer: i'm not responsible for ur gil
            losses if incurred, send complaints to axo
          </p>
        </div>
      </section>

      <div
        ref={topRowRef}
        className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,4fr)]"
      >
        <Card
          data-meowket-top-card
          className="flex h-full min-h-36 items-center"
        >
          <CardContent className="w-full py-3">
            <div className="flex flex-wrap items-center gap-2">
              <SelectedCraftCard
                calculation={calculation}
                selectedItem={selectedItem}
                onOpenSearch={() => setSearchDialogOpen(true)}
              />
              <div className="flex h-8 shrink-0 items-center gap-2">
                <Label htmlFor="meowket-quantity" className="text-xs">
                  Qty
                </Label>
                <Input
                  id="meowket-quantity"
                  className="h-8 w-16"
                  min={1}
                  type="number"
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(Number(event.target.value));
                    setCalculation(null);
                  }}
                />
              </div>
              <div className="flex h-8 shrink-0 items-center gap-2 whitespace-nowrap">
                <Checkbox
                  id="include-child-materials"
                  checked={includeChildMaterials}
                  onCheckedChange={(checked) => {
                    setIncludeChildMaterials(checked === true);
                    setCalculation(null);
                  }}
                />
                <Label htmlFor="include-child-materials" className="text-xs">
                  Child mats
                </Label>
              </div>
              <Button
                type="button"
                className="h-8 shrink-0 px-3 text-xs"
                disabled={!selectedItem || calculating}
                onClick={() => void calculate()}
              >
                {calculating ? "Calculating..." : "Calculate"}
                {calculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div data-meowket-top-card className="h-full">
          <MarketStatusCard
            calculation={calculation}
            lastCalculatedAt={lastCalculatedAt}
          />
        </div>

        <div data-meowket-top-card className="h-full">
          {calculation ? (
            <TheDonPanel calculation={calculation} />
          ) : (
            <div className="h-full min-h-36" />
          )}
        </div>
      </div>

      {calculationError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            {calculationError}
          </CardContent>
        </Card>
      )}

      {calculation ? (
        <section className="space-y-5">
          <div
            ref={resultGridRef}
            className="grid gap-4 xl:grid-cols-[minmax(14rem,0.5fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <div
              data-meowket-result-card
              className="grid h-full grid-rows-3 gap-4"
            >
              <SummaryCard
                detail={shoppingCostDetail(calculation)}
                icon={Coins}
                label="Shopping cart cost"
                value={formatGil(calculation.estimatedMaterialCost)}
                tooltip={shoppingCartCostTooltip(calculation)}
              />
              <SummaryCard
                badge={
                  calculation.sellEstimate.source ===
                  "fallback_world_lowest_listing"
                    ? "No Sophia entries"
                    : undefined
                }
                detail={sellEstimateDetail(calculation)}
                icon={TrendingUp}
                label={
                  calculation.sellEstimate.source ===
                  "fallback_world_lowest_listing"
                    ? `${calculation.sellEstimate.world} fallback estimate`
                    : "Sophia sell estimate"
                }
                value={formatGil(calculation.sellEstimate.unitPrice)}
                tooltip={sellEstimateTooltip(calculation)}
              />
              <SummaryCard
                detail={profitDetail(calculation)}
                icon={Calculator}
                label="Profit"
                value={formatGil(calculation.estimatedNetProfit)}
                valueClassName={profitToneClass(calculation.estimatedNetProfit)}
                tooltip={profitTooltip(calculation)}
              />
            </div>
            <div data-meowket-result-card className="min-w-0">
              <ProfitWaterfallChart calculation={calculation} />
            </div>
            <div data-meowket-result-card className="min-w-0">
              <MaterialCostByWorldChart calculation={calculation} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SellRecommendationCard
              calculation={calculation}
              onRecalculate={() => void calculate()}
            />

            <Card>
              <CardHeader>
                <CardTitle>
                  {includeChildMaterials
                    ? "Flattened materials"
                    : "Direct materials"}
                </CardTitle>
                <CardDescription>
                  Tick owned items to remove them from shopping cart cost.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaterialsTable
                  calculating={calculating}
                  materials={calculation.materials}
                  ownedMaterialDisplays={ownedMaterialDisplays}
                  ownedMaterials={ownedMaterials}
                  onOwnedChange={setMaterialOwned}
                />
              </CardContent>
            </Card>
          </div>

          <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
            <AddCurrentCraftButton
              disabled={!canAddCalculationToCart(calculation)}
              tooltip={addToCartTooltip(calculation)}
              onAdd={addCalculationToCart}
            />
            <MeowketCartPopover
              batches={cartBatches}
              summary={cartSummary}
              onClear={clearCart}
              onRemoveBatch={removeCartBatch}
            />
          </div>
        </section>
      ) : (
        <Card>
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <PackageSearch className="h-6 w-6" />
            <p className="text-sm">
              Choose an item, quantity, then calculate market estimate.
            </p>
          </CardContent>
        </Card>
      )}

      {!calculation && cartBatches.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          <MeowketCartPopover
            batches={cartBatches}
            summary={cartSummary}
            onClear={clearCart}
            onRemoveBatch={removeCartBatch}
          />
        </div>
      )}

      <ItemSearchDialog
        error={searchError}
        loading={searchLoading}
        onOpenChange={setSearchDialogOpen}
        onQueryChange={setQuery}
        onSelect={selectItem}
        open={searchDialogOpen}
        query={query}
        results={results}
      />
    </div>
  );
}
