import { useState } from "react";
import { Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { boardConnections } from "../../boardData";
import { tiles } from "../../constants";
import { tileArtwork } from "../../tileArtwork";
import { BoardGrid } from "./board/BoardGrid";
import { TileRuleTooltip } from "./TileRuleTooltip";

export function BoardOverview({ active, headingId = "board-overview-heading", gamePage = false, onChocoboClick, chocoboDisabled = false }: { active: boolean; headingId?: string; gamePage?: boolean; onChocoboClick?: () => void; chocoboDisabled?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRoute = boardConnections.find(({ id }) => id === selected);
  const select = (id: string) => setSelected((current) => current === id ? null : id);

  return (
    <section data-game-transition={gamePage ? "guide" : undefined} aria-labelledby={headingId} className="space-y-4" onKeyDown={(event) => { if (event.key === "Escape") setSelected(null); }}>
      <header className={gamePage ? "text-center" : "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2"}>
        <h2 id={headingId} tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">{gamePage ? "Guide" : "Board Overview"}</h2>
        {!gamePage && <p className="ml-auto text-right text-xs leading-relaxed text-muted-foreground">
          Layout and original idea by{" "}
          <a href="https://housingsnap.com/46367" target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Thornhart</a>.
        </p>}
      </header>
      <ScrollArea className="w-full min-w-0" viewportClassName="overscroll-x-contain overscroll-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <BoardGrid active={active} selected={selected} onSelect={select} onChocoboClick={onChocoboClick} chocoboDisabled={chocoboDisabled} />
      </ScrollArea>
      <TooltipProvider delayDuration={200}>
        <ul aria-label="Board symbols" className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-4 gap-y-2 px-1 text-xs font-semibold @[640px]:px-7">
          {tiles.map(({ id, name }) => <li key={id}><TileRuleTooltip kind={id} title={name}><span tabIndex={0} className="flex cursor-help items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"><img src={tileArtwork[id]} alt="" className="size-6 object-contain" />{name}</span></TileRuleTooltip></li>)}
          <li><TileRuleTooltip kind="finish" title="Crown / finish"><span tabIndex={0} className="flex cursor-help items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"><Crown aria-hidden="true" className="size-6 text-amber-700 dark:text-[#ffd331]" />Finish</span></TileRuleTooltip></li>
        </ul>
      </TooltipProvider>
      <p role="status" className="sr-only">{selectedRoute ? `${selectedRoute.kind === "ladder" ? "Ladder" : "Fall"} from ${selectedRoute.from} to ${selectedRoute.to} selected. Press Escape or select it again to show every route.` : "No route selected."}</p>
    </section>
  );
}
