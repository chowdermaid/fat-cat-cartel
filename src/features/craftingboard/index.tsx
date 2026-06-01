import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  CheckCircle2,
  Check,
  ChevronsUpDown,
  Clock3,
  ExternalLink,
  Hammer,
  Inbox,
  ListPlus,
  Loader2,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useMembers } from "@/hooks/useMembers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type CraftingRecipe,
  type CraftingSearchItem,
  getXivapiIconUrl,
  resolveRecipeSnapshot,
  searchCraftingRecipes,
} from "./api/xivapi";
import {
  acceptCraftingRequest,
  completeCraftingRequest,
  createCraftingRequest,
  useCraftingRequests,
} from "./api/useCraftingRequests";
import type {
  CraftingRecipeSnapshot,
  CraftingMaterialStatus,
  CraftingEligibleCrafter,
  CraftingRequestDashboardItem,
  CraftingRequestDashboardRecord,
  CraftingRequestMember,
  CraftingSelectedItem,
} from "./types";
import type { Member } from "@/types";

const materialStatusLabels: Record<CraftingMaterialStatus, string> = {
  requester_has_all_materials: "I have all the materials",
  requester_has_some_materials: "I have some of the materials",
  crafter_to_provide_materials: "Crafter to provide materials",
};

const jobIconMap = import.meta.glob<string>("../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const CRAFTING_JOB_ICON_SLUG: Record<string, string> = {
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
};

type RequestSectionConfig = {
  title: string;
  description: string;
  emptyText: string;
  icon: React.ElementType;
  accent: string;
  laneClass: string;
};

const sectionConfigs = {
  open: {
    title: "Open requests",
    description: "Waiting for a crafter to pick them up.",
    emptyText: "No open requests.",
    icon: Inbox,
    accent: "text-primary",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  inProgress: {
    title: "In progress",
    description: "Locked to one crafter and being worked on.",
    emptyText: "Nothing is in progress.",
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  completed: {
    title: "Completed",
    description: "Finished requests (30 days)",
    emptyText: "No completed requests from the last 30 days.",
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    laneClass: "",
  },
} satisfies Record<string, RequestSectionConfig>;

const SEARCH_DELAY_MS = 300;
const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]";

function handleNestedScrollAreaWheel(event: React.WheelEvent<HTMLDivElement>) {
  const viewport = event.currentTarget.querySelector<HTMLElement>(
    SCROLL_AREA_VIEWPORT_SELECTOR,
  );
  if (!viewport) return;

  const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
  if (maxScrollTop <= 0) return;

  let deltaY = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) deltaY *= 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    deltaY *= viewport.clientHeight;
  }

  const nextScrollTop = Math.min(
    Math.max(viewport.scrollTop + deltaY, 0),
    maxScrollTop,
  );

  if (nextScrollTop === viewport.scrollTop) return;

  viewport.scrollTop = nextScrollTop;
  event.preventDefault();
  event.stopPropagation();
}

