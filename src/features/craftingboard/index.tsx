import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  Coins,
  ExternalLink,
  Hammer,
  HandHeart,
  Inbox,
  ListPlus,
  Loader2,
  MessageSquareText,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  closeCraftingRequest,
  completeCraftingRequest,
  createCraftingRequest,
  reopenCraftingRequest,
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
    description: "Waiting for a willing crafter to pick up the leve.",
    emptyText: "No open requests. Astrid is behaving.",
    icon: Inbox,
    accent: "text-primary",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  inProgress: {
    title: "In progress",
    description: "Claimed by a crafter.",
    emptyText: "Nothing is in progress. The workshop is quiet.",
    icon: Clock3,
    accent: "text-amber-600 dark:text-amber-400",
    laneClass:
      "border-b border-border/70 pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5",
  },
  completed: {
    title: "Completed",
    description: "Finished requests (last 30 days)",
    emptyText: "No completed requests from the last 30 days.",
    icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-400",
    laneClass: "",
  },
} satisfies Record<string, RequestSectionConfig>;

const SEARCH_DELAY_MS = 300;
const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]";
const REQUEST_SECTION_PAGE_SIZE = 3;
const COMPLETED_SECTION_PAGE_SIZE = 8;
const TEAMCRAFT_IMPORT_BASE_URL = "https://ffxivteamcraft.com/import";
const MATERIAL_NOTE_MAX_LENGTH = 200;
const DEFAULT_MATERIAL_STATUS: CraftingMaterialStatus =
  "requester_has_all_materials";

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
  const [lastAddedRequestItemKey, setLastAddedRequestItemKey] = useState("");
  const [materialStatus, setMaterialStatus] = useState<
    CraftingMaterialStatus | ""
  >(DEFAULT_MATERIAL_STATUS);
  const [materialNote, setMaterialNote] = useState("");
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
    const addedRecipeId = preview.selectedRecipeId;
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
    setLastAddedRequestItemKey(`${addedRecipeId}:${Date.now()}`);
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

  function updateMaterialStatus(value: CraftingMaterialStatus) {
    setMaterialStatus(value);
    if (value !== "requester_has_some_materials") setMaterialNote("");
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
    const trimmedMaterialNote =
      materialStatus === "requester_has_some_materials"
        ? materialNote.trim().slice(0, MATERIAL_NOTE_MAX_LENGTH)
        : null;
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
        materialNote: trimmedMaterialNote,
        items: requestItems,
        commission: commissionOffered
          ? { offered: true, gil: commissionGilValue }
          : null,
      });
      setRequestItems([]);
      setMaterialStatus(DEFAULT_MATERIAL_STATUS);
      setMaterialNote("");
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
  const isCraftingAdmin = isCraftingAdminSession(auth.session);

  async function runLifecycleAction(
    requestId: string,
    action: "accept" | "complete" | "close" | "reopen",
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
        isAdmin: isCraftingAdmin,
        requestId,
      };
      if (action === "accept") {
        await acceptCraftingRequest(payload);
        toast.success("Request accepted.");
      } else if (action === "complete") {
        await completeCraftingRequest(payload);
        toast.success("Request completed.");
      } else if (action === "close") {
        await closeCraftingRequest(payload);
        toast.success("Request closed.");
      } else {
        await reopenCraftingRequest(payload);
        toast.success("Request moved back to open.");
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
            <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
              <Hammer className="h-7 w-7 text-muted-foreground" />
              Crafting Requests
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Could this have been a discord message?? Yes. Do you guys get a
              dashboard instead? Also yes.
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
            {auth.session && (
              <Button type="button" onClick={() => setRequestDialogOpen(true)}>
                Request item
                <ListPlus className="h-4 w-4" />
              </Button>
            )}
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
        materialNote={materialNote}
        commissionOffered={commissionOffered}
        commissionGil={commissionGil}
        creating={creating}
        error={formError}
        isAuthed={Boolean(auth.session)}
        onMaterialStatusChange={updateMaterialStatus}
        onMaterialNoteChange={(value) =>
          setMaterialNote(value.slice(0, MATERIAL_NOTE_MAX_LENGTH))
        }
        onCommissionOfferedChange={setCommissionOffered}
        onCommissionGilChange={setCommissionGil}
        onQuantityChange={updateRequestItemQuantity}
        onRemove={removeRequestItem}
        lastAddedRequestItemKey={lastAddedRequestItemKey}
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

          <div className="grid gap-5 xl:grid-cols-[2fr_2fr_1fr]">
            <RequestSection
              config={sectionConfigs.open}
              requests={data.open}
              currentMember={currentMember}
              members={members}
              isAdmin={isCraftingAdmin}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
              onClose={(requestId) => runLifecycleAction(requestId, "close")}
              onReopen={(requestId) => runLifecycleAction(requestId, "reopen")}
            />
            <RequestSection
              config={sectionConfigs.inProgress}
              requests={data.inProgress}
              currentMember={currentMember}
              members={members}
              isAdmin={isCraftingAdmin}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
              onClose={(requestId) => runLifecycleAction(requestId, "close")}
              onReopen={(requestId) => runLifecycleAction(requestId, "reopen")}
            />
            <RequestSection
              config={sectionConfigs.completed}
              requests={data.completed}
              currentMember={currentMember}
              members={members}
              isAdmin={isCraftingAdmin}
              actionRequestId={actionRequestId}
              onAccept={(requestId) => runLifecycleAction(requestId, "accept")}
              onComplete={(requestId) =>
                runLifecycleAction(requestId, "complete")
              }
              onClose={(requestId) => runLifecycleAction(requestId, "close")}
              onReopen={(requestId) => runLifecycleAction(requestId, "reopen")}
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
  materialNote,
  commissionOffered,
  commissionGil,
  creating,
  error,
  isAuthed,
  onMaterialStatusChange,
  onMaterialNoteChange,
  onCommissionOfferedChange,
  onCommissionGilChange,
  onQuantityChange,
  onRemove,
  lastAddedRequestItemKey,
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
  materialNote: string;
  commissionOffered: boolean;
  commissionGil: string;
  creating: boolean;
  error: string;
  isAuthed: boolean;
  onMaterialStatusChange: (value: CraftingMaterialStatus) => void;
  onMaterialNoteChange: (value: string) => void;
  onCommissionOfferedChange: (value: boolean) => void;
  onCommissionGilChange: (value: string) => void;
  onQuantityChange: (recipeId: number, quantity: number) => void;
  onRemove: (recipeId: number) => void;
  lastAddedRequestItemKey: string;
  onSubmit: () => void;
}) {
  const requestItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const [recipeId] = lastAddedRequestItemKey.split(":");
    if (!recipeId || !requestItemsRef.current) return;

    const element = requestItemsRef.current.querySelector(
      `[data-request-item-id="${recipeId}"]`,
    );
    if (!element) return;

    animate(element, {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.97, 1],
      duration: 320,
      easing: "easeOutBack",
    });
  }, [lastAddedRequestItemKey]);

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
                          {selectedSource?.itemName ?? "Search item..."}
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
                onQuantityChange={onPreviewQuantityChange}
                onAdd={onAddPreview}
              />
            </div>

            <Card className="h-fit lg:sticky lg:top-0">
              <CardHeader>
                <CardTitle className="font-serif text-xl">
                  New Request
                </CardTitle>
                <CardDescription>
                  Add one or more craftable items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No items added yet.
                  </div>
                ) : (
                  <ScrollArea className="max-h-80 pr-3">
                    <div ref={requestItemsRef} className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.selectedRecipeId}
                          data-request-item-id={item.selectedRecipeId}
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

                  {materialStatus === "requester_has_some_materials" && (
                    <div className="space-y-2">
                      <Label htmlFor="crafting-material-note">
                        Materials note
                      </Label>
                      <Input
                        id="crafting-material-note"
                        value={materialNote}
                        maxLength={MATERIAL_NOTE_MAX_LENGTH}
                        onChange={(event) =>
                          onMaterialNoteChange(event.target.value)
                        }
                        placeholder="What you have or still need"
                      />
                    </div>
                  )}

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
  onQuantityChange,
  onAdd,
}: {
  selectedRecipe: CraftingRecipe | null;
  preview: CraftingSelectedItem | null;
  loading: boolean;
  error: string;
  quantity: number;
  onQuantityChange: (value: number) => void;
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
  const craftsNeeded = Math.ceil(quantity / amountResult);

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
        <div className="flex flex-wrap items-center gap-3">
          <QuantityControl
            value={quantity}
            onChange={onQuantityChange}
            editable={false}
            centered={false}
          />
          <Button type="button" onClick={onAdd}>
            Add to request
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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

function QuantityControl({
  value,
  onChange,
  editable = true,
  centered = true,
}: {
  value: number;
  onChange: (value: number) => void;
  editable?: boolean;
  centered?: boolean;
}) {
  const setSafeValue = (next: number) =>
    onChange(Math.max(1, Math.floor(next || 1)));

  return (
    <div
      className={cn(
        "flex w-fit items-center rounded-md border",
        centered && "mx-auto",
      )}
    >
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
  onClose,
  onReopen,
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
  onClose: (requestId: string) => void;
  onReopen: (requestId: string) => void;
  compactCards?: boolean;
}) {
  const Icon = config.icon;
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = compactCards
    ? COMPLETED_SECTION_PAGE_SIZE
    : REQUEST_SECTION_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [currentPage, pageSize, requests]);
  const visibleRequestIds = visibleRequests
    .map((request) => request.id)
    .join("|");

  useEffect(() => {
    if (!pageContainerRef.current || requests.length === 0) return;

    animate(pageContainerRef.current.querySelectorAll("[data-page-card]"), {
      opacity: [0, 1],
      translateX: [12, 0],
      delay: stagger(45),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, [currentPage, requests.length, visibleRequestIds]);

  return (
    <section
      className={cn("crafting-section min-w-0 space-y-3", config.laneClass)}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
            <Icon className={cn("h-5 w-5 shrink-0", config.accent)} />
            <span className="min-w-0 truncate">{config.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {totalPages > 1 && (
          <LanePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-36 items-center justify-center p-5 text-center text-sm text-muted-foreground">
            {config.emptyText}
          </CardContent>
        </Card>
      ) : (
        <div
          ref={pageContainerRef}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-1"
        >
          {visibleRequests.map((request) => (
            <div key={request.id} data-page-card>
              {compactCards ? (
                <CompletedRequestButton
                  request={request}
                  currentMember={currentMember}
                  members={members}
                  isAdmin={isAdmin}
                  busy={actionRequestId === request.id}
                  onAccept={onAccept}
                  onComplete={onComplete}
                  onClose={onClose}
                  onReopen={onReopen}
                />
              ) : (
                <RequestCard
                  request={request}
                  currentMember={currentMember}
                  members={members}
                  isAdmin={isAdmin}
                  busy={actionRequestId === request.id}
                  onAccept={onAccept}
                  onComplete={onComplete}
                  onClose={onClose}
                  onReopen={onReopen}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LanePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
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
  onClose,
  onReopen,
}: {
  request: CraftingRequestDashboardRecord;
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  busy: boolean;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  onClose: (requestId: string) => void;
  onReopen: (requestId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const firstItem = safeArray(request.items)[0];
  const completedBy = completedByMember(request);

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
            {`Completed by ${completedBy.characterName}`}
            {request.commission?.offered
              ? ` - ${commissionLabel(request.commission)}`
              : ""}
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
            onClose={onClose}
            onReopen={onReopen}
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
  onClose,
  onReopen,
}: {
  request: CraftingRequestDashboardRecord;
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  busy: boolean;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  onClose: (requestId: string) => void;
  onReopen: (requestId: string) => void;
}) {
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const requestItems = safeArray(request.items);
  const firstItem = requestItems[0];
  const accepted = request.acceptedBy;
  const isAuthed = Boolean(currentMember);
  const isRequester = sameCraftingMember(currentMember, request.requester);
  const isAcceptedCrafter = sameCraftingMember(currentMember, accepted);
  const canAccept =
    isAuthed &&
    request.status === "open" &&
    !accepted &&
    (!isRequester || isAdmin);
  const canComplete =
    isAuthed &&
    request.status === "in_progress" &&
    (isRequester || isAcceptedCrafter || isAdmin);
  const canClose =
    isAuthed && request.status === "open" && (isRequester || isAdmin);
  const canReopen =
    isAuthed && request.status === "in_progress" && (isRequester || isAdmin);
  const teamcraftUrl = teamcraftImportUrl(requestItems);
  const gilLabel = gilCommissionLabel(request.commission);
  const showActions =
    isAuthed && (request.status === "open" || request.status === "in_progress");

  return (
    <>
      <Card
        data-request-id={request.id}
        className="flex max-h-130 flex-col overflow-hidden"
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
                  {materialGuidanceText(request.materialStatus)}
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {gilLabel && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400/60 bg-amber-100/70 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200"
                >
                  <Coins className="h-3.5 w-3.5" />
                  {gilLabel}
                </Badge>
              )}
              <Badge variant="outline">
                {formatRequestDate(request.createdAt)}
              </Badge>
              <Badge
                variant={
                  request.status === "completed" ? "secondary" : "default"
                }
              >
                {statusLabel(request.status)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {materialStatusLabels[request.materialStatus]}
            </Badge>
            <Badge variant="outline">
              {request.itemCount} item{request.itemCount === 1 ? "" : "s"}
            </Badge>
          </div>
          {request.materialNote && (
            <p className="flex gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{request.materialNote}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
          <div className="grid gap-2 text-sm">
            <MemberLine label="Requester" member={request.requester} />
            {accepted && <MemberLine label="Crafter" member={accepted} />}
            {request.status === "completed" && (
              <MemberLine
                label="Completed by"
                member={completedByMember(request)}
              />
            )}
          </div>

          <ScrollArea className="min-h-0 flex-1 border-y pt-2 pr-3 min-h-18 bg-muted/10">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {requestItems.map((item) => (
                <RequestedItem
                  key={`${request.id}-${item.selectedRecipeId}`}
                  item={item}
                />
              ))}
            </div>
          </ScrollArea>

          {isAuthed && teamcraftUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-fit px-2 text-xs"
              asChild
            >
              <a href={teamcraftUrl} target="_blank" rel="noreferrer">
                Export items to Teamcraft list
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}

          <EligibleCrafters items={requestItems} members={members} />
          {showActions &&
            (canAccept || canComplete || canClose || canReopen) && (
              <div className="flex flex-wrap gap-2">
                {canAccept && (
                  <Button
                    type="button"
                    size="sm"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => onAccept(request.id)}
                  >
                    {busy ? "Accepting..." : "Accept"}
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <HandHeart className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canComplete && (
                  <Button
                    type="button"
                    size="sm"
                    className="min-w-24"
                    disabled={busy}
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
                {canClose && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => setCloseConfirmOpen(true)}
                  >
                    Close
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {canReopen && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => onReopen(request.id)}
                  >
                    Reopen
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
        </CardContent>
      </Card>
      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close request?</DialogTitle>
            <DialogDescription>
              Closing this will count as completed. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canClose || busy}
              onClick={() => {
                setCloseConfirmOpen(false);
                onClose(request.id);
              }}
            >
              {busy ? "Closing..." : "Close request"}
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function sameCraftingMember(
  left:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
  right:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
): boolean {
  return (
    sameStringId(left?.lodestoneId, right?.lodestoneId) ||
    sameStringId(left?.discordUserId, right?.discordUserId)
  );
}

function sameStringId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function completedByMember(
  request: CraftingRequestDashboardRecord,
): CraftingRequestMember {
  return request.completedBy ?? request.acceptedBy ?? request.requester;
}

function isCraftingAdminSession(
  session: { isAdmin?: boolean; fcRank?: string | null } | null,
): boolean {
  const rank = String(session?.fcRank ?? "")
    .trim()
    .toLowerCase();
  return session?.isAdmin === true || rank === "boss" || rank === "underpaw";
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
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs font-medium uppercase text-muted-foreground transition hover:bg-muted/50">
        <span className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Eligible crafters</span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
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
      </CollapsibleContent>
    </Collapsible>
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
    : "";
}

function gilCommissionLabel(
  commission: CraftingRequestDashboardRecord["commission"],
) {
  if (!commission?.offered) return null;
  const label = commissionLabel(commission);
  return label || null;
}

function materialGuidanceText(status: CraftingMaterialStatus) {
  if (status === "crafter_to_provide_materials") {
    return "Crafter to provide materials.";
  }
  return "Materials: FC chest tab 2 or coordinate with crafter.";
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

function teamcraftImportUrl(items: CraftingRequestDashboardItem[]) {
  const importString = items
    .map((item) => {
      const itemId = Math.trunc(Number(item.itemId));
      const recipeId = Math.trunc(Number(item.selectedRecipeId));
      const quantity = Math.max(1, Math.trunc(Number(item.quantity)));
      if (!Number.isFinite(itemId) || itemId <= 0) return null;
      return [
        itemId,
        Number.isFinite(recipeId) && recipeId > 0 ? recipeId : "null",
        Number.isFinite(quantity) ? quantity : 1,
      ].join(",");
    })
    .filter((row): row is string => Boolean(row))
    .join(";");

  if (!importString) return null;
  return `${TEAMCRAFT_IMPORT_BASE_URL}/${window.btoa(importString)}`;
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
