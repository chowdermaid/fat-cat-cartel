import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MeowketMaterial } from "../../types";
import { formatGil, formatQuantity } from "../../utils/formatting";
import {
  actualCostTooltip,
  effectiveUnitTooltip,
  materialLabel,
  materialSupplyStatus,
  ownedTooltip,
  selectedWorldSummary,
  surplusTooltip,
} from "../../utils/materialDisplay";
import { MathTooltip } from "../MathTooltip";
import { MaterialIcon } from "./MaterialIcon";

export function MaterialRow({
  calculating,
  material,
  onOwnedChange,
  owned,
  ownedDisplay,
}: {
  calculating: boolean;
  material: MeowketMaterial;
  onOwnedChange: (material: MeowketMaterial, checked: boolean) => void;
  owned: boolean;
  ownedDisplay?: { world: string; summary: string };
}) {
  const need = material.requiredQuantity ?? material.totalQuantity;
  const buy = owned
    ? 0
    : (material.purchasedQuantity ?? material.totalQuantity);
  const surplus = owned
    ? 0
    : (material.surplusQuantity ?? Math.max(0, buy - material.totalQuantity));
  const actualCost = owned ? 0 : (material.estimatedTotalCost ?? null);
  const effectiveUnitCost = owned ? 0 : material.effectiveUnitCost;

  return (
    <TableRow
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
      <TableCell className="text-right">{formatQuantity(need)}</TableCell>
      <TableCell className="text-right">{formatQuantity(buy)}</TableCell>
      <TableCell className="text-right">
        <MathTooltip
          content={owned ? ownedTooltip(material) : surplusTooltip(material)}
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
              ? (ownedDisplay?.summary ?? selectedWorldSummary(material))
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
          content={owned ? ownedTooltip(material) : actualCostTooltip(material)}
        >
          <span>{formatGil(actualCost)}</span>
        </MathTooltip>
      </TableCell>
      <TableCell className="text-right">
        <MathTooltip
          content={
            owned ? ownedTooltip(material) : effectiveUnitTooltip(material)
          }
        >
          <span>{formatGil(effectiveUnitCost)}</span>
        </MathTooltip>
      </TableCell>
    </TableRow>
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