export function CraftingBoardPage() {
  const { data, loading, error, isEmpty, reload } = useCraftingRequests();
  const auth = useAdminAuth();
  const members = useMembers();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CraftingSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedSource, setSelectedSource] =
    useState<CraftingSearchItem | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState<CraftingSelectedItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [requestItems, setRequestItems] = useState<CraftingSelectedItem[]>([]);
  const [materialStatus, setMaterialStatus] = useState<
    CraftingMaterialStatus | ""
  >("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [commissionOffered, setCommissionOffered] = useState(false);
  const [commissionGil, setCommissionGil] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchCacheRef = useRef(new Map<string, CraftingSearchItem[]>());
  const requestStatusRef = useRef<Map<
    string,
    CraftingRequestDashboardRecord["status"]
  > | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  useEffect(() => {
    if (!pageRef.current || loading) return;

    animate(pageRef.current.querySelectorAll(".crafting-section"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(70),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [loading]);

  useEffect(() => {
    if (!pageRef.current || loading) return;

    const current = new Map<string, CraftingRequestDashboardRecord["status"]>();
    for (const request of [
      ...data.open,
      ...data.inProgress,
      ...data.completed,
    ]) {
      current.set(request.id, request.status);
    }

    if (!requestStatusRef.current) {
      requestStatusRef.current = current;
      return;
    }

    const changedIds = Array.from(current.entries())
      .filter(([id, status]) => requestStatusRef.current?.get(id) !== status)
      .map(([id]) => id);

    if (changedIds.length > 0) {
      animate(
        changedIds
          .map((id) =>
            pageRef.current?.querySelector(`[data-request-id="${id}"]`),
          )
          .filter(Boolean),
        {
          opacity: [0, 1],
          scale: [0.97, 1],
          translateY: [12, 0],
          duration: 420,
          easing: "easeOutBack",
        },
      );
    }

    requestStatusRef.current = current;
  }, [data.open, data.inProgress, data.completed, loading]);

  useEffect(() => {
    const controller = new AbortController();
    const cachedResults = searchCacheRef.current.get(normalizedQuery);
    const delay =
      normalizedQuery.length < 2 || cachedResults ? 0 : SEARCH_DELAY_MS;

    const timer = window.setTimeout(() => {
      if (normalizedQuery.length < 2) {
        setResults([]);
        setSearchLoading(false);
        setSearchError("");
        return;
      }

      if (cachedResults) {
        setResults(cachedResults);
        setSearchLoading(false);
        setSearchError("");
        return;
      }

      setSearchLoading(true);
      setSearchError("");
      searchCraftingRecipes(query, controller.signal)
        .then((items) => {
          searchCacheRef.current.set(normalizedQuery, items);
          setResults(items);
        })
        .catch((requestError: unknown) => {
          if (
            requestError instanceof DOMException &&
            requestError.name === "AbortError"
          ) {
            return;
          }
          setResults([]);
          setSearchError("XIVAPI search failed. Try again in a moment.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, query]);

  useEffect(() => {
    if (!selectedSource || selectedRecipeId === null) {
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError("");
      return;
    }

    const recipe = selectedSource.recipes.find(
      (entry) => entry.recipeId === selectedRecipeId,
    );
    const controller = new AbortController();
    setPreviewLoading(true);
    setPreviewError("");

    resolveRecipeSnapshot(selectedRecipeId, controller.signal)
      .then((recipeSnapshot) => {
        if (controller.signal.aborted) return;
        setPreview({
          itemId: selectedSource.itemId,
          itemName: selectedSource.itemName,
          itemIcon: selectedSource.itemIcon,
          quantity,
          selectedRecipeId,
          recipeSnapshot: recipeSnapshot as CraftingRecipeSnapshot,
        });
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setPreview(null);
        setPreviewError("Recipe expansion failed. XIVAPI may be busy.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });

    if (recipe) {
      setPreview((current) =>
        current && current.selectedRecipeId === recipe.recipeId
          ? current
          : null,
      );
    }

    return () => controller.abort();
  }, [selectedSource, selectedRecipeId, quantity]);

  const selectedRecipe = useMemo(
    () =>
      selectedSource?.recipes.find(
        (recipe) => recipe.recipeId === selectedRecipeId,
      ) ?? null,
    [selectedRecipeId, selectedSource],
  );

  function selectItem(item: CraftingSearchItem) {
    setSelectedSource(item);
    setSelectedRecipeId(item.recipes[0]?.recipeId ?? null);
    setQuantity(1);
    setSearchOpen(false);
  }

  function addPreviewToRequest() {
    if (!preview) return;
    setFormError("");
    setRequestItems((items) => {
      const existingIndex = items.findIndex(
        (item) => item.selectedRecipeId === preview.selectedRecipeId,
      );
      if (existingIndex >= 0) {
        return items.map((item, index) =>
          index === existingIndex
            ? { ...preview, quantity: item.quantity + preview.quantity }
            : item,
        );
      }
      return [...items, preview];
    });
  }

  function updateRequestItemQuantity(recipeId: number, nextQuantity: number) {
    setRequestItems((items) =>
      items.map((item) =>
        item.selectedRecipeId === recipeId
          ? { ...item, quantity: Math.max(1, Math.floor(nextQuantity || 1)) }
          : item,
      ),
    );
  }

  function removeRequestItem(recipeId: number) {
    setRequestItems((items) =>
      items.filter((item) => item.selectedRecipeId !== recipeId),
    );
  }

  async function submitRequest() {
    setFormError("");
    if (requestItems.length === 0) {
      setFormError("Add at least one craftable item.");
      return;
    }
    if (!materialStatus) {
      setFormError("Choose material status.");
      return;
    }
    if (!auth.session) {
      setFormError("Member login is required.");
      return;
    }
    const trimmedCommissionGil = commissionGil.trim();
    const commissionGilValue = trimmedCommissionGil
      ? Number(trimmedCommissionGil)
      : null;
    if (
      commissionOffered &&
      commissionGilValue !== null &&
      (!Number.isInteger(commissionGilValue) || commissionGilValue < 1)
    ) {
      setFormError("Commission gil must be a positive whole number.");
      return;
    }

    setCreating(true);
    try {
      await createCraftingRequest({
        sessionToken: auth.sessionToken,
        requester: {
          lodestoneId: auth.session.lodestoneId,
          discordUserId: auth.session.discordUserId,
          characterName: auth.session.characterName,
          fcRank: auth.session.fcRank,
          avatarUrl: auth.session.avatarUrl ?? null,
        },
        materialStatus,
        items: requestItems,
        commission: commissionOffered
          ? { offered: true, gil: commissionGilValue }
          : null,
      });
      setRequestItems([]);
      setMaterialStatus("");
      setCommissionOffered(false);
      setCommissionGil("");
      setRequestDialogOpen(false);
      await reload();
      toast.success("Crafting request created.");
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Crafting request could not be created.";
      setFormError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  const currentMember = auth.session
    ? {
        lodestoneId: auth.session.lodestoneId,
        discordUserId: auth.session.discordUserId,
        characterName: auth.session.characterName,
        fcRank: auth.session.fcRank,
        avatarUrl: auth.session.avatarUrl ?? null,
      }
    : null;

  async function runLifecycleAction(
    requestId: string,
    action: "accept" | "complete",
  ) {
    if (!currentMember) {
      toast.error("Member login is required.");
      return;
    }
    setActionRequestId(requestId);
    try {
      const payload = {
        sessionToken: auth.sessionToken,
        member: currentMember,
        isAdmin: auth.session?.isAdmin === true,
        requestId,
      };
      if (action === "accept") {
        await acceptCraftingRequest(payload);
        toast.success("Request accepted.");
      } else {
        await completeCraftingRequest(payload);
        toast.success("Request completed.");
      }
      await reload();
    } catch (requestError) {
      toast.error(
        requestError instanceof Error
          ? requestError.message
          : "Request update failed.",
      );
      await reload();
    } finally {
      setActionRequestId(null);
    }
  }

  return (
    <div ref={pageRef} className="space-y-7">
      <section className="crafting-section space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-serif">Crafting Requests</h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Track FC crafting requests, assigned crafters, material readiness,
              and recipe snapshots.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Metric icon={Inbox} label="Open" value={data.open.length} />
            <Metric
              icon={Clock3}
              label="In progress"
              value={data.inProgress.length}
            />
            <Metric
              icon={CheckCircle2}
              label="Done"
              value={data.stats.completedTotal}
            />
            <Button type="button" onClick={() => setRequestDialogOpen(true)}>
              Request item
              <ListPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <CreateRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        query={query}
        onQueryChange={setQuery}
        normalizedQuery={normalizedQuery}
        results={results}
        searchLoading={searchLoading}
        searchError={searchError}
        selectedSource={selectedSource}
        selectedRecipeId={selectedRecipeId}
        onRecipeChange={setSelectedRecipeId}
        selectedRecipe={selectedRecipe}
        preview={preview}
        previewLoading={previewLoading}
        previewError={previewError}
        previewQuantity={quantity}
        onPreviewQuantityChange={setQuantity}
        onSelectItem={selectItem}
        onAddPreview={addPreviewToRequest}
        items={requestItems}
        materialStatus={materialStatus}
        commissionOffered={commissionOffered}
        commissionGil={commissionGil}
        creating={creating}
        error={formError}
        isAuthed={Boolean(auth.session)}
        onMaterialStatusChange={setMaterialStatus}
        onCommissionOfferedChange={setCommissionOffered}
        onCommissionGilChange={setCommissionGil}
        onQuantityChange={updateRequestItemQuantity}
        onRemove={removeRequestItem}
        onSubmit={submitRequest}
      />

      {loading ? (
        <LoadingBoard />
      ) : error ? (
        <Card className="crafting-section border-destructive/40 bg-destructive/5">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium">Could not load crafting requests</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {isEmpty && (
            <Card className="crafting-section border-dashed">
              <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
                <PackageCheck className="h-9 w-9 text-muted-foreground/70" />
                <div>
                  <p className="font-medium">No crafting requests yet</p>
                  <p className="text-sm text-muted-foreground">
                    Created requests will appear here after members submit them.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-5 xl:grid-cols-[3fr_3fr_1fr]">
            <RequestSection
              config={sectionConfigs.open}
              requests={data.open}
              currentMember={currentMember}
              members={members}
              isAdmin={auth.session?.isAdmin === true}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
            />
            <RequestSection
              config={sectionConfigs.inProgress}
              requests={data.inProgress}
              currentMember={currentMember}
              members={members}
              isAdmin={auth.session?.isAdmin === true}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
            />
            <RequestSection
              config={sectionConfigs.completed}
              requests={data.completed}
              currentMember={currentMember}
              members={members}
              isAdmin={auth.session?.isAdmin === true}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
              compactCards
            />
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function CreateRequestDialog({
  open,
  onOpenChange,
  searchOpen,
  onSearchOpenChange,
  query,
  onQueryChange,
  normalizedQuery,
  results,
  searchLoading,
  searchError,
  selectedSource,
  selectedRecipeId,
  onRecipeChange,
  selectedRecipe,
  preview,
  previewLoading,
  previewError,
  previewQuantity,
  onPreviewQuantityChange,
  onSelectItem,
  onAddPreview,
  items,
  materialStatus,
  commissionOffered,
  commissionGil,
  creating,
  error,
  isAuthed,
  onMaterialStatusChange,
  onCommissionOfferedChange,
  onCommissionGilChange,
  onQuantityChange,
  onRemove,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  normalizedQuery: string;
  results: CraftingSearchItem[];
  searchLoading: boolean;
  searchError: string;
  selectedSource: CraftingSearchItem | null;
  selectedRecipeId: number | null;
  onRecipeChange: (recipeId: number | null) => void;
  selectedRecipe: CraftingRecipe | null;
  preview: CraftingSelectedItem | null;
  previewLoading: boolean;
  previewError: string;
  previewQuantity: number;
  onPreviewQuantityChange: (value: number) => void;
  onSelectItem: (item: CraftingSearchItem) => void;
  onAddPreview: () => void;
  items: CraftingSelectedItem[];
  materialStatus: CraftingMaterialStatus | "";
  commissionOffered: boolean;
  commissionGil: string;
  creating: boolean;
  error: string;
  isAuthed: boolean;
  onMaterialStatusChange: (value: CraftingMaterialStatus) => void;
  onCommissionOfferedChange: (value: boolean) => void;
  onCommissionGilChange: (value: string) => void;
  onQuantityChange: (recipeId: number, quantity: number) => void;
  onRemove: (recipeId: number) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-7xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl">Request item crafted</DialogTitle>
          <DialogDescription>
            Search an item, preview its recipe, then submit request details.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[min(76vh,52rem)] px-6 pb-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]">
            <div className="space-y-5">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    Find item
                  </CardTitle>
                  <CardDescription>
                    Search craftable outputs. Preview uses XIVAPI snapshots.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Popover open={searchOpen} onOpenChange={onSearchOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={searchOpen}
                        className="h-11 w-full justify-between"
                      >
                        <span className="truncate text-muted-foreground">
                          {selectedSource?.itemName ??
                            "Search craftable item..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[min(28rem,calc(100vw-2rem))] p-0"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={query}
                          onValueChange={onQueryChange}
                          placeholder="Classical Longsword"
                        />
                        <ScrollArea
                          className="h-72"
                          onWheelCapture={handleNestedScrollAreaWheel}
                        >
                          <CommandList className="max-h-none overflow-visible">
                            {normalizedQuery.length < 2 && (
                              <CommandEmpty>
                                Type at least 2 characters.
                              </CommandEmpty>
                            )}
                            {searchLoading && (
                              <div className="space-y-2 p-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                  <SearchSkeleton key={index} />
                                ))}
                              </div>
                            )}
                            {!searchLoading && searchError && (
                              <CommandEmpty>{searchError}</CommandEmpty>
                            )}
                            {!searchLoading &&
                              !searchError &&
                              normalizedQuery.length >= 2 &&
                              results.length === 0 && (
                                <CommandEmpty>
                                  No craftable items found.
                                </CommandEmpty>
                              )}
                            {!searchLoading &&
                              !searchError &&
                              results.length > 0 && (
                                <CommandGroup heading="Craftable items">
                                  {results.map((item) => (
                                    <CommandItem
                                      key={item.itemId}
                                      value={`${item.itemId}-${item.itemName}`}
                                      onSelect={() => onSelectItem(item)}
                                    >
                                      <PreviewIcon icon={item.itemIcon} />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                          {item.itemName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {safeArray(item.recipes).length}{" "}
                                          recipe
                                          {safeArray(item.recipes).length === 1
                                            ? ""
                                            : "s"}
                                        </p>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4",
                                          selectedSource?.itemId === item.itemId
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                          </CommandList>
                        </ScrollArea>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedSource && (
                    <div className="space-y-3">
                      {safeArray(selectedSource.recipes).length > 1 && (
                        <Select
                          value={selectedRecipeId?.toString() ?? ""}
                          onValueChange={(value) =>
                            onRecipeChange(Number(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose recipe" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {safeArray(selectedSource.recipes).map((recipe) => (
                              <SelectItem
                                key={recipe.recipeId}
                                value={recipe.recipeId.toString()}
                              >
                                {recipe.crafter}{" "}
                                {recipe.level !== null
                                  ? `Lv. ${recipe.level}`
                                  : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex justify-center">
                        <QuantityControl
                          value={previewQuantity}
                          onChange={onPreviewQuantityChange}
                          editable={false}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <RecipePreview
                selectedRecipe={selectedRecipe}
                preview={preview}
                loading={previewLoading}
                error={previewError}
                quantity={previewQuantity}
                onAdd={onAddPreview}
              />
            </div>

            <Card className="h-fit lg:sticky lg:top-0">
              <CardHeader>
                <CardTitle className="font-serif text-xl">
                  New Request
                </CardTitle>
                <CardDescription>
                  Add one or more previewed craftable items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No items added yet.
                  </div>
                ) : (
                  <ScrollArea className="max-h-80 pr-3">
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.selectedRecipeId}
                          className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                        >
                          <PreviewIcon icon={item.itemIcon} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {item.itemName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.recipeSnapshot?.crafter ?? "Crafter"}
                              {item.recipeSnapshot?.recipeLevel !== null &&
                              item.recipeSnapshot?.recipeLevel !== undefined
                                ? ` Lv. ${item.recipeSnapshot.recipeLevel}`
                                : ""}
                            </p>
                          </div>
                          <QuantityControl
                            value={item.quantity}
                            onChange={(quantity) =>
                              onQuantityChange(item.selectedRecipeId, quantity)
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemove(item.selectedRecipeId)}
                            aria-label={`Remove ${item.itemName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Separator />
                <div className="space-y-4">
                  <div>
                    <h3 className="font-serif text-xl font-semibold">
                      Request Details
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Material status is required.
                    </p>
                  </div>
                  <Select
                    value={materialStatus}
                    onValueChange={(value) =>
                      onMaterialStatusChange(value as CraftingMaterialStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Material status" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(materialStatusLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>

                  <div className="space-y-3 rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="crafting-commission"
                        checked={commissionOffered}
                        onCheckedChange={(checked) =>
                          onCommissionOfferedChange(checked === true)
                        }
                      />
                      <Label htmlFor="crafting-commission">
                        I will commission
                      </Label>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={commissionGil}
                      disabled={!commissionOffered}
                      onChange={(event) =>
                        onCommissionGilChange(event.target.value)
                      }
                      placeholder="Gil amount"
                    />
                  </div>

                  {!isAuthed && (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      Member login required to create request.
                    </p>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={creating || !isAuthed}
                    onClick={onSubmit}
                  >
                    {creating ? "Creating..." : "Create request"}
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackageOpen className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RecipePreview({
  selectedRecipe,
  preview,
  loading,
  error,
  quantity,
  onAdd,
}: {
  selectedRecipe: CraftingRecipe | null;
  preview: CraftingSelectedItem | null;
  loading: boolean;
  error: string;
  quantity: number;
  onAdd: () => void;
}) {
  if (!selectedRecipe) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <Hammer className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="font-medium">No item selected</p>
            <p className="text-sm text-muted-foreground">
              Search an item to expand ingredients, crystals, clusters, and
              precrafts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">Could not expand recipe</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const recipe = preview.recipeSnapshot;
  const amountResult = recipe.amountResult || 1;
  const ingredients = safeArray(recipe.ingredients);
  const crystals = safeArray(recipe.crystals);
  const clusters = safeArray(recipe.clusters);
  const precrafts = safeArray(recipe.precrafts);
  const craftsNeeded = Math.ceil(quantity / amountResult);
  const crystalsAndClusters = [...crystals, ...clusters];

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <PreviewIcon icon={preview.itemIcon} size="lg" />
          <div className="min-w-0">
            <CardTitle className="line-clamp-2 font-serif text-2xl">
              {preview.itemName}
            </CardTitle>
            <CardDescription>
              {recipe.crafter}
              {recipe.recipeLevel !== null ? ` Lv. ${recipe.recipeLevel}` : ""}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button type="button" onClick={onAdd} className="w-full sm:w-auto">
          Add to request
          <Plus className="h-4 w-4" />
        </Button>
        <IngredientGroup
          title="Crafting Ingredients"
          items={ingredients}
          craftMultiplier={craftsNeeded}
          emptyText="No non-crystal ingredients listed."
        />
      </CardContent>
    </Card>
  );
}

function IngredientGroup({
  title,
  items,
  craftMultiplier,
  emptyText,
}: {
  title: string;
  items: CraftingRecipeSnapshot["ingredients"];
  craftMultiplier: number;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={`${title}-${item.itemId}`}
              className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 p-2"
            >
              <PreviewIcon icon={item.icon} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.amount * craftMultiplier} needed
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrecraftGroup({
  items,
  craftMultiplier,
}: {
  items: CraftingRecipeSnapshot["precrafts"];
  craftMultiplier: number;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Precraft</h3>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No craftable sub-components found.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={`${item.recipeId}-${item.depth ?? 0}`}
              className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/20 p-2"
            >
              <PreviewIcon icon={item.itemIcon} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.quantity * craftMultiplier}x {item.itemName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.crafter}
                  {item.recipeLevel !== null ? ` Lv. ${item.recipeLevel}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuantityControl({
  value,
  onChange,
  editable = true,
}: {
  value: number;
  onChange: (value: number) => void;
  editable?: boolean;
}) {
  const setSafeValue = (next: number) =>
    onChange(Math.max(1, Math.floor(next || 1)));

  return (
    <div className="mx-auto flex w-fit items-center rounded-md border">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-r-none"
        onClick={() => setSafeValue(value - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      {editable ? (
        <Input
          value={value}
          min={1}
          type="number"
          inputMode="numeric"
          className="h-9 w-16 rounded-none border-y-0 text-center"
          onChange={(event) => setSafeValue(Number(event.target.value))}
          onBlur={(event) => setSafeValue(Number(event.target.value))}
          aria-label="Quantity"
        />
      ) : (
        <span
          className="flex h-9 w-16 items-center justify-center border-x text-sm font-medium tabular-nums"
          aria-label="Quantity"
        >
          {value}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-l-none"
        onClick={() => setSafeValue(value + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex items-center gap-2 rounded-sm px-2 py-2">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

function RequestSection({
  config,
  requests,
  currentMember,
  members,
  isAdmin,
  actionRequestId,
  onAccept,
  onComplete,
  compactCards = false,
}: {
  config: RequestSectionConfig;
  requests: CraftingRequestDashboardRecord[];
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  actionRequestId: string | null;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  compactCards?: boolean;
}) {
  const Icon = config.icon;

  return (
    <section
      className={cn("crafting-section min-w-0 space-y-3", config.laneClass)}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
          <Icon className={cn("h-5 w-5 shrink-0", config.accent)} />
          <span className="min-w-0 truncate">{config.title}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-36 items-center justify-center p-5 text-center text-sm text-muted-foreground">
            {config.emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
          {requests.map((request) =>
            compactCards ? (
              <CompletedRequestButton
                key={request.id}
                request={request}
                currentMember={currentMember}
                members={members}
                isAdmin={isAdmin}
                busy={actionRequestId === request.id}
                onAccept={onAccept}
                onComplete={onComplete}
              />
            ) : (
              <RequestCard
                key={request.id}
                request={request}
                currentMember={currentMember}
                members={members}
                isAdmin={isAdmin}
                busy={actionRequestId === request.id}
                onAccept={onAccept}
                onComplete={onComplete}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}

function CompletedRequestButton({
  request,
  currentMember,
  members,
  isAdmin,
  busy,
  onAccept,
  onComplete,
}: {
  request: CraftingRequestDashboardRecord;
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  busy: boolean;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const firstItem = safeArray(request.items)[0];

  return (
    <>
      <button
        type="button"
        data-request-id={request.id}
        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
      >
        <ItemIcon item={firstItem} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {requestTitle(request)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRequestDate(request.createdAt)}
            {" · "}
            {request.commission?.offered
              ? commissionLabel(request.commission)
              : request.acceptedBy
                ? `Done by ${request.acceptedBy.characterName}`
                : "Completed"}
          </p>
        </div>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed request</DialogTitle>
            <DialogDescription>
              Finished request from recent completed list.
            </DialogDescription>
          </DialogHeader>
          <RequestCard
            request={request}
            currentMember={currentMember}
            members={members}
            isAdmin={isAdmin}
            busy={busy}
            onAccept={onAccept}
            onComplete={onComplete}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function RequestCard({
  request,
  currentMember,
  members,
  isAdmin,
  busy,
  onAccept,
  onComplete,
}: {
  request: CraftingRequestDashboardRecord;
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  busy: boolean;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
}) {
  const requestItems = safeArray(request.items);
  const firstItem = requestItems[0];
  const accepted = request.acceptedBy;
  const canAccept =
    Boolean(currentMember) && request.status === "open" && !accepted;
  const canComplete =
    Boolean(currentMember) &&
    request.status === "in_progress" &&
    Boolean(accepted) &&
    (accepted?.lodestoneId === currentMember?.lodestoneId || isAdmin);

  return (
    <Card
      data-request-id={request.id}
      className="flex h-98 flex-col overflow-hidden"
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <ItemIcon item={firstItem} />
            <div className="min-w-0">
              <CardTitle className="line-clamp-2 font-serif text-xl leading-tight">
                {requestTitle(request)}
              </CardTitle>
              <CardDescription>
                {request.commission?.offered
                  ? commissionLabel(request.commission)
                  : `${request.itemCount} item${
                      request.itemCount === 1 ? "" : "s"
                    } requested`}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">
              {formatRequestDate(request.createdAt)}
            </Badge>
            <Badge
              variant={request.status === "completed" ? "secondary" : "default"}
            >
              {statusLabel(request.status)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {materialStatusLabels[request.materialStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
        <div className="grid gap-2 text-sm">
          <MemberLine label="Requester" member={request.requester} />
          {accepted ? (
            <MemberLine label="Crafter" member={accepted} />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="h-4 w-4 shrink-0" />
              <span>No crafter assigned</span>
            </div>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 pr-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {requestItems.map((item) => (
              <RequestedItem
                key={`${request.id}-${item.selectedRecipeId}`}
                item={item}
              />
            ))}
          </div>
        </ScrollArea>

        <EligibleCrafters items={requestItems} members={members} />
        {(request.status === "open" || request.status === "in_progress") && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {request.status === "open" && (
              <Button
                type="button"
                size="sm"
                disabled={!canAccept || busy}
                onClick={() => onAccept(request.id)}
              >
                {busy ? "Accepting..." : "Accept"}
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageOpen className="h-4 w-4" />
                )}
              </Button>
            )}
            {request.status === "in_progress" && (
              <Button
                type="button"
                size="sm"
                disabled={!canComplete || busy}
                onClick={() => onComplete(request.id)}
              >
                {busy ? "Completing..." : "Complete"}
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestedItem({ item }: { item: CraftingRequestDashboardItem }) {
  const recipe = item.recipeSnapshot ?? {};

  return (
    <a
      href={itemWebUrl(item.itemId)}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 items-center gap-2 rounded-lg border bg-muted/20 p-2 transition hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={`Open ${item.itemName}`}
    >
      <PreviewIcon icon={item.itemIcon} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.quantity}x {item.itemName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {recipe.crafter ?? "Crafter"}
          {recipe.recipeLevel !== null ? ` Lv. ${recipe.recipeLevel}` : ""}
        </p>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
    </a>
  );
}

function EligibleCrafters({
  items,
  members,
}: {
  items: CraftingRequestDashboardItem[];
  members: Record<string, Member>;
}) {
  const eligibility = combinedEligibility(items, members);
  const crafters = eligibility.crafters;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Eligible FC crafters
      </div>
      {eligibility.status === "unknown" ? (
        <p className="text-sm text-muted-foreground">
          Eligibility unknown. Lodestone job levels have not been synced for
          this crafter job.
        </p>
      ) : crafters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No eligible FC crafters found from synced job levels.
        </p>
      ) : (
        <ScrollArea className="max-h-16 pr-2">
          <div className="flex flex-wrap gap-2">
            {crafters.map((crafter) => (
              <CrafterChip
                key={`${crafter.lodestoneId}-${crafter.job}`}
                crafter={crafter}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function MemberLine({
  label,
  member,
}: {
  label: string;
  member: CraftingRequestMember;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatar member={member} size="sm" />
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate font-medium">
        {member.characterName}
      </span>
    </div>
  );
}

function MemberAvatar({
  member,
  size = "md",
}: {
  member: Pick<CraftingRequestMember, "characterName" | "avatarUrl">;
  size?: "sm" | "md";
}) {
  const fallback = member.characterName.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold",
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
      )}
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        fallback || <UserRound className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

function CrafterChip({ crafter }: { crafter: CombinedEligibleCrafter }) {
  const jobs =
    crafter.jobs.length > 0
      ? crafter.jobs
      : [{ job: crafter.job, level: crafter.level }];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-muted">
            <MemberAvatar member={crafter} size="md" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="space-y-1">
          <p className="font-medium">{crafter.characterName}</p>
          {jobs.map((job) => (
            <div key={job.job} className="flex items-center gap-1.5 text-xs">
              <JobIcon job={job.job} />
              <span>
                {job.job} Lv. {job.level}
              </span>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function JobIcon({ job }: { job: string }) {
  const icon = jobIconSrc(job);
  if (!icon) return null;
  return (
    <img src={icon} alt="" className="h-4 w-4 object-contain" loading="lazy" />
  );
}

function ItemIcon({
  item,
  size = "md",
}: {
  item?: CraftingRequestDashboardItem;
  size?: "sm" | "md";
}) {
  const jobIcon = jobIconSrc(item?.recipeSnapshot?.crafter);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "sm" ? "h-10 w-10" : "h-12 w-12",
      )}
    >
      {jobIcon ? (
        <img
          src={jobIcon}
          alt=""
          className={cn(
            "object-contain",
            size === "sm" ? "h-9 w-9" : "h-11 w-11",
          )}
          loading="lazy"
        />
      ) : (
        <Hammer className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

function PreviewIcon({
  icon,
  size = "sm",
}: {
  icon?: CraftingRequestDashboardItem["itemIcon"];
  size?: "sm" | "lg";
}) {
  const iconUrl = getXivapiIconUrl(icon);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted",
        size === "lg" ? "h-12 w-12" : "h-8 w-8",
      )}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="h-full w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <Hammer className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

function jobIconSrc(job: string | undefined): string | null {
  if (!job) return null;
  const slug = CRAFTING_JOB_ICON_SLUG[job];
  return slug ? (jobIconMap[`../../assets/jobs/${slug}.png`] ?? null) : null;
}

function commissionLabel(
  commission: NonNullable<CraftingRequestDashboardRecord["commission"]>,
) {
  return typeof commission.gil === "number" && commission.gil > 0
    ? `${commission.gil.toLocaleString()} gil`
    : "Commission";
}

function requestTitle(request: CraftingRequestDashboardRecord) {
  return `${request.requester.characterName}'s order`;
}

function formatRequestDate(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function itemWebUrl(itemId: number) {
  return `https://ffxivteamcraft.com/db/en/item/${itemId}`;
}

function LoadingBoard() {
  return (
    <div className="grid gap-5 xl:grid-cols-[3fr_3fr_1fr]">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="crafting-section space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          {Array.from({ length: 2 }).map((__, cardIndex) => (
            <Card key={cardIndex}>
              <CardHeader>
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}

type EligibilityResult = {
  status: "known" | "unknown";
  crafters: CombinedEligibleCrafter[];
};

type ItemEligibilityResult = {
  status: "known" | "unknown";
  crafters: CraftingEligibleCrafter[];
};

type CombinedEligibleCrafter = CraftingEligibleCrafter & {
  jobs: Array<{ job: string; level: number }>;
};

function combinedEligibility(
  items: CraftingRequestDashboardItem[],
  members: Record<string, Member>,
): EligibilityResult {
  const itemList = safeArray(items);
  if (itemList.length === 0) return { status: "known", crafters: [] };

  let intersection: Map<string, CombinedEligibleCrafter> | null = null;

  for (const item of itemList) {
    const eligibility = eligibleCraftersForItem(item, members);
    if (eligibility.status === "unknown") {
      return { status: "unknown", crafters: [] };
    }

    const itemCrafters = new Map<string, CombinedEligibleCrafter>();
    for (const crafter of eligibility.crafters) {
      itemCrafters.set(crafter.lodestoneId, {
        ...crafter,
        jobs: [{ job: crafter.job, level: crafter.level }],
      });
    }

    if (!intersection) {
      intersection = itemCrafters;
      continue;
    }

    for (const [lodestoneId, crafter] of Array.from(intersection.entries())) {
      const nextCrafter = itemCrafters.get(lodestoneId);
      if (!nextCrafter) {
        intersection.delete(lodestoneId);
        continue;
      }
      crafter.jobs = mergeCrafterJobs(crafter.jobs, nextCrafter.jobs);
      crafter.avatarUrl = crafter.avatarUrl ?? nextCrafter.avatarUrl;
    }
  }

  const result = Array.from(intersection?.values() ?? []).sort((a, b) =>
    a.characterName.localeCompare(b.characterName),
  );
  return { status: "known", crafters: result };
}

function eligibleCraftersForItem(
  item: CraftingRequestDashboardItem,
  members: Record<string, Member>,
): ItemEligibilityResult {
  const recipe = item.recipeSnapshot ?? {};
  const snapshotted = safeArray(recipe.eligibleCrafters);
  if (snapshotted.length > 0) {
    return {
      status: "known",
      crafters: snapshotted.map((crafter) => {
        const member = members[crafter.lodestoneId];
        return {
          ...crafter,
          characterName: member?.name ?? crafter.characterName,
          avatarUrl: member?.avatarUrl ?? crafter.avatarUrl,
        };
      }),
    };
  }

  const crafterJob = recipe.crafter;
  if (!crafterJob) return { status: "unknown", crafters: [] };
  const requiredLevel = recipe.recipeLevel ?? 0;
  const memberEntries = Object.entries(members);
  if (memberEntries.length === 0) return { status: "unknown", crafters: [] };

  let sawSyncedJob = false;
  const crafters = memberEntries
    .flatMap(([lodestoneId, member]) => {
      if (member.fcRank === "Friend") return [];
      const level = member.jobLevels?.[crafterJob];
      if (typeof level === "number") sawSyncedJob = true;
      if (typeof level !== "number" || level < requiredLevel) return [];
      return [
        {
          lodestoneId,
          characterName: member.name,
          fcRank: member.fcRank,
          avatarUrl: member.avatarUrl,
          job: crafterJob,
          level,
        },
      ];
    })
    .sort((a, b) => a.characterName.localeCompare(b.characterName));

  if (!sawSyncedJob) return { status: "unknown", crafters: [] };
  return { status: "known", crafters };
}

function mergeCrafterJobs(
  current: Array<{ job: string; level: number }>,
  next: Array<{ job: string; level: number }>,
) {
  const jobs = new Map(current.map((job) => [job.job, job]));
  for (const job of next) jobs.set(job.job, job);
  return Array.from(jobs.values()).sort((a, b) => a.job.localeCompare(b.job));
}

function statusLabel(status: CraftingRequestDashboardRecord["status"]) {
  if (status === "in_progress") return "In progress";
  return status[0].toUpperCase() + status.slice(1);
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}
