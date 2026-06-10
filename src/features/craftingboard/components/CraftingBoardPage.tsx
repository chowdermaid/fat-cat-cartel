import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import {
  CheckCircle2,
  Clock3,
  Hammer,
  Inbox,
  ListPlus,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useMembers } from "@/hooks/useMembers";
import { acceptCraftingRequest, closeCraftingRequest, completeCraftingRequest, createCraftingRequest, reopenCraftingRequest } from "../api/craftingRequests";
import { type CraftingSearchItem, resolveRecipeSnapshot, searchCraftingRecipes } from "../api/xivapi";
import { DEFAULT_MATERIAL_STATUS, MATERIAL_NOTE_MAX_LENGTH, SEARCH_DELAY_MS, sectionConfigs } from "../constants";
import { useCraftingRequests } from "../hooks/useCraftingRequests";
import type { CraftingMaterialStatus, CraftingRecipeSnapshot, CraftingRequestDashboardRecord, CraftingSelectedItem } from "../types";
import { isCraftingAdminSession } from "../utils/craftingMembers";
import { CreateRequestDialog } from "./CreateRequestDialog";
import { LoadingBoard } from "./LoadingBoard";
import { RequestSection } from "./requests/RequestSection";
import { Metric } from "./shared/Metric";

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
