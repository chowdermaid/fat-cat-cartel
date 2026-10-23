import { useRef, useState } from "react";
import { Check, Ellipsis, Plus, RotateCcw, Shuffle, Trash2, Undo2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { EventController, EventView } from "../types";
import { EventHeader } from "./EventHeader";
import { CrewHand } from "./game/CrewHand";

interface EventHostPanelProps {
  event: EventController;
  view: EventView;
  onViewChange: (view: EventView) => void;
}

export function EventHostPanel({ event: { history, error, run }, view, onViewChange }: EventHostPanelProps) {
  const { current, previous } = history;
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [name, setName] = useState("");
  const [swapMember, setSwapMember] = useState<string | null>(null);
  const overflowTrigger = useRef<HTMLButtonElement>(null);
  const live = current.phase === "live";

  function selectMember(id: string) {
    if (!swapMember) setSwapMember(id);
    else {
      if (swapMember !== id) run({ type: "swap", first: swapMember, second: id });
      setSwapMember(null);
    }
  }

  return (
    <>
      <EventHeader view={view} onBackToGame={() => onViewChange("game")}>
        <div className="flex flex-wrap items-center gap-2 @[900px]:justify-end">
          {!live && <p className="mr-2 text-sm text-muted-foreground">{current.crews.length > 0 ? `${current.crews.length} crews · ` : ""}{current.attendees.length} players</p>}
          <Dialog open={attendeesOpen} onOpenChange={setAttendeesOpen}>
            <DialogTrigger asChild><Button variant={live ? "ghost" : current.attendees.length === 0 ? "default" : "outline"} className={`min-h-11 ${live ? "text-muted-foreground" : ""}`} aria-label={live ? `View attendees (${current.attendees.length} players)` : undefined}><Users aria-hidden="true" className="size-4" />{live ? `${current.crews.length} crews · ${current.attendees.length} players` : current.attendees.length === 0 ? "Add attendees" : "Manage attendees"}</Button></DialogTrigger>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center">
              <DialogHeader className="pr-10 text-left"><DialogTitle>{live ? "Attendees" : "Manage attendees"}</DialogTitle><DialogDescription>{live ? "Crews are locked. Attendees cannot be edited during play." : "Add character names. Changing attendees clears unconfirmed pairings."}</DialogDescription></DialogHeader>
              {!live && <form className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                if (run({ type: "add", id: crypto.randomUUID(), name })) { setName(""); setSwapMember(null); }
              }}>
                <Input aria-label="Character name" placeholder="Character name" className="h-11 min-w-0" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
                <Button type="submit" className="min-h-11" disabled={!name.trim()}><Plus aria-hidden="true" className="size-4" />Add</Button>
              </form>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[45dvh]">
                {live ? <ul className="divide-y pr-3">
                  {current.attendees.map((person) => <li key={person.id} className="py-3 text-sm break-words [overflow-wrap:anywhere]">{person.name}</li>)}
                </ul> : <div className="space-y-2 pr-3">
                  {current.attendees.length === 0 && <p className="py-4 text-sm text-muted-foreground">No attendees yet. Add at least two to make a crew.</p>}
                  {current.attendees.map((person) => (
                    <form key={`${person.id}-${person.name}`} className="flex items-center gap-1" onSubmit={(event) => {
                      event.preventDefault();
                      const value = new FormData(event.currentTarget).get("name");
                      if (typeof value === "string" && run({ type: "rename", id: person.id, name: value })) setSwapMember(null);
                    }}>
                      <Input name="name" defaultValue={person.name} maxLength={80} className="h-11 min-w-0" aria-label={`Rename ${person.name}`} />
                      <TooltipProvider delayDuration={300}>
                        <Tooltip><TooltipTrigger asChild><Button type="submit" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Save name for ${person.name}`}><Check aria-hidden="true" className="size-4" /></Button></TooltipTrigger><TooltipContent>Save name</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Remove ${person.name}`} onClick={() => { if (run({ type: "remove", id: person.id })) setSwapMember(null); }}><Trash2 aria-hidden="true" className="size-4" /></Button></TooltipTrigger><TooltipContent>Remove attendee</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </form>
                  ))}
                </div>}
              </ScrollArea>
              <Button variant="outline" className="min-h-11 shrink-0" onClick={() => setAttendeesOpen(false)}>Done</Button>
            </DialogContent>
          </Dialog>
          {!live && current.attendees.length >= 2 && <Button variant={current.phase === "preview" ? "outline" : "default"} className="min-h-11" onClick={() => { if (run({ type: "shuffle" })) setSwapMember(null); }}><Shuffle aria-hidden="true" className="size-4" />{current.phase === "preview" ? "Reshuffle pairs" : "Randomise pairs"}</Button>}
          {current.phase === "preview" && <Button className="min-h-11" aria-describedby="pairing-confirmation-note" onClick={() => { if (run({ type: "start" })) setSwapMember(null); }}><Check aria-hidden="true" className="size-4" />Confirm crews &amp; deal</Button>}
          {previous && <Button variant="outline" className="min-h-11" onClick={() => { if (run({ type: "undo" })) setSwapMember(null); }}><Undo2 aria-hidden="true" className="size-4" />Undo last action</Button>}
          <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
            <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><PopoverTrigger asChild><Button ref={overflowTrigger} variant="outline" size="icon" className="size-11" aria-label="Event options"><Ellipsis aria-hidden="true" className="size-5" /></Button></PopoverTrigger></TooltipTrigger><TooltipContent>Event options</TooltipContent></Tooltip></TooltipProvider>
            <PopoverContent align="end" className="w-48 p-1" onCloseAutoFocus={(event) => { if (resetOpen) event.preventDefault(); }}>
              <Button variant="ghost" className="min-h-11 w-full justify-start" onClick={() => { setOverflowOpen(false); setResetOpen(true); }}><RotateCcw aria-hidden="true" className="size-4" />Reset event</Button>
            </PopoverContent>
          </Popover>
        </div>
      </EventHeader>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center" onCloseAutoFocus={(event) => { event.preventDefault(); overflowTrigger.current?.focus(); }}>
          <DialogHeader className="pr-10 text-left"><DialogTitle>Reset this event?</DialogTitle><DialogDescription>This clears attendees, pairings and held cards in this browser. You can undo the reset until your next action.</DialogDescription></DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="destructive" className="min-h-11" onClick={() => { if (run({ type: "reset" })) { setResetOpen(false); setSwapMember(null); setName(""); } }}>Reset event</Button></div>
        </DialogContent>
      </Dialog>
      {error && !attendeesOpen && !resetOpen && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <TabsContent value="game" forceMount data-event-view="game" className="pt-5">
        {current.phase === "setup" && (
          <section aria-labelledby="setup-heading" className="py-8">
            <Users aria-hidden="true" className="mb-4 size-10 text-amber-700 dark:text-primary" />
            <h2 id="setup-heading" className="font-serif text-2xl font-bold">Gather your crew</h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{current.attendees.length === 0 ? "Add attendees to get started, then randomise pairs. Each crew shares one position and one hand." : `${current.attendees.length} attendees ready. ${current.attendees.length < 2 ? "Add at least one more to make a crew." : "Randomise pairs to preview your crews."}`}</p>
            {current.attendees.length % 2 === 1 && current.attendees.length >= 3 && <p className="mt-2 text-sm text-muted-foreground">One crew will be a trio, with the same two-card hand limit.</p>}
          </section>
        )}
        {current.phase === "preview" && <p id="pairing-confirmation-note" className="mb-5 max-w-prose text-sm leading-relaxed text-muted-foreground">Preview only. Select two members to swap them, or reshuffle. Confirming locks crews and deals one random card each.</p>}
        <div className="grid gap-x-8 @[1000px]:grid-cols-[repeat(auto-fit,minmax(480px,1fr))] @[1000px]:gap-x-10">
          {current.crews.map((crew, index) => <CrewHand key={crew.id} crew={crew} index={index} attendees={current.attendees} live={live} selectedMember={swapMember} onSelectMember={selectMember} run={run} />)}
        </div>
      </TabsContent>
    </>
  );
}
