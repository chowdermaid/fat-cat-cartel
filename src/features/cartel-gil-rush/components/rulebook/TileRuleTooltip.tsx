import type { ReactElement } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Portal as TooltipPortal } from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { chocoboMovementRules, tileMovementRules } from "../../constants";
import type { Tile } from "../../types";
import { RuleText } from "./RuleText";

export function TileRuleTooltip({ kind, title, children }: { kind: Tile["id"] | "finish"; title: string; children: ReactElement }) {
  return <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipPortal><TooltipContent side="bottom" collisionPadding={12} className="max-w-[min(22rem,calc(100vw-1.5rem))] space-y-1.5 p-3">
      <p className="font-semibold">{title}</p>
      {kind === "chocobo" ? <div className="space-y-3 text-sm leading-relaxed">
        <p><RuleText text={chocoboMovementRules.partner} /></p>
        <ul className="list-disc space-y-2 pl-4">
          {chocoboMovementRules.outcomes.map(outcome => <li key={outcome}><RuleText text={outcome} /></li>)}
        </ul>
      </div> : <p className="text-sm leading-relaxed"><RuleText text={tileMovementRules[kind]} moveIcon={kind === "ladder" ? ArrowUp : kind === "red-arrow" ? ArrowDown : ArrowRight} /></p>}
    </TooltipContent></TooltipPortal>
  </Tooltip>;
}
