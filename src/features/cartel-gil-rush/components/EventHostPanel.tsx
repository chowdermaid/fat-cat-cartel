import { useRef, useState } from "react";
import { Ellipsis, RotateCcw, Shuffle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TabsContent } from "@/components/ui/tabs";
import { moods } from "../constants";
import { isEmptyGilRushEvent } from "../../../../functions/src/cartel-gil-rush-model";
import type { EventController, EventView } from "../types";
import { EventHeader } from "./EventHeader";
import { PlayerOrderStrip } from "./game/PlayerOrderStrip";
import { PlayerSetupDialog } from "./game/PlayerSetup";
import { RoundControl } from "./game/RoundControl";
import { MoodPanel } from "./game/MoodPanel";
import { QuickReference } from "./game/QuickReference";

interface EventHostPanelProps {
  event: EventController;
  view: EventView;
  onViewChange: (view: EventView) => void;
}

export function EventHostPanel({ event: { current, error, run, loading, pending, importable }, view, onViewChange }: EventHostPanelProps) {
  const [playersOpen, setPlayersOpen] = useState(false);
  const [playersVisited, setPlayersVisited] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowTrigger = useRef<HTMLButtonElement>(null);
  const resetRevision = useRef(current.revision);
  const live = current.phase === "live";
  const mood = current.mood ? moods[current.mood] : null;
  const disabled = loading || pending;

  return (
    <>
      <EventHeader view={view} onBackToGame={() => onViewChange("game")}>
        <div className="flex flex-wrap items-center gap-3 @[900px]:justify-end">
          <Dialog open={playersOpen && !live} onOpenChange={(open) => { setPlayersOpen(open); if (open) setPlayersVisited(true); }}>
            {!live && <DialogTrigger asChild><Button variant="outline" className="min-h-11" disabled={disabled}><Users aria-hidden="true" className="size-4" />{current.players.length ? "Manage players" : "Add players"}</Button></DialogTrigger>}
            {!live && playersVisited && <PlayerSetupDialog players={current.players} run={run} error={error} disabled={disabled} onClose={() => setPlayersOpen(false)} />}
          </Dialog>
          <span className="text-sm whitespace-nowrap text-muted-foreground">{current.players.length} players</span>
          <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
            <PopoverTrigger asChild><Button ref={overflowTrigger} variant="outline" size="icon" className="size-11" aria-label="Event options" disabled={disabled}><Ellipsis aria-hidden="true" className="size-5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1" onCloseAutoFocus={(event) => { if (resetOpen) event.preventDefault(); }}><Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => { resetRevision.current = current.revision; setOverflowOpen(false); setResetOpen(true); }}><RotateCcw aria-hidden="true" className="size-4" />Reset event</Button></PopoverContent>
          </Popover>
        </div>
      </EventHeader>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[calc(100%-2rem)] [&>button]:size-11" onCloseAutoFocus={(event) => { event.preventDefault(); overflowTrigger.current?.focus(); }}>
          <DialogHeader className="pr-10 text-left"><DialogTitle>Reset this event?</DialogTitle><DialogDescription>This clears players, order, mood, round and gil totals for every host. This cannot be undone.</DialogDescription></DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="destructive" className="min-h-11" disabled={disabled} onClick={async () => { if (await run({ type: "reset" }, resetRevision.current)) { setResetOpen(false); setPlayersOpen(false); setPlayersVisited(false); } else resetRevision.current = current.revision; }}>Reset event</Button></div>
        </DialogContent>
      </Dialog>
      {error && !playersOpen && !resetOpen && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <TabsContent value="game" forceMount data-event-view="game" className="grid min-h-[calc(100dvh-9rem)] @[900px]:grid-cols-[280px_minmax(0,1fr)] @[1400px]:grid-cols-[347px_minmax(0,1fr)]">
        {current.players.length ? <PlayerOrderStrip players={current.players} live={live} revision={current.revision} run={run} disabled={disabled} /> : <aside className="space-y-3 border-b px-6 py-7 @[900px]:border-r @[900px]:border-b-0"><Users aria-hidden="true" className="size-9 text-amber-700 dark:text-primary" /><h2 className="font-serif text-xl font-bold">Gather your players</h2><p className="text-sm leading-relaxed text-muted-foreground">Add members or guests, then randomise the order.</p></aside>}
        <div className="min-w-0 space-y-7 px-5 py-6 @[900px]:px-8 @[900px]:py-9">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-muted-foreground">
              {live ? <RoundControl key={current.round} round={current.round} run={run} disabled={disabled} /> : <span>Round 1</span>}
              {mood && <span className="border-l pl-4">{mood.name}</span>}
            </div>
          </div>
          <header data-event-reveal className="space-y-3">
            <h2 className="font-serif text-4xl leading-tight font-extrabold @[1100px]:text-5xl">{live ? "The rush is on." : "Ready to roll?"}</h2>
            <p className="text-lg leading-relaxed font-semibold text-muted-foreground @[1100px]:text-2xl">Roll <span className="font-extrabold text-amber-700 dark:text-[#ffd331]">/random 6</span> when the host calls your turn.</p>
          </header>
          {loading && <p role="status" className="text-sm text-muted-foreground">Loading shared event…</p>}
          {!loading && importable && isEmptyGilRushEvent(current) && <Button variant="outline" className="min-h-11" disabled={disabled} onClick={() => void run({ type: "import", event: importable })}>Import local event</Button>}
          <MoodPanel mood={current.mood} run={run} disabled={disabled} />
          {!live && <Button className="min-h-14 w-full whitespace-normal bg-[#ffd331] px-4 py-3 text-base font-extrabold text-[#191b17] hover:bg-[#f1c327] @[600px]:w-auto" disabled={disabled || !current.players.length} onClick={async () => { if (await run({ type: "start" })) setPlayersOpen(false); }}><Shuffle aria-hidden="true" className="size-5 shrink-0" />Randomise order &amp; start</Button>}
          <QuickReference />
        </div>
      </TabsContent>
    </>
  );
}
