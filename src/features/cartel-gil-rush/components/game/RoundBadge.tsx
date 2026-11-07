import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RoundBadge({ round, compact = false }: { round: number; compact?: boolean }) {
  return <span data-round-display={round} className={cn(
    badgeVariants({ variant: "outline" }),
    "max-w-full min-w-0 justify-center whitespace-normal border-amber-600/60 bg-amber-100 text-amber-950 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-100",
    compact ? "gap-1.5 px-2 py-1" : "min-h-14 gap-3 rounded-lg border-2 px-4 py-2",
  )}>
    <span className={`shrink-0 font-extrabold tracking-wider uppercase ${compact ? "text-[10px]" : "text-xs"}`}>Round</span>{" "}
    <span className={`min-w-0 font-serif leading-none font-black break-all tabular-nums ${compact ? "text-lg" : "text-3xl"}`}>{round}</span>
  </span>;
}
