import { Portal as TooltipPortal } from "@radix-ui/react-tooltip";
import goldenDice from "@/assets/cartel-gil-rush/golden-dice.png";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GOLDEN_DIE_DESCRIPTION } from "../../constants";

export function GoldenDieBadge({ focusable = true }: { focusable?: boolean }) {
  return <TooltipProvider delayDuration={200}><Tooltip>
    <TooltipTrigger asChild><span tabIndex={focusable ? 0 : undefined} role="img" aria-label={`Golden die: ${GOLDEN_DIE_DESCRIPTION}`} className="inline-flex size-8 shrink-0 cursor-help items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring"><img src={goldenDice} alt="" className="size-8 object-contain" /></span></TooltipTrigger>
    <TooltipPortal><TooltipContent side="right" className="max-w-60">{GOLDEN_DIE_DESCRIPTION}</TooltipContent></TooltipPortal>
  </Tooltip></TooltipProvider>;
}
