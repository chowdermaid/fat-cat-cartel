import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  Calculator,
  Coins,
  HandCoins,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  ShoppingCart,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import professorCat from "@/assets/fatcat/professorcat.png";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import {
  calculateMeowketProfit,
  type MeowketItemSearchResult,
  type MeowketMaterial,
  type MeowketProfitResult,
  searchMeowketItems,
} from "./api/meowketFunctions";

const CART_ROUTE_WORLDS = [
  "Bismarck",
  "Ravana",
  "Sephirot",
  "Zurvan",
  "Sophia",
] as const;

const TARGET_SELL_WORLD = "Sophia";
const MEOWKET_TOAST_POSITION = "top-right" as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useEntranceAnimation<T extends HTMLElement>(
  deps: readonly unknown[],
  options: { duration?: number; translateY?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [options.translateY ?? 8, 0],
      duration: options.duration ?? 300,
      easing: "easeOutQuad",
    });
  }, deps);

  return ref;
}

function useStaggeredEntrance<T extends HTMLElement>(
  selector: string,
  deps: readonly unknown[],
  options: { delayStep?: number; duration?: number; translateY?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const targets = ref.current.querySelectorAll(selector);
    if (targets.length === 0) return;
    animate(targets, {
      opacity: [0, 1],
      translateY: [options.translateY ?? 8, 0],
      delay: stagger(options.delayStep ?? 50),
      duration: options.duration ?? 300,
      easing: "easeOutQuad",
    });
  }, deps);

  return ref;
}

