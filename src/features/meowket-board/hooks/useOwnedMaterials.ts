import { useState } from "react";
import { toast } from "sonner";
import { MEOWKET_TOAST_POSITION } from "../constants";
import type { MeowketMaterial } from "../types";
import { selectedWorldSummary } from "../utils/materialDisplay";

export function useOwnedMaterials({
  onRecalculate,
}: {
  onRecalculate: (ownedMaterials: Record<number, number>) => void;
}) {
  const [ownedMaterials, setOwnedMaterials] = useState<Record<number, number>>(
    {},
  );
  const [ownedMaterialDisplays, setOwnedMaterialDisplays] = useState<
    Record<number, { world: string; summary: string }>
  >({});

  function resetOwnedMaterials() {
    setOwnedMaterials({});
    setOwnedMaterialDisplays({});
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
    onRecalculate(nextOwnedMaterials);
  }

  return {
    ownedMaterialDisplays,
    ownedMaterials,
    resetOwnedMaterials,
    setMaterialOwned,
    setOwnedMaterials,
  };
}
