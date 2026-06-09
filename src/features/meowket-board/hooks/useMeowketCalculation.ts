import { useState } from "react";
import { toast } from "sonner";
import { calculateMeowketProfit } from "../api/meowketFunctions";
import { MEOWKET_TOAST_POSITION } from "../constants";
import type { MeowketItemSearchResult, MeowketProfitResult } from "../types";
import { formatGil, formatQuantity } from "../utils/formatting";

export function useMeowketCalculation({
  includeChildMaterials,
  quantity,
  selectedItem,
  sessionToken,
  setQuantity,
}: {
  includeChildMaterials: boolean;
  quantity: number;
  selectedItem: MeowketItemSearchResult | null;
  sessionToken: string | null | undefined;
  setQuantity: (quantity: number) => void;
}) {
  const [calculation, setCalculation] = useState<MeowketProfitResult | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState("");
  const [lastCalculatedAt, setLastCalculatedAt] = useState<number | null>(null);

  async function calculate(
    ownedOverride: Record<number, number>,
    options: { showSuccessToast?: boolean } = { showSuccessToast: true },
  ) {
    if (!selectedItem) return;
    setCalculating(true);
    setCalculationError("");
    try {
      const result = await calculateMeowketProfit(sessionToken ?? null, {
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
          description: `${formatQuantity(result.item.sellQuantity)} crafted item${result.item.sellQuantity === 1 ? "" : "s"} - ${formatGil(result.estimatedMaterialCost)} material cost`,
          position: MEOWKET_TOAST_POSITION,
        });
      }
    } catch (error) {
      setCalculation(null);
      const message =
        error instanceof Error ? error.message : "Meowket calculation failed.";
      setCalculationError(message);
      toast.error("Meowket calculation failed.", {
        description: message,
        position: MEOWKET_TOAST_POSITION,
      });
    } finally {
      setCalculating(false);
    }
  }

  function resetCalculation() {
    setCalculation(null);
    setCalculationError("");
    setLastCalculatedAt(null);
  }

  return {
    calculate,
    calculation,
    calculationError,
    calculating,
    lastCalculatedAt,
    resetCalculation,
    setCalculation,
    setCalculationError,
    setLastCalculatedAt,
  };
}