export function MeowketBoardPage() {
  const auth = useAdminAuth();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MeowketItemSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedItem, setSelectedItem] =
    useState<MeowketItemSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [includeChildMaterials, setIncludeChildMaterials] = useState(false);
  const [calculation, setCalculation] = useState<MeowketProfitResult | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const [ownedMaterials, setOwnedMaterials] = useState<Record<number, number>>(
    {},
  );
  const [ownedMaterialDisplays, setOwnedMaterialDisplays] = useState<
    Record<number, { world: string; summary: string }>
  >({});
  const [lastCalculatedAt, setLastCalculatedAt] = useState<number | null>(null);
  const [cartBatches, setCartBatches] = useState<MeowketCartBatch[]>([]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!searchDialogOpen || trimmedQuery.length < 2) {
        setResults([]);
        setSearchLoading(false);
        setSearchError("");
        return;
      }

      setSearchLoading(true);
      setSearchError("");
      searchMeowketItems(auth.sessionToken, trimmedQuery)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setResults([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Meowket item search failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [auth.sessionToken, query, searchDialogOpen]);

  const cartSummary = useMemo(
    () => buildCartSummary(cartBatches),
    [cartBatches],
  );
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
    setCalculation(null);
    setCalculationError("");
    setOwnedMaterials({});
    setOwnedMaterialDisplays({});
    setLastCalculatedAt(null);
    setSearchDialogOpen(false);
  }

  async function calculate(
    ownedOverride = ownedMaterials,
    options: { showSuccessToast?: boolean } = { showSuccessToast: true },
  ) {
    if (!selectedItem) return;
    setCalculating(true);
    setCalculationError("");
    try {
      const result = await calculateMeowketProfit(auth.sessionToken, {
        itemId: selectedItem.itemId,
        quantity: Math.max(1, Math.floor(quantity || 1)),
        includeChildMaterials,
        ownedMaterials: ownedOverride,
      });
      setQuantity(result.item.requestedQuantity);
      setCalculation(result);
      setLastCalculatedAt(Date.now());
      if (options.showSuccessToast !== false) {
        toast.success(`${result.item.name} calculated.`, {
          description: `${formatQuantity(result.item.sellQuantity)} crafted item${result.item.sellQuantity === 1 ? "" : "s"} • ${formatGil(result.estimatedMaterialCost)} material cost`,
          position: MEOWKET_TOAST_POSITION,
        });
      }
    } catch (error) {
      setCalculation(null);
      const message =
        error instanceof Error ? error.message : "Meowket calculation failed.";
      setCalculationError(
        message,
      );
      toast.error("Meowket calculation failed.", {
        description: message,
        position: MEOWKET_TOAST_POSITION,
      });
    } finally {
      setCalculating(false);
    }
  }

  function setMaterialOwned(material: MeowketMaterial, checked: boolean) {
    const requiredQuantity =
      material.requiredQuantity ?? material.totalQuantity;
    const nextOwnedMaterials = { ...ownedMaterials };
    if (checked) {
      nextOwnedMaterials[material.itemId] = requiredQuantity;
      setOwnedMaterialDisplays((current) => ({
        ...current,
        [material.itemId]: {
          world: material.cheapestWorld ?? "-",
          summary: selectedWorldSummary(material),
        },
      }));
    } else {
      delete nextOwnedMaterials[material.itemId];
      setOwnedMaterialDisplays((current) => {
        const next = { ...current };
        delete next[material.itemId];
        return next;
      });
    }
    setOwnedMaterials(nextOwnedMaterials);
    toast.success(
      checked ? `${material.name} marked owned.` : `${material.name} unmarked.`,
      {
        description: checked
          ? "Material cost will be removed from this craft."
          : "Material cost will be added back to this craft.",
        position: MEOWKET_TOAST_POSITION,
      },
    );
    void calculate(nextOwnedMaterials, { showSuccessToast: false });
  }

  function addCalculationToCart() {
    if (!calculation || !canAddCalculationToCart(calculation)) return;
    setCartBatches((current) => [
      ...current,
      buildCartBatch(calculation, current.length),
    ]);
    toast.success(`${calculation.item.name} added to cart route.`, {
      description: `${formatGil(calculation.estimatedMaterialCost)} materials • ${formatGil(calculation.estimatedNetProfit)} profit`,
      position: MEOWKET_TOAST_POSITION,
    });
  }

  function removeCartBatch(batchId: string) {
    const batch = cartBatches.find((item) => item.id === batchId);
    setCartBatches((current) =>
      current.filter((batch) => batch.id !== batchId),
    );
    if (batch) {
      toast.success(`${batch.itemName} removed from cart route.`, {
        position: MEOWKET_TOAST_POSITION,
      });
    }
  }

  function clearCart() {
    if (cartBatches.length === 0) return;
    setCartBatches([]);
    toast.success("Cart route cleared.", {
      position: MEOWKET_TOAST_POSITION,
    });
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
              <SelectedItemSummary
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
          <MarketStatusSnapshot
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
              <ProfitWaterfallCard calculation={calculation} />
            </div>
            <div data-meowket-result-card className="min-w-0">
              <MaterialCostByWorldChart calculation={calculation} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <EstimateDetailsCard
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
            <CartReviewPopover
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
          <CartReviewPopover
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

function ItemSearchDialog({
  error,
  loading,
  onOpenChange,
  onQueryChange,
  onSelect,
  open,
  query,
  results,
}: {
  error: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (item: MeowketItemSearchResult) => void;
  open: boolean;
  query: string;
  results: MeowketItemSearchResult[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Choose craftable item</DialogTitle>
          <DialogDescription>Search recipes by name.</DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-none border-t">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search item..."
          />
          <ScrollArea
            className="max-h-80 min-h-0 min-w-0"
            viewportClassName="max-h-80"
          >
            <CommandList className="max-h-none overflow-visible">
              {query.trim().length < 2 ? (
                <CommandEmpty>Type at least 2 characters.</CommandEmpty>
              ) : loading ? (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching XIVAPI...
                </div>
              ) : error ? (
                <div className="px-4 py-6 text-sm text-destructive">
                  {error}
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>No craftable items found.</CommandEmpty>
              ) : (
                results.map((item) => (
                  <CommandItem
                    key={item.itemId}
                    className="cursor-pointer"
                    value={`${item.itemId}-${item.name}`}
                    onSelect={() => onSelect(item)}
                  >
                    <SearchIcon item={item} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.levelItem
                          ? `Item Lv. ${item.levelItem}`
                          : "Craftable item"}
                      </span>
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandList>
          </ScrollArea>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function SelectedItemSummary({
  calculation,
  onOpenSearch,
  selectedItem,
}: {
  calculation: MeowketProfitResult | null;
  onOpenSearch: () => void;
  selectedItem: MeowketItemSearchResult | null;
}) {
  const item = calculation?.item;
  return (
    <div className="flex min-w-48 flex-1 items-center gap-2">
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpenSearch}
        aria-label="Choose item"
      >
        {selectedItem ? (
          <SearchIcon item={selectedItem} unframed />
        ) : (
          <Search className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {selectedItem?.name ?? "No item selected"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item ? "Calculated craft" : "Choose craftable item"}
        </p>
      </div>
      <MathTooltip content="Choose another craftable item">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onOpenSearch}
          aria-label="Choose another craftable item"
        >
          <Search className="h-4 w-4" />
        </Button>
      </MathTooltip>
    </div>
  );
}

function MarketStatusSnapshot({
  calculation,
  lastCalculatedAt,
}: {
  calculation: MeowketProfitResult | null;
  lastCalculatedAt: number | null;
}) {
  const fallbackEstimate =
    calculation?.sellEstimate.source === "fallback_world_lowest_listing";
  const staleCount =
    calculation?.warnings.filter((warning) =>
      warning.includes("older than 24 hours"),
    ).length ?? 0;
  const materialStatuses =
    calculation?.materials.map((material) => materialSupplyStatus(material)) ??
    [];
  const hasShortSupply = materialStatuses.some(
    (status) => status.label === "Short supply",
  );
  const hasListingCapRisk = materialStatuses.some(
    (status) => status.label === "Listing cap risk",
  );
  const statusLabel = !calculation
    ? "Unchecked"
    : hasShortSupply
      ? "Short supply"
      : fallbackEstimate
        ? "Fallback"
        : staleCount > 0
          ? "Stale prices"
          : hasListingCapRisk
            ? "Listing cap risk"
            : "Ready";
  const statusVariant = !calculation
    ? "outline"
    : hasShortSupply
      ? "destructive"
      : fallbackEstimate || staleCount > 0 || hasListingCapRisk
        ? "secondary"
        : "default";

  return (
    <div className="flex h-full min-h-36 flex-col justify-center rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Market status</p>
          <p className="text-xs text-muted-foreground">
            {calculation
              ? "Current pricing data quality"
              : "Calculate to check market data"}
          </p>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <StatusMetric
          label="Checked"
          value={lastCalculatedAt ? formatRelativeTime(lastCalculatedAt) : "-"}
          description="Last refresh"
        />
        <StatusMetric
          label="Material supply"
          value={
            !calculation
              ? "-"
              : hasShortSupply
                ? "Short"
                : hasListingCapRisk
                  ? "Cap risk"
                  : "Covered"
          }
          description="Can buy missing mats"
        />
        <StatusMetric
          label="Price age"
          value={
            !calculation ? "-" : staleCount > 0 ? `${staleCount} stale` : "OK"
          }
          description="Fresh data under 24 hrs old"
        />
      </div>
    </div>
  );
}

function StatusMetric({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
function TheDonPanel({ calculation }: { calculation: MeowketProfitResult }) {
  const confidence = calculation.sellConfidence;
  const panelRef = useEntranceAnimation<HTMLDivElement>(
    [confidence.verdict, confidence.label, confidence.salesCount],
    { translateY: 6, duration: 260 },
  );
  return (
    <div ref={panelRef} className="h-full min-h-36 overflow-hidden">
      <div className="grid h-full gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(15rem,0.95fr)] md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={professorCat}
              alt=""
              className="h-24 w-24 rounded-lg border bg-background object-cover md:h-28 md:w-28"
              loading="lazy"
            />
            <span className="absolute -bottom-2 left-2 rounded-md border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              The Don
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                The Don says
              </p>
              <Badge variant={confidenceBadgeVariant(confidence.label)}>
                {confidenceLabel(confidence.label)}
              </Badge>
            </div>
            <p className="mt-2 text-lg font-semibold leading-tight">
              {confidenceVerdictLabel(confidence.verdict)}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {confidence.demandComment}
            </p>
          </div>
        </div>
        <Separator className="hidden h-28 md:block" orientation="vertical" />
        <Separator className="md:hidden" />
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <DonMetric
            label="30d sales"
            value={formatQuantity(confidence.salesCount)}
          />
          <DonMetric
            label="Units sold"
            value={formatQuantity(confidence.unitsSold)}
          />
          <DonMetric
            label="Sales/day"
            value={formatDecimal(confidence.salesPerDay)}
          />
          <DonMetric
            label="Units/day"
            value={formatDecimal(confidence.unitsPerDay)}
          />
          <DonMetric
            label="Last sale"
            value={formatSaleTime(confidence.lastSaleTime)}
          />
          <DonMetric
            label="Median"
            value={formatGil(confidence.medianSalePrice)}
          />
        </div>
      </div>
    </div>
  );
}

function DonMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-2 py-1.5">
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function EstimateDetailsCard({
  calculation,
  onRecalculate,
}: {
  calculation: MeowketProfitResult;
  onRecalculate: () => void;
}) {
  const netProfit = calculation.estimatedNetProfit;
  const netRevenue = calculation.sellEstimate.netRevenue;
  const margin =
    typeof netProfit === "number" &&
    typeof netRevenue === "number" &&
    netRevenue > 0
      ? (netProfit / netRevenue) * 100
      : null;
  const costPerCraft =
    typeof calculation.estimatedMaterialCost === "number"
      ? calculation.estimatedMaterialCost / calculation.item.craftsRequired
      : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Sell recommendation</CardTitle>
          <CardDescription>
            Price after market tax, margin, and per-craft yield.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRecalculate}
          >
            Refresh prices
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="rounded-lg border bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              List around
            </p>
            <p className="mt-2 text-3xl font-bold">
              {formatGil(calculation.sellEstimate.recommendedUnitPrice)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {TARGET_SELL_WORLD} •{" "}
              {formatQuantity(calculation.item.sellQuantity)} items •{" "}
              {formatPercent(calculation.sellEstimate.marketTaxRate * 100)} tax
              included
            </p>
          </div>

          <div className="grid gap-2 rounded-lg border p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Revenue equation
              </p>
              <p className="text-xs text-muted-foreground">
                Taxed Sophia revenue minus actual buy cost.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] 2xl:items-center">
              <EquationPart
                label="Sell revenue"
                value={formatGil(calculation.sellEstimate.totalRevenue)}
              />
              <EquationOperator value="-" />
              <EquationPart
                label="Tax"
                value={formatGil(calculation.sellEstimate.taxAmount)}
              />
              <EquationOperator value="-" />
              <EquationPart
                label="Materials"
                value={formatGil(calculation.estimatedMaterialCost)}
                tooltip={shoppingCartCostTooltip(calculation)}
              />
              <EquationOperator value="=" />
              <EquationPart
                label="Profit"
                value={formatGil(netProfit)}
                valueClassName={profitToneClass(netProfit)}
                tooltip={profitTooltip(calculation)}
                strong
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <InlineMetric
            label="Requested minimum"
            value={formatQuantity(calculation.item.requestedQuantity)}
          />
          <InlineMetric
            label="Crafts needed"
            value={formatQuantity(calculation.item.craftsRequired)}
          />
          <InlineMetric
            label="Sell quantity"
            value={formatQuantity(calculation.item.sellQuantity)}
          />
          <InlineMetric
            label="After-tax revenue"
            value={formatGil(netRevenue)}
          />
          <InlineMetric label="Margin" value={formatPercent(margin)} />
          <InlineMetric
            label="Cost per craft"
            value={formatGil(costPerCraft)}
          />
        </div>
        <SellPriceByWorldChart calculation={calculation} />
      </CardContent>
    </Card>
  );
}

function AddCurrentCraftButton({
  disabled,
  onAdd,
  tooltip,
}: {
  disabled: boolean;
  onAdd: () => void;
  tooltip: string;
}) {
  return (
    <MathTooltip content={tooltip}>
      <Button
        type="button"
        className="gap-2 shadow-lg"
        disabled={disabled}
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Add current craft
      </Button>
    </MathTooltip>
  );
}

function CartReviewPopover({
  batches,
  onClear,
  onRemoveBatch,
  summary,
}: {
  batches: MeowketCartBatch[];
  onClear: () => void;
  onRemoveBatch: (batchId: string) => void;
  summary: MeowketCartSummary;
}) {
  const hasBatches = batches.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className="gap-2 shadow-lg"
          variant="secondary"
        >
          <ShoppingCart className="h-4 w-4" />
          Cart route
          <Badge
            variant="outline"
            className="border-border bg-muted text-muted-foreground"
          >
            {batches.length} / {formatGil(summary.materialCost)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="w-[48rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <ScrollArea
          className="max-h-[80vh] min-h-0 min-w-0"
          viewportClassName="max-h-[80vh]"
        >
          <div className="min-w-0 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">Cart route</p>
                <p className="text-xs text-muted-foreground">
                  Accumulated missing materials across added crafts.
                </p>
                <CartWarningBadges badges={summary.warningBadges} />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasBatches}
                onClick={onClear}
              >
                Clear cart
              </Button>
            </div>

            {!hasBatches ? (
              <p className="text-sm text-muted-foreground">
                Add a calculated craft to start a cart route.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat
                    label="Remaining material cost"
                    value={formatGil(summary.materialCost)}
                  />
                  <MathTooltip content={cartSellValueTooltip(summary)}>
                    <div>
                      <MiniStat
                        label="Estimated sell value"
                        value={formatGil(summary.sellRevenue)}
                      />
                    </div>
                  </MathTooltip>
                  <MathTooltip content={cartProfitTooltip(summary)}>
                    <div>
                      <MiniStat
                        label="Profit"
                        value={formatGil(summary.netProfit)}
                        valueClassName={profitToneClass(summary.netProfit)}
                      />
                    </div>
                  </MathTooltip>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-medium">Crafted output</p>
                  </div>
                  <ScrollArea
                    className="max-h-56 min-h-0 min-w-0"
                    viewportClassName="max-h-56"
                  >
                    <div className="min-w-0 divide-y">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CartLineIcon iconUrl={batch.itemIconUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {batch.itemName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested{" "}
                                {formatQuantity(batch.requestedQuantity)}, sells{" "}
                                {formatQuantity(batch.sellQuantity)} at{" "}
                                {formatGil(batch.sellUnitPrice)} each.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 sm:text-right">
                            <div>
                              <p
                                className={`text-sm font-medium ${profitToneClass(batch.netProfit)}`}
                              >
                                {formatGil(batch.netProfit)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                profit
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${batch.itemName} from cart`}
                              onClick={() => onRemoveBatch(batch.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {summary.groups.map((group, index) => (
                    <div key={group.world} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Stop {index + 1}
                          </p>
                          <p className="font-medium">{group.world}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.items.length} stack
                            {group.items.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <MathTooltip content={cartWorldTotalTooltip(group)}>
                          <p className="text-sm font-medium">
                            {formatGil(group.worldTotal)}
                          </p>
                        </MathTooltip>
                      </div>
                      <ScrollArea
                        className="mt-3 max-h-64 min-h-0 min-w-0"
                        viewportClassName="max-h-64"
                      >
                        <div className="min-w-0 space-y-2 pr-3">
                          {group.items.map((item) => (
                            <div
                              key={item.key}
                              className="rounded-md border bg-background/60 p-2"
                            >
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <CartLineIcon
                                    iconUrl={item.iconUrl}
                                    size="sm"
                                  />
                                  <MathTooltip content={item.name}>
                                    <p className="min-w-0 truncate text-xs font-medium">
                                      {formatQuantity(item.quantity)}x{" "}
                                      {item.name}
                                    </p>
                                  </MathTooltip>
                                </div>
                                <MathTooltip
                                  content={`${formatGil(item.unitPrice)} each`}
                                >
                                  <p className="shrink-0 text-right text-xs font-medium tabular-nums">
                                    {formatGil(item.totalPrice)}
                                  </p>
                                </MathTooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function CartWarningBadges({
  badges,
}: {
  badges: Array<{
    label: string;
    title: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }>;
}) {
  if (badges.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant} title={badge.title}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

function MaterialsTable({
  calculating,
  materials,
  onOwnedChange,
  ownedMaterialDisplays,
  ownedMaterials,
}: {
  calculating: boolean;
  materials: MeowketMaterial[];
  onOwnedChange: (material: MeowketMaterial, checked: boolean) => void;
  ownedMaterialDisplays: Record<number, { world: string; summary: string }>;
  ownedMaterials: Record<number, number>;
}) {
  const materialRowsRef = useStaggeredEntrance<HTMLTableSectionElement>(
    "tr[data-meowket-material-row]",
    [
      materials
        .map(
          (material) =>
            `${material.itemId}:${material.checkoutCost ?? "none"}:${material.ownedQuantity ?? 0}:${ownedMaterials[material.itemId] ?? 0}`,
        )
        .join("|"),
    ],
    { delayStep: 24, duration: 240, translateY: 5 },
  );

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No costed materials returned for this recipe.
      </p>
    );
  }

  return (
    <ScrollArea
      className="max-w-full min-h-0 min-w-0"
      viewportClassName="max-w-full"
    >
      <div className="min-w-[58rem] pr-3">
        <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[18rem]">Material</TableHead>
          <TableHead className="text-right">Per craft</TableHead>
          <TableHead className="text-right">Need</TableHead>
          <TableHead className="text-right">Buy</TableHead>
          <TableHead className="text-right">Surplus</TableHead>
          <TableHead>World</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actual cost</TableHead>
          <TableHead className="text-right">Effective/unit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody ref={materialRowsRef}>
        {materials.map((material) => {
          const need = material.requiredQuantity ?? material.totalQuantity;
          const owned = (ownedMaterials[material.itemId] ?? 0) >= need;
          const buy = owned
            ? 0
            : (material.purchasedQuantity ?? material.totalQuantity);
          const surplus = owned
            ? 0
            : (material.surplusQuantity ??
              Math.max(0, buy - material.totalQuantity));
          const actualCost = owned ? 0 : (material.estimatedTotalCost ?? null);
          const effectiveUnitCost = owned ? 0 : material.effectiveUnitCost;
          const ownedDisplay = ownedMaterialDisplays[material.itemId];
          return (
            <TableRow
              key={material.itemId}
              data-meowket-material-row
              className={owned ? "bg-primary/5 text-muted-foreground" : ""}
            >
              <TableCell>
                <div className="flex min-w-0 items-center gap-2">
                  <Checkbox
                    checked={owned}
                    disabled={calculating}
                    aria-label={`Mark ${material.name} as owned`}
                    onCheckedChange={(checked) =>
                      onOwnedChange(material, checked === true)
                    }
                  />
                  <MaterialIcon material={material} />
                  <span className="min-w-0">
                    <span className="block truncate">{material.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {materialLabel(material)}
                      {material.depth ? `, depth ${material.depth}` : ""}
                      {owned ? ", owned" : ""}
                    </span>
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatQuantity(material.quantityPerCraft)}
              </TableCell>
              <TableCell className="text-right">
                {formatQuantity(need)}
              </TableCell>
              <TableCell className="text-right">
                {formatQuantity(buy)}
              </TableCell>
              <TableCell className="text-right">
                <MathTooltip
                  content={
                    owned ? ownedTooltip(material) : surplusTooltip(material)
                  }
                >
                  <span>{formatQuantity(surplus)}</span>
                </MathTooltip>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>
                    {owned
                      ? (ownedDisplay?.world ?? material.cheapestWorld ?? "-")
                      : (material.cheapestWorld ?? "-")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {owned
                      ? (ownedDisplay?.summary ??
                        selectedWorldSummary(material))
                      : selectedWorldSummary(material)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {owned ? (
                  <MathTooltip content={ownedTooltip(material)}>
                    <Badge variant="default">Owned</Badge>
                  </MathTooltip>
                ) : (
                  <SupplyBadge material={material} />
                )}
              </TableCell>
              <TableCell className="text-right">
                <MathTooltip
                  content={
                    owned ? ownedTooltip(material) : actualCostTooltip(material)
                  }
                >
                  <span>{formatGil(actualCost)}</span>
                </MathTooltip>
              </TableCell>
              <TableCell className="text-right">
                <MathTooltip
                  content={
                    owned
                      ? ownedTooltip(material)
                      : effectiveUnitTooltip(material)
                  }
                >
                  <span>{formatGil(effectiveUnitCost)}</span>
                </MathTooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}

function SellPriceByWorldChart({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const data = CART_ROUTE_WORLDS.map((world) => {
    const price = calculation.finalItemPrices.find(
      (entry) => entry.world === world,
    );
    return {
      world,
      lowest: price?.lowestPricePerUnit ?? null,
      averageLow20: price?.averageLowestTwentyPricePerUnit ?? null,
    };
  });
  const hasPrices = data.some(
    (entry) =>
      typeof entry.lowest === "number" ||
      typeof entry.averageLow20 === "number",
  );

  return (
    <div className="flex h-full min-h-72 flex-1 flex-col rounded-lg border bg-muted/10 p-4">
      <div className="mb-3 flex shrink-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sell price by world
          </p>
          <p className="text-sm text-muted-foreground">
            Lowest listing and average low 20 across Materia.
          </p>
        </div>
      </div>
      {hasPrices ? (
        <ChartContainer
          className="min-h-56 flex-1"
          config={{
            lowest: { label: "Lowest", color: "var(--chart-2)" },
            averageLow20: { label: "Avg low 20", color: "var(--chart-3)" },
          }}
        >
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="world" tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={shortGilWithUnit}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={<ChartTooltipContent valueFormatter={formatChartGil} />}
              cursor={false}
            />
            <Bar
              dataKey="lowest"
              fill="var(--color-lowest)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="averageLow20"
              fill="var(--color-averageLow20)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex min-h-56 flex-1 items-center justify-center rounded-md border text-sm text-muted-foreground">
          No sell listings found across Materia.
        </div>
      )}
    </div>
  );
}

function ProfitWaterfallCard({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const data = profitWaterfallData(calculation);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Total Profit</CardTitle>
        <CardDescription>
          Sale value, tax, material spend, and final profit.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ChartContainer
          className="min-h-72 flex-1"
          config={{
            range: { label: "Gil", color: "var(--chart-1)" },
          }}
        >
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 12, right: 12, bottom: 8, left: 12 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={shortGilWithUnit}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={82}
            />
            <ChartTooltip content={<WaterfallTooltip />} cursor={false} />
            <Bar dataKey="range" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function MaterialCostByWorldChart({
  calculation,
}: {
  calculation: MeowketProfitResult;
}) {
  const { config, data, keys } = materialCostByWorldData(calculation);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Material cost by world</CardTitle>
        <CardDescription>
          Whole-stack material cost if bought entirely on each world.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {data.length === 0 ? (
          <div className="flex min-h-72 flex-1 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No complete material cart.
          </div>
        ) : (
          <ChartContainer className="min-h-72 flex-1" config={config}>
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="world" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={shortGilWithUnit}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent valueFormatter={formatChartGil} />
                }
                cursor={false}
              />
              {keys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="materials"
                  fill={`var(--color-${key})`}
                  radius={index === keys.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

type ProfitWaterfallDatum = {
  name: string;
  range: [number, number];
  value: number;
  fill: string;
  detail: string;
};

function profitWaterfallData(
  calculation: MeowketProfitResult,
): ProfitWaterfallDatum[] {
  const sellRevenue = calculation.sellEstimate.totalRevenue ?? 0;
  const tax = calculation.sellEstimate.taxAmount ?? 0;
  const netRevenue = calculation.sellEstimate.netRevenue ?? sellRevenue - tax;
  const materials = calculation.estimatedMaterialCost ?? 0;
  const profit = calculation.estimatedNetProfit ?? netRevenue - materials;

  return [
    {
      name: "Sell revenue",
      range: [0, sellRevenue],
      value: sellRevenue,
      fill: "var(--chart-2)",
      detail: `${formatGil(calculation.sellEstimate.unitPrice)} x ${formatQuantity(calculation.item.sellQuantity)} = ${formatGil(sellRevenue)}`,
    },
    {
      name: "Tax",
      range: [netRevenue, sellRevenue],
      value: -tax,
      fill: "var(--destructive)",
      detail: `${formatGil(sellRevenue)} x ${formatPercent(calculation.sellEstimate.marketTaxRate * 100)} = ${formatGil(tax)}`,
    },
    {
      name: "Materials",
      range: [profit, netRevenue],
      value: -materials,
      fill: "var(--chart-4)",
      detail: shoppingCartCostTooltip(calculation),
    },
    {
      name: "Profit",
      range: profit >= 0 ? [0, profit] : [profit, 0],
      value: profit,
      fill: profitChartColor(profit),
      detail: profitTooltip(calculation),
    },
  ];
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ProfitWaterfallDatum }>;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  return (
    <div className="grid max-w-72 gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <p className="font-medium">{item.name}</p>
      <p className="font-mono font-medium">{formatGil(item.value)}</p>
      <p className="text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function materialCostByWorldData(calculation: MeowketProfitResult): {
  config: ChartConfig;
  data: Array<Record<string, number | string>>;
  keys: string[];
} {
  const materialTotals = new Map<string, { label: string; total: number }>();
  for (const material of calculation.materials) {
    const total = material.worldPrices.reduce(
      (sum, price) =>
        sum + (typeof price.checkoutCost === "number" ? price.checkoutCost : 0),
      0,
    );
    materialTotals.set(`${material.itemId}-${material.name}`, {
      label: material.name,
      total,
    });
  }

  const topMaterials = Array.from(materialTotals.entries())
    .sort((left, right) => right[1].total - left[1].total)
    .slice(0, 5);
  const keyByMaterial = new Map(
    topMaterials.map(([materialKey], index) => [materialKey, `m${index}`]),
  );
  const hasOther = materialTotals.size > topMaterials.length;
  const keys = [
    ...topMaterials.map((_, index) => `m${index}`),
    ...(hasOther ? ["other"] : []),
  ];
  const config: ChartConfig = Object.fromEntries([
    ...topMaterials.map(([, material], index) => [
      `m${index}`,
      { label: material.label, color: `var(--chart-${(index % 5) + 1})` },
    ]),
    ...(hasOther
      ? [["other", { label: "Other", color: "var(--muted-foreground)" }]]
      : []),
  ]);

  const data = CART_ROUTE_WORLDS.map((world) => {
    const row: Record<string, number | string> = { world };
    for (const key of keys) row[key] = 0;
    for (const material of calculation.materials) {
      const price = material.worldPrices.find((entry) => entry.world === world);
      const checkoutCost = price?.checkoutCost;
      if (typeof checkoutCost !== "number") continue;
      const materialKey = `${material.itemId}-${material.name}`;
      const dataKey = keyByMaterial.get(materialKey) ?? "other";
      if (dataKey in row) {
        row[dataKey] = Number(row[dataKey]) + checkoutCost;
      }
    }
    return row;
  });

  return { config, data, keys };
}

function SummaryCard({
  badge,
  detail,
  icon: Icon,
  label,
  tooltip,
  value,
  valueClassName,
}: {
  badge?: string;
  detail?: string;
  icon: React.ElementType;
  label: string;
  tooltip?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-32 items-start gap-3 pt-6">
        <div className="rounded-lg border bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            {badge ? <Badge variant="destructive">{badge}</Badge> : null}
          </div>
          <MathTooltip content={tooltip}>
            <p
              className={`truncate text-2xl font-semibold ${valueClassName ?? ""}`}
            >
              {value}
            </p>
          </MathTooltip>
          {detail ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {detail}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SupplyBadge({ material }: { material: MeowketMaterial }) {
  const status = materialSupplyStatus(material);
  return (
    <MathTooltip content={status.title}>
      <Badge variant={status.variant}>{status.label}</Badge>
    </MathTooltip>
  );
}

function MathTooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content?: string | null;
}) {
  if (!content) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent className="max-w-80">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EquationPart({
  label,
  strong = false,
  tooltip,
  value,
  valueClassName,
}: {
  label: string;
  strong?: boolean;
  tooltip?: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <MathTooltip content={tooltip}>
        <p
          className={`truncate font-mono ${strong ? "text-base font-semibold xl:text-lg" : "font-medium"} ${valueClassName ?? ""}`}
          title={value}
        >
          {value}
        </p>
      </MathTooltip>
    </div>
  );
}

function EquationOperator({ value }: { value: string }) {
  return (
    <span className="hidden text-center text-muted-foreground 2xl:block">
      {value}
    </span>
  );
}

function InlineMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`truncate text-sm font-medium ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}

function SearchIcon({
  item,
  unframed = false,
}: {
  item: MeowketItemSearchResult;
  unframed?: boolean;
}) {
  const className = unframed
    ? "flex h-full w-full shrink-0 items-center justify-center overflow-hidden"
    : "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted";
  return (
    <span className={className}>
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
      )}
    </span>
  );
}

function MaterialIcon({ material }: { material: MeowketMaterial }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
      {material.iconUrl ? (
        <img
          src={material.iconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
      )}
    </span>
  );
}

function CartLineIcon({
  iconUrl,
  size = "md",
}: {
  iconUrl?: string;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <span
      className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted`}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <PackageSearch className="h-4 w-4 text-muted-foreground" />
      )}
    </span>
  );
}

type ShoppingRouteGroup = MeowketProfitResult["cheapestShoppingList"][number];
type ShoppingRouteItem = ShoppingRouteGroup["items"][number];
type CartShoppingRouteItem = ShoppingRouteItem & { iconUrl?: string };
type CartShoppingRouteGroup = Omit<ShoppingRouteGroup, "items"> & {
  items: CartShoppingRouteItem[];
};

type MeowketCartBatch = {
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
};

type MeowketCartGroup = {
  world: string;
  items: Array<CartShoppingRouteItem & { key: string }>;
  worldTotal: number;
};

type MeowketCartSummary = {
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

function buildShoppingRouteGroups(
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

function buildCartShoppingList(
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

function canAddCalculationToCart(calculation: MeowketProfitResult) {
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

function addToCartTooltip(calculation: MeowketProfitResult) {
  if (canAddCalculationToCart(calculation)) {
    return "Adds current missing material stack buys to the shared cart.";
  }
  return "Cart needs complete material supply, sell revenue, and profit math.";
}

function buildCartBatch(
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

function buildCartSummary(batches: MeowketCartBatch[]): MeowketCartSummary {
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

function materialSupplyStatus(material: MeowketMaterial): {
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

function worldSortIndex(world: string) {
  const index = CART_ROUTE_WORLDS.indexOf(
    world as (typeof CART_ROUTE_WORLDS)[number],
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function selectedWorldSummary(material: MeowketMaterial) {
  const listings = material.selectedListings ?? [];
  const worlds = Array.from(new Set(listings.map((listing) => listing.world)));
  if (worlds.length === 0) return "No cart";
  if (worlds.length === 1) {
    return `${listings.length} stack${listings.length === 1 ? "" : "s"}`;
  }
  return `${worlds.length} worlds, ${listings.length} stacks`;
}

function actualCostTooltip(material: MeowketMaterial) {
  if (
    !material.selectedListings?.length ||
    material.estimatedTotalCost === undefined
  ) {
    return "No complete cart found in fetched listings.";
  }
  return `${stackMath(material.selectedListings)} = ${formatGil(material.estimatedTotalCost)}`;
}

function effectiveUnitTooltip(material: MeowketMaterial) {
  if (
    material.effectiveUnitCost === undefined ||
    material.estimatedTotalCost === undefined
  ) {
    return "No complete cart found in fetched listings.";
  }
  return `${formatGil(material.estimatedTotalCost)} / ${formatQuantity(material.totalQuantity)} needed = ${formatGil(material.effectiveUnitCost)}`;
}

function surplusTooltip(material: MeowketMaterial) {
  const bought = material.purchasedQuantity ?? material.totalQuantity;
  const surplus =
    material.surplusQuantity ?? Math.max(0, bought - material.totalQuantity);
  return `Bought ${formatQuantity(bought)} - needed ${formatQuantity(material.totalQuantity)} = ${formatQuantity(surplus)} extra`;
}

function ownedTooltip(material: MeowketMaterial) {
  const needed = material.requiredQuantity ?? material.totalQuantity;
  return `Owned covers ${formatQuantity(needed)} needed, buy cost removed.`;
}

function shoppingCartCostTooltip(calculation: MeowketProfitResult) {
  if (calculation.estimatedMaterialCost === null) {
    return "At least one material has no complete shopping cart.";
  }
  const parts = calculation.materials
    .filter((material) => typeof material.estimatedTotalCost === "number")
    .map(
      (material) =>
        `${material.name}: ${formatGil(material.estimatedTotalCost)}`,
    );
  return `${parts.slice(0, 6).join(" + ")}${parts.length > 6 ? " + ..." : ""} = ${formatGil(calculation.estimatedMaterialCost)}`;
}

function sellEstimateTooltip(calculation: MeowketProfitResult) {
  const price = calculation.finalItemPrices.find(
    (entry) => entry.world === calculation.sellEstimate.world,
  );
  const source =
    calculation.sellEstimate.source === "fallback_world_lowest_listing"
      ? "No Sophia entries. Using fallback world lowest listing."
      : calculation.sellEstimate.source === "sophia_average_lowest_twenty"
        ? "Using Sophia average of lowest 20 listings."
        : "Using Sophia lowest listing.";
  return [
    source,
    `World: ${calculation.sellEstimate.world}`,
    `Lowest: ${formatGil(price?.lowestPricePerUnit ?? null)}`,
    `Avg low 20: ${formatGil(price?.averageLowestTwentyPricePerUnit ?? null)}`,
    `Available: ${price?.quantityAvailable?.toLocaleString() ?? "-"}`,
    `Listings: ${price?.listingCount?.toLocaleString() ?? "-"}`,
    `Updated: ${formatUploadTime(price?.lastUploadTime)}`,
  ].join(" ");
}

function profitTooltip(calculation: MeowketProfitResult) {
  if (
    calculation.sellEstimate.netRevenue === null ||
    calculation.estimatedMaterialCost === null ||
    calculation.estimatedNetProfit === null
  ) {
    return "Profit needs taxed revenue and a complete shopping cart.";
  }
  return `${formatGil(calculation.sellEstimate.netRevenue)} after tax - ${formatGil(calculation.estimatedMaterialCost)} shopping cart cost = ${formatGil(calculation.estimatedNetProfit)} profit`;
}

function confidenceBadgeVariant(
  label: MeowketProfitResult["sellConfidence"]["label"] | undefined,
) {
  if (label === "likely") return "default";
  if (label === "moderate") return "secondary";
  if (label === "risky") return "destructive";
  return "outline";
}

function confidenceLabel(
  label: MeowketProfitResult["sellConfidence"]["label"],
) {
  const labels = {
    likely: "Good signal",
    moderate: "Watch margin",
    risky: "High risk",
    unknown: "Missing data",
  } satisfies Record<MeowketProfitResult["sellConfidence"]["label"], string>;
  return labels[label];
}

function confidenceVerdictLabel(
  verdict: MeowketProfitResult["sellConfidence"]["verdict"],
) {
  const labels = {
    worth_crafting: "Worth crafting",
    thin_margin: "Thin margin",
    not_worth: "Not worth crafting",
    missing_prices: "Missing prices",
  } satisfies Record<MeowketProfitResult["sellConfidence"]["verdict"], string>;
  return labels[verdict];
}

function shoppingCostDetail(calculation: MeowketProfitResult) {
  const stackCount = calculation.cheapestShoppingList.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const worldCount = calculation.cheapestShoppingList.length;
  return `${stackCount} stack${stackCount === 1 ? "" : "s"} across ${worldCount} world${worldCount === 1 ? "" : "s"}. Gil needed now.`;
}

function sellEstimateDetail(calculation: MeowketProfitResult) {
  const price = calculation.finalItemPrices.find(
    (entry) => entry.world === calculation.sellEstimate.world,
  );
  return `Avg low 20 ${formatGil(price?.averageLowestTwentyPricePerUnit ?? null)}. ${price?.listingCount?.toLocaleString() ?? "-"} listings.`;
}

function profitDetail(calculation: MeowketProfitResult) {
  const netRevenue = calculation.sellEstimate.netRevenue;
  const margin =
    typeof calculation.estimatedNetProfit === "number" &&
    typeof netRevenue === "number" &&
    netRevenue > 0
      ? (calculation.estimatedNetProfit / netRevenue) * 100
      : null;
  const perCraft =
    typeof calculation.estimatedNetProfit === "number"
      ? calculation.estimatedNetProfit / calculation.item.craftsRequired
      : null;
  return `${formatPercent(margin)} margin. ${formatGil(perCraft)} per craft.`;
}

function profitToneClass(value: number | null | undefined) {
  if (typeof value !== "number") return "text-muted-foreground";
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-destructive";
  return "text-muted-foreground";
}

function profitChartColor(value: number | null | undefined) {
  if (typeof value !== "number") return "var(--muted-foreground)";
  if (value > 0) return "rgb(5 150 105)";
  if (value < 0) return "var(--destructive)";
  return "var(--muted-foreground)";
}

function cartSellValueTooltip(summary: MeowketCartSummary) {
  return `Batch sell revenues = ${formatGil(summary.sellRevenue)}`;
}

function cartProfitTooltip(summary: MeowketCartSummary) {
  return `${formatGil(summary.netRevenue)} after tax - ${formatGil(summary.materialCost)} shopping cart cost = ${formatGil(summary.netProfit)} profit`;
}

function cartWorldTotalTooltip(group: MeowketCartGroup) {
  const parts = group.items.map(
    (item) => `${item.name}: ${formatGil(item.totalPrice)}`,
  );
  return `${parts.slice(0, 6).join(" + ")}${parts.length > 6 ? " + ..." : ""} = ${formatGil(group.worldTotal)}`;
}

function stackMath(listings: NonNullable<MeowketMaterial["selectedListings"]>) {
  return listings
    .slice(0, 8)
    .map(
      (listing) =>
        `${formatQuantity(listing.quantity)} x ${formatGil(listing.unitPrice).replace(" gil", "")}`,
    )
    .join(" + ")
    .concat(listings.length > 8 ? " + ..." : "");
}

function materialLabel(material: MeowketMaterial) {
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

function formatGil(value: number | null | undefined) {
  return typeof value === "number"
    ? `${Math.round(value).toLocaleString()} gil`
    : "Unavailable";
}

function formatDecimal(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatSaleTime(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return formatRelativeTime(value * 1000);
}

function shortGil(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (absolute >= 1_000_000) {
    return `${sign}${(absolute / 1_000_000).toFixed(1)}m`;
  }
  if (absolute >= 1_000) {
    return `${sign}${Math.round(absolute / 1_000)}k`;
  }
  return `${Math.round(value)}`;
}

function shortGilWithUnit(value: number) {
  return `${shortGil(value)} gil`;
}

function formatChartGil(value: unknown) {
  return typeof value === "number" ? formatGil(value) : String(value ?? "-");
}

function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number"
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
    : "-";
}

function formatRelativeTime(value: number) {
  const seconds = Math.max(0, Math.round((Date.now() - value) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatUploadTime(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
