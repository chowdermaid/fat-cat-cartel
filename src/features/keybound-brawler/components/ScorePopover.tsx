import { useEffect, useRef, useState } from "react";
import { Circle, LoaderCircle, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { RANK_CLASSES } from "../constants";
import type { useScoreEditor } from "../hooks/useScoreEditor";
import type { RankedMember } from "../types";
import { parseScoreDraft } from "../utils/scores";

export function ScorePopover({ member, editor }: { member: RankedMember; editor: ReturnType<typeof useScoreEditor> }) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"right" | "bottom">("right");
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  const value = draft ?? String(member.bestScore ?? "");
  const parsed = parseScoreDraft(value);
  const changed = parsed.error !== null || parsed.value !== member.bestScore;
  const saving = editor.savingId === member.lodestoneId;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function cancel() {
    if (saving) return;
    setDraft(null);
    setError(null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (saving) return;
      if (nextOpen && trigger.current) {
        const button = trigger.current;
        const room = button.ownerDocument.documentElement.clientWidth - button.getBoundingClientRect().right;
        setSide(room >= 324 ? "right" : "bottom");
      }
      setOpen(nextOpen);
    }}>
      <PopoverTrigger ref={trigger} asChild>
        <Button variant="ghost" disabled={editor.savingId !== null} aria-label={`Edit best score for ${member.name}`} className={cn("group -mx-2 h-auto min-h-11 max-w-full justify-start gap-2 border border-transparent px-2 py-1 font-mono text-sm font-normal whitespace-normal tabular-nums hover:border-primary/40 hover:bg-primary/5 @[640px]:text-xl", member.bestScore === null && "font-sans text-xs text-muted-foreground @[640px]:text-sm")}>
          <span className={cn("min-w-0 break-all", RANK_CLASSES[member.rank ?? 0])}>{member.bestScore === null ? "No score" : member.bestScore.toLocaleString("en-AU")}</span>
          {changed ? <Circle className="size-2 shrink-0 fill-current text-amber-600 dark:text-amber-400" aria-label="Unsaved score change" /> : <Pencil className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-primary group-focus-visible:text-primary" aria-hidden="true" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" sideOffset={8} collisionPadding={12} className="w-[min(300px,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] space-y-3" aria-label={`Edit score for ${member.name}`}>
        <h3 className="text-sm font-semibold break-words [overflow-wrap:anywhere]">{member.name}</h3>
        <form className="min-w-0 space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          if (!changed || parsed.error || editor.savingId !== null) return;
          setError(null);
          try {
            const saved = await editor.save(member, value);
            if (saved && mounted.current) {
              setDraft(null);
              setOpen(false);
            }
          } catch (cause) {
            if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not save this score. Your draft has been kept.");
          }
        }}>
          <label htmlFor={`score-${member.lodestoneId}`} className="block text-xs font-semibold text-muted-foreground">Best score</label>
          <Input id={`score-${member.lodestoneId}`} aria-label={`Best score for ${member.name}`} aria-invalid={Boolean(parsed.error)} aria-describedby={`score-help-${member.lodestoneId}${parsed.error || error ? ` score-error-${member.lodestoneId}` : ""}`} inputMode="numeric" autoComplete="off" value={value} disabled={saving} className="h-11 font-mono text-base md:text-base" onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }} />
          <p id={`score-help-${member.lodestoneId}`} className="text-xs text-muted-foreground">Saved: {member.bestScore === null ? "No score" : member.bestScore.toLocaleString("en-AU")}. Leave empty to clear.</p>
          {(parsed.error || error) && <p id={`score-error-${member.lodestoneId}`} role="alert" className="text-xs break-words text-destructive">{parsed.error ?? error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" disabled={saving} onClick={cancel}>Cancel</Button>
            <Button type="submit" className="h-11" disabled={editor.savingId !== null || !changed || Boolean(parsed.error)}>
              {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{saving ? "Saving..." : error ? "Retry" : "Save"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
