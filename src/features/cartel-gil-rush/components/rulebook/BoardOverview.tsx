import { useState } from "react";
import { Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { boardConnections } from "../../boardData";
import { tiles } from "../../constants";
import { tileArtwork } from "../../tileArtwork";
import { BoardGrid } from "./board/BoardGrid";

export function BoardOverview({ active }: { active: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRoute = boardConnections.find(({ id }) => id === selected);
  const select = (id: string) => setSelected((current) => current === id ? null : id);

  return (
    <section aria-labelledby="board-overview-heading" className="space-y-4" onKeyDown={(event) => { if (event.key === "Escape") setSelected(null); }}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="board-overview-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Board Overview</h2>
        <p className="ml-auto text-right text-xs leading-relaxed text-muted-foreground">
          Layout and original idea by{" "}
          <a href="https://housingsnap.com/46367" target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground/40 underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Thornhart</a>.
        </p>
      </header>
      <ScrollArea className="w-full min-w-0" viewportClassName="overscroll-x-contain overscroll-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <BoardGrid active={active} selected={selected} onSelect={select} />
      </ScrollArea>
      <ul aria-label="Board symbols" className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-4 gap-y-2 px-1 text-xs font-semibold @[640px]:px-7">
        {tiles.map(({ id, name }) => <li key={id} className="flex items-center gap-2"><img src={tileArtwork[id]} alt="" className="size-6 object-contain" />{name}</li>)}
        <li className="flex items-center gap-2"><Crown aria-hidden="true" className="size-6 text-amber-700 dark:text-[#ffd331]" />Finish</li>
      </ul>
      <p role="status" className="sr-only">{selectedRoute ? `${selectedRoute.kind === "ladder" ? "Ladder" : "Fall"} from ${selectedRoute.from} to ${selectedRoute.to} selected. Press Escape or select it again to show every route.` : "No route selected."}</p>
    </section>
  );
}
