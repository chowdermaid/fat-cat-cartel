import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventController } from "../../types";

export function RoundControl({ round, run, disabled }: { round: number; run: EventController["run"]; disabled: boolean }) {
  const [draft, setDraft] = useState(String(round));
  return (
    <div className="flex flex-wrap items-center gap-1">
    <Button variant="outline" size="icon" className="size-8" aria-label="Previous round" title="Previous round" disabled={disabled || round === 1} onClick={() => void run({ type: "set-round", round: round - 1 })}><ChevronLeft aria-hidden="true" className="size-4" /></Button>
    <Popover>
      <PopoverTrigger asChild><Button variant="ghost" size="sm" className="px-2 font-bold" disabled={disabled} aria-label={`Change round, currently round ${round}`}>Round {round}</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-[min(340px,calc(100vw-2rem))] space-y-3">
      <h2 className="font-serif text-xl font-bold">Change round</h2>
      <form className="flex flex-wrap items-center gap-2" onSubmit={async (event) => { event.preventDefault(); if (draft.trim()) await run({ type: "set-round", round: Number(draft) }); }}>
        <Input type="number" inputMode="numeric" min={1} max={Number.MAX_SAFE_INTEGER} step={1} aria-label="Round number" className="h-11 w-24 text-center" value={draft} onChange={(event) => setDraft(event.target.value)} required disabled={disabled} />
        <Button type="submit" className="min-h-11" disabled={disabled || !draft.trim() || draft === String(round)}>Set round</Button>
      </form>
      </PopoverContent>
    </Popover>
    <Button variant="outline" size="icon" className="size-8" aria-label="Next round" title="Next round" disabled={disabled || round === Number.MAX_SAFE_INTEGER} onClick={() => void run({ type: "set-round", round: round + 1 })}><ChevronRight aria-hidden="true" className="size-4" /></Button>
    </div>
  );
}
