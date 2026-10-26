import { useRef, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventController, SharedPlayer } from "../../types";

export function PlayerGilInput({ player, revision, run, disabled, children }: { player: SharedPlayer; revision: number; run: EventController["run"]; disabled: boolean; children: ReactNode }) {
  const [draft, setDraft] = useState<{ value: string; revision: number; failed: boolean } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "bottom">("right");
  const trigger = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);
  return (
    <Popover open={open} onOpenChange={nextOpen => {
      if (nextOpen && trigger.current) {
        const button = trigger.current;
        const room = button.ownerDocument.documentElement.clientWidth - button.getBoundingClientRect().right;
        setSide(room >= 324 ? "right" : "bottom");
      }
      setOpen(nextOpen);
    }}>
      <PopoverTrigger ref={trigger} asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" sideOffset={8} collisionPadding={12} className="w-[min(300px,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] space-y-3" aria-label={`Edit gil for ${player.name}`}>
      <h3 className="text-sm font-semibold break-words [overflow-wrap:anywhere]">{player.name}</h3>
    <form className="w-full min-w-0 space-y-2 text-left" onSubmit={async event => {
      event.preventDefault();
      if (!draft || saving.current) return;
      const gilWon = Number(draft.value);
      if (!draft.value.trim() || !Number.isSafeInteger(gilWon) || gilWon < 0) { setMessage("Enter a non-negative whole number."); return; }
      saving.current = true;
      try {
        const saved = await run({ type: "set-gil", id: player.id, gilWon }, draft.failed ? revision : draft.revision);
        if (saved) { setDraft(null); setMessage(null); setOpen(false); }
        else { setDraft({ ...draft, failed: true }); setMessage("Not saved. Review latest total, then retry."); }
      } finally { saving.current = false; }
    }}>
      <label htmlFor={`gil-${player.id}`} className="block text-xs font-semibold text-muted-foreground">Gil won</label>
      <div className="flex flex-wrap gap-1">
        <Input id={`gil-${player.id}`} aria-label={`Gil won by ${player.name}`} type="number" inputMode="numeric" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required disabled={disabled} value={draft?.value ?? String(player.gilWon)} className="h-11 min-w-0 w-full flex-1 basis-24 text-sm" onChange={event => {
          setDraft(previous => ({ value: event.target.value, revision: previous?.revision ?? revision, failed: false }));
          setMessage(null);
        }} />
        <Button type="submit" variant="outline" className="min-h-11 px-3 text-sm" disabled={disabled || !draft}><Save aria-hidden="true" className="size-4" />{draft?.failed ? "Retry" : "Save"}</Button>
      </div>
      {draft && <p className="break-words text-xs text-muted-foreground" aria-live="polite">Saved: {player.gilWon.toLocaleString("en-AU")} gil</p>}
      {message && <p role="alert" className="text-xs text-destructive">{message}</p>}
    </form>
      </PopoverContent>
    </Popover>
  );
}
