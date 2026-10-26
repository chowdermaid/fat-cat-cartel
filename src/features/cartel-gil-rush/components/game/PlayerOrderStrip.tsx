import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventController, SharedPlayer } from "../../types";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerGilInput } from "./PlayerGilInput";

export function PlayerOrderStrip({ players, live, revision, run, disabled }: { players: SharedPlayer[]; live: boolean; revision: number; run: EventController["run"]; disabled: boolean }) {
  return (
    <section aria-labelledby="player-order-heading" className="min-w-0 border-b pl-2 pr-1 py-2 @[900px]:border-r @[900px]:border-b-0">
      <h2 id="player-order-heading" className="mb-2 border-l-[3px] border-transparent px-1 py-2 font-serif text-xl font-bold text-blue-900 dark:text-blue-200">{live ? "Turn order" : "Players"}</h2>
      <ScrollArea role="region" tabIndex={0} aria-label={live ? "Fixed player turn order" : "Players before randomisation"} className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring" viewportClassName="@[900px]:max-h-[calc(100dvh-15rem)]" onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input, button, [role=combobox]")) return;
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        const viewport = event.currentTarget.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
        if (!viewport) return;
        event.preventDefault();
        if (event.key === "Home" || event.key === "End") viewport.scrollTo({ left: event.key === "Home" ? 0 : viewport.scrollWidth, top: event.key === "Home" ? 0 : viewport.scrollHeight });
        else if (event.key === "ArrowUp" || event.key === "ArrowDown") viewport.scrollBy({ top: event.key === "ArrowDown" ? 72 : -72 });
        else viewport.scrollBy({ left: event.key === "ArrowRight" ? 144 : -144 });
      }}>
        <ol className="flex w-max min-w-full gap-2 pb-3 @[900px]:w-auto @[900px]:flex-col @[900px]:gap-1 @[900px]:pb-0">
          {players.map((player, index) => {
            const identity = <>
              {live && <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/50 font-serif text-sm font-bold text-muted-foreground">{index + 1}</span>}
              <PlayerAvatar player={player} className="size-10" />
              <span className="min-w-0 @[900px]:flex-1">
                <span className="block text-sm leading-snug font-bold break-words text-blue-950 [overflow-wrap:anywhere] dark:text-blue-100">{player.name}</span>
                {live && <span className="mt-1 flex flex-wrap items-center justify-center gap-1 text-xs font-normal text-muted-foreground @[900px]:justify-start"><Coins aria-hidden="true" className="size-3 shrink-0" /><span className="break-all">{player.gilWon.toLocaleString("en-AU")} gil</span><Pencil aria-hidden="true" className="ml-1 size-3 shrink-0" /></span>}
              </span>
            </>;
            const rowClass = "flex h-auto min-h-11 w-full min-w-0 flex-col items-center gap-2 whitespace-normal rounded-sm border-l-[3px] border-transparent px-1 py-2 text-center @[900px]:flex-row @[900px]:text-left";
            return <li key={player.id} className="w-44 shrink-0 @[900px]:w-full">
              {live ? <PlayerGilInput player={player} revision={revision} run={run} disabled={disabled}>
                <Button variant="ghost" className={rowClass} disabled={disabled} aria-label={`Edit gil for ${player.name}, ${player.gilWon.toLocaleString("en-AU")} gil accrued`}>{identity}</Button>
              </PlayerGilInput> : <div className={rowClass}>{identity}</div>}
            </li>;
          })}
        </ol>
      </ScrollArea>
      {!live && <p className="mt-4 px-2 text-xs leading-relaxed text-muted-foreground">Order is randomised once when you start.</p>}
    </section>
  );
}
import { Coins, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
