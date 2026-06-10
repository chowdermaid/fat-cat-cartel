import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createCraftingRequest } from "../api/craftingRequests";
import {
  type CraftingRecipe,
  type CraftingSearchItem,
  resolveRecipeSnapshot,
  searchCraftingRecipes,
} from "../api/xivapi";
import {
  DEFAULT_MATERIAL_STATUS,
  MATERIAL_NOTE_MAX_LENGTH,
  SEARCH_DELAY_MS,
} from "../constants";
import type {
  CraftingMaterialStatus,
  CraftingRecipeSnapshot,
  CraftingRequestMember,
  CraftingSelectedItem,
} from "../types";

export function useCraftingRequestBuilder({
  requester,
  reload,
  sessionToken,
}: {
  requester: CraftingRequestMember | null;
  reload: () => Promise<void>;
  sessionToken: string | null;
}) {
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
  const searchCacheRef = useRef(new Map<string, CraftingSearchItem[]>());

  const normalizedQuery = query.trim().toLowerCase();

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

  const selectedRecipe: CraftingRecipe | null = useMemo(
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
    if (!requester) {
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
        sessionToken,
        requester,
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

  return {
    addPreviewToRequest,
    commissionGil,
    commissionOffered,
    creating,
    formError,
    lastAddedRequestItemKey,
    materialNote,
    materialStatus,
    normalizedQuery,
    preview,
    previewError,
    previewLoading,
    quantity,
    query,
    removeRequestItem,
    requestDialogOpen,
    requestItems,
    results,
    searchError,
    searchLoading,
    searchOpen,
    selectItem,
    selectedRecipe,
    selectedRecipeId,
    selectedSource,
    setCommissionGil,
    setCommissionOffered,
    setMaterialNote,
    setQuantity,
    setQuery,
    setRequestDialogOpen,
    setSearchOpen,
    setSelectedRecipeId,
    submitRequest,
    updateMaterialStatus,
    updateRequestItemQuantity,
  };
}
