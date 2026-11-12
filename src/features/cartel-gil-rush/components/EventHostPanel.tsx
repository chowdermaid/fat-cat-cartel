import { useRef, useState } from "react";
import { Ellipsis, RotateCcw, Shuffle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TabsContent } from "@/components/ui/tabs";
import type { BingoController, EventController, EventView } from "../types";
import { EventHeader } from "./EventHeader";
import { MinigameSummary } from "./MinigameSummary";
import { PlayerOrderStrip } from "./game/PlayerOrderStrip";
import { PlayerSetupDialog } from "./game/PlayerSetup";
import { RoundControl } from "./game/RoundControl";
import { RoundBadge } from "./game/RoundBadge";
import { MinigamePanel } from "./game/MinigamePanel";
import { SplitOrSteal } from "./game/SplitOrSteal";
import { NamazuPanel } from "./game/NamazuPanel";
import { BoardOverview } from "./rulebook/BoardOverview";
import { BingoCard } from "./bingo/BingoCard";

interface EventHostPanelProps {
  event: EventController;
  view: EventView;
  onViewChange: (view: EventView) => void;
  canEdit: boolean;
  bingo: BingoController;
}

export function EventHostPanel({ event: { current, error, run, loading, pending, pendingKeys = [], hostToken }, view, onViewChange, canEdit, bingo }: EventHostPanelProps) {
  const [playersOpen, setPlayersOpen] = useState(false);
  const [playersVisited, setPlayersVisited] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowTrigger = useRef<HTMLButtonElement>(null);
  const resetRevision = useRef(current.revision);
  const live = current.phase === "live";
  const disabled = loading;
  const actionDisabled = loading || pending;

  return (
    <>
      <EventHeader view={view} onBackToGame={() => onViewChange("game")}>
        {canEdit ? <div className="flex flex-wrap items-center gap-3 @[900px]:justify-end">
          <Dialog open={playersOpen && !live} onOpenChange={(open) => { setPlayersOpen(open); if (open) setPlayersVisited(true); }}>
            {!live && <DialogTrigger asChild><Button variant="outline" className="min-h-11" disabled={disabled}><Users aria-hidden="true" className="size-4" />{current.players.length ? "Manage players" : "Add players"}</Button></DialogTrigger>}
            {!live && playersVisited && <PlayerSetupDialog players={current.players} run={run} error={error} disabled={disabled} pendingKeys={pendingKeys} onClose={() => setPlayersOpen(false)} />}
          </Dialog>
          <span className="text-sm whitespace-nowrap text-muted-foreground">{current.players.length} players</span>
          {pending && <span role="status" aria-live="polite" className="text-xs text-muted-foreground">Saving {pendingKeys.length || 1} {pendingKeys.length === 1 ? "change" : "changes"}&hellip;</span>}
          <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
            <PopoverTrigger asChild><Button ref={overflowTrigger} variant="outline" size="icon" className="size-11" aria-label="Event options" disabled={disabled}><Ellipsis aria-hidden="true" className="size-5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1" onCloseAutoFocus={(event) => { if (resetOpen) event.preventDefault(); }}><Button variant="ghost" className="min-h-11 w-full justify-start" disabled={actionDisabled} onClick={() => { resetRevision.current = current.revision; setOverflowOpen(false); setResetOpen(true); }}><RotateCcw aria-hidden="true" className="size-4" />Reset event</Button></PopoverContent>
          </Popover>
        </div> : <span className="text-sm text-muted-foreground">Live view · {current.players.length} players</span>}
      </EventHeader>
      {canEdit && <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[calc(100%-2rem)] [&>button]:size-11" onCloseAutoFocus={(event) => { event.preventDefault(); overflowTrigger.current?.focus(); }}>
          <DialogHeader className="pr-10 text-left"><DialogTitle>Reset this event?</DialogTitle><DialogDescription>This clears players, order, round, gil, minigames and partner history for every host. This cannot be undone.</DialogDescription></DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="destructive" className="min-h-11" disabled={actionDisabled} onClick={async () => { if (await run({ type: "reset" }, resetRevision.current)) { setResetOpen(false); setPlayersOpen(false); setPlayersVisited(false); } else resetRevision.current = current.revision; }}>Reset event</Button></div>
        </DialogContent>
      </Dialog>}
      {view === "game" && error && !playersOpen && !resetOpen && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <TabsContent value="game" forceMount data-event-view="game" className="grid min-h-[calc(100dvh-9rem)] @[900px]:grid-cols-[280px_minmax(0,1fr)] @[1400px]:grid-cols-[347px_minmax(0,1fr)]">
        {current.players.length ? <PlayerOrderStrip players={current.players} live={live} round={current.round} revision={current.revision} run={run} disabled={disabled} pendingKeys={pendingKeys} canEdit={canEdit} /> : <aside data-game-transition="empty-players" className="space-y-3 border-b px-6 py-7 @[900px]:border-r @[900px]:border-b-0"><Users aria-hidden="true" className="size-9 text-amber-700 dark:text-primary" /><h2 className="font-serif text-xl font-bold">{canEdit ? "Gather your players" : "Waiting for the host"}</h2><p className="text-sm leading-relaxed text-muted-foreground">{canEdit ? "Add members or guests, then randomise the order." : "The event is being prepared."}</p></aside>}
        {!live ? <div data-event-reveal data-game-transition="phase:setup" className="flex min-w-0 flex-col items-center justify-start gap-8 px-6 pt-10 pb-16 text-center @[900px]:pt-12">
          <h2 className="max-w-3xl font-serif text-4xl leading-tight font-extrabold text-primary @[600px]:text-5xl @[1100px]:text-6xl">Come back on the 13th of December!</h2>
          {canEdit && <Button className="min-h-14 max-w-full whitespace-normal bg-[#ffd331] px-4 py-3 text-base font-extrabold text-[#191b17] hover:bg-[#f1c327]" disabled={actionDisabled || !current.players.length} onClick={async () => { if (await run({ type: "start" })) setPlayersOpen(false); }}><Shuffle aria-hidden="true" className="size-5 shrink-0" />Randomise order &amp; start</Button>}
        </div> : <div className="min-w-0 space-y-7 px-5 py-6 @[900px]:px-8 @[900px]:py-9">
          <header data-event-reveal data-game-transition={`phase:${current.phase}`} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <h2 className="font-serif text-4xl leading-tight font-extrabold @[1100px]:text-5xl">{live ? "The rush is on." : "Ready to roll?"}</h2>
              <div data-game-transition={`round:${current.round}`} className="max-w-full min-w-0">
                {live && canEdit ? <RoundControl key={current.round} round={current.round} run={run} disabled={disabled || pendingKeys.includes("round")} /> : <span role="status" aria-live="polite" aria-atomic="true"><RoundBadge round={current.round} /></span>}
              </div>
            </div>
            <p className="text-lg leading-relaxed font-semibold text-muted-foreground @[1100px]:text-2xl">Roll <span className="font-extrabold text-amber-700 dark:text-[#ffd331]">/random 6</span> when the host calls your turn.</p>
            {live && current.minigame && <div data-game-transition={`minigame:${current.minigame.id}`} role="region" aria-label="Active group minigame" aria-live="polite"><MinigameSummary kind={current.minigame.kind} variant="banner" actions={canEdit ? <Button variant="outline" size="sm" className="h-7 border-black/25 bg-transparent px-2.5 text-xs text-[#191b17] shadow-none hover:bg-black/10 hover:text-[#191b17]" disabled={actionDisabled} onClick={() => void run({ type: "end-minigame" })}>End minigame</Button> : undefined} /></div>}
          </header>
          {loading && <p role="status" className="text-sm text-muted-foreground">Loading shared event…</p>}
          {live && <><NamazuPanel key={current.namazu?.id ?? "none"} current={current} run={run} canEdit={canEdit} disabled={disabled || pendingKeys.includes("namazu")} saving={pending} /><SplitOrSteal key={`${current.splitChallenge?.id}:${current.splitChallenge?.challenger}:${current.splitChallenge?.partner}`} current={current} run={run} disabled={disabled || pendingKeys.includes("split")} saving={pending} canEdit={canEdit} /><MinigamePanel current={current} run={run} disabled={disabled || pendingKeys.includes("minigame")} saving={pending} canEdit={canEdit} hostToken={hostToken} /></>}
          <div className="@container/guide">
            <div className="grid min-w-0 items-start gap-6 @min-[1260px]/guide:grid-cols-[minmax(0,1fr)_390px]">
              <BoardOverview active={view === "game"} headingId="game-board-overview-heading" gamePage onChocoboClick={canEdit ? () => void run({ type: "start-split" }) : undefined} chocoboDisabled={actionDisabled || !live || current.players.length < 2 || !!current.splitChallenge || !!current.splitResult} onNamazuClick={canEdit ? tile => void run({ type: "start-namazu", tile }) : undefined} namazuDisabled={actionDisabled || !live || !!current.namazu} />
              <BingoCard bingo={bingo} />
            </div>
          </div>
        </div>}
      </TabsContent>
    </>
  );
}
