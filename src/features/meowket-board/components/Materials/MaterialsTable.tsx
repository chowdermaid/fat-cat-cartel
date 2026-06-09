import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStaggeredEntrance } from "../../hooks/useMeowketAnimations";
import type { MeowketMaterial } from "../../types";
import { MaterialRow } from "./MaterialRow";

export function MaterialsTable({
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
              return (
                <MaterialRow
                  key={material.itemId}
                  calculating={calculating}
                  material={material}
                  owned={owned}
                  ownedDisplay={ownedMaterialDisplays[material.itemId]}
                  onOwnedChange={onOwnedChange}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
