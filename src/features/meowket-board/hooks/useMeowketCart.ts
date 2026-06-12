import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MEOWKET_TOAST_POSITION } from "../constants";
import type { MeowketCartBatch, MeowketProfitResult } from "../types";
import {
  allUsedListingKeys,
  buildCartBatch,
  buildCartSummary,
  buildReplacementCartItem,
  canAddCalculationToCart,
  nextAvailableListing,
} from "../utils/cartMerging";
import { formatGil } from "../utils/formatting";

export function useMeowketCart() {
  const [cartBatches, setCartBatches] = useState<MeowketCartBatch[]>([]);
  const cartSummary = useMemo(
    () => buildCartSummary(cartBatches),
    [cartBatches],
  );

  function addCalculationToCart(calculation: MeowketProfitResult | null) {
    if (!calculation || !canAddCalculationToCart(calculation)) return;
    setCartBatches((current) => [
      ...current,
      buildCartBatch(calculation, current.length),
    ]);
    toast.success(`${calculation.item.name} added to cart route.`, {
      description: `${formatGil(calculation.estimatedMaterialCost)} materials - ${formatGil(calculation.estimatedNetProfit)} profit`,
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

  function setCartItemBought(batchId: string, itemKey: string, bought: boolean) {
    setCartBatches((current) =>
      current.map((batch) =>
        batch.id !== batchId
          ? batch
          : {
              ...batch,
              shoppingList: batch.shoppingList.map((group) => ({
                ...group,
                items: group.items.map((item) =>
                  item.key === itemKey && item.status !== "missing"
                    ? {
                        ...item,
                        status: bought ? "bought" : "open",
                        note: bought ? "Bought." : item.replacementForKey ? item.note : undefined,
                      }
                    : item,
                ),
              })),
            },
      ),
    );
  }

  function setCartStopBought(world: string, bought: boolean) {
    setCartBatches((current) =>
      current.map((batch) => ({
        ...batch,
        shoppingList: batch.shoppingList.map((group) =>
          group.world !== world
            ? group
            : {
                ...group,
                items: group.items.map((item) =>
                  item.status === "missing"
                    ? item
                    : {
                        ...item,
                        status: bought ? "bought" : "open",
                        note: bought
                          ? "Bought."
                          : item.replacementForKey
                            ? item.note
                            : undefined,
                      },
                ),
              },
        ),
      })),
    );
  }

  function markCartItemMissing(batchId: string, itemKey: string) {
    let replaced = false;
    let exhausted = false;
    let itemName = "";

    setCartBatches((current) => {
      const usedListingKeys = allUsedListingKeys(current);
      return current.map((batch) => {
        if (batch.id !== batchId) return batch;

        let missingItem =
          batch.shoppingList
            .flatMap((group) => group.items)
            .find((item) => item.key === itemKey) ?? null;
        if (!missingItem || missingItem.status === "missing") return batch;

        itemName = missingItem.name;
        const replacement = nextAvailableListing(
          batch,
          missingItem.itemId,
          usedListingKeys,
        );
        exhausted = !replacement;

        let nextShoppingList = batch.shoppingList.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.key === itemKey
              ? {
                  ...item,
                  status: "missing" as const,
                  note: replacement ? "Missing." : "Missing. Refresh needed.",
                }
              : item,
          ),
        }));

        if (replacement) {
          const replacementItem = buildReplacementCartItem({
            batch,
            listing: replacement,
            missingItem,
          });
          replaced = true;
          const replacementGroup = nextShoppingList.find(
            (group) => group.world === replacement.world,
          );
          if (replacementGroup) {
            nextShoppingList = nextShoppingList.map((group) =>
              group.world === replacement.world
                ? {
                    ...group,
                    items: [...group.items, replacementItem],
                    worldTotal: group.worldTotal + replacementItem.totalPrice,
                  }
                : group,
            );
          } else {
            nextShoppingList = [
              ...nextShoppingList,
              {
                world: replacement.world,
                items: [replacementItem],
                worldTotal: replacementItem.totalPrice,
              },
            ];
          }
        }

        return {
          ...batch,
          shoppingList: nextShoppingList,
        };
      });
    });

    if (replaced) {
      toast.success(`${itemName} replacement added.`, {
        position: MEOWKET_TOAST_POSITION,
      });
    } else if (exhausted) {
      toast.error(`${itemName} needs a refresh.`, {
        description: "No replacement listing is left.",
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

  return {
    addCalculationToCart,
    cartBatches,
    cartSummary,
    clearCart,
    markCartItemMissing,
    removeCartBatch,
    setCartItemBought,
    setCartStopBought,
  };
}
