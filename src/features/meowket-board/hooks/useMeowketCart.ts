import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MEOWKET_TOAST_POSITION } from "../constants";
import type { MeowketCartBatch, MeowketProfitResult } from "../types";
import {
  buildCartBatch,
  buildCartSummary,
  canAddCalculationToCart,
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
    removeCartBatch,
  };
}
