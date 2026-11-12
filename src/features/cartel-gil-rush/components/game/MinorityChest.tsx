import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MinorityChestReveal } from "../../../../../functions/src/cartel-gil-rush-model";
import type { SharedPlayer } from "../../types";
import { minorityPrizes } from "../../constants";
import { chestArtwork } from "../../chestArtwork";
import { chestRevealProgress, chestRevealStepTime } from "../../utils/minorityReveal";
import { PlayerAvatar } from "./PlayerAvatar";

export function MinorityChest({ chest, reveal, players, assignedPlayerIds, canReveal, disabled, onReveal, drawStatus }: { chest: number; reveal?: MinorityChestReveal; players: SharedPlayer[]; assignedPlayerIds?: string[]; canReveal: boolean; disabled: boolean; onReveal: () => void; drawStatus?: "pending" | "tie" | "winner" | "no-prize" }) {
  const [progress, setProgress] = useState(() => chestRevealProgress(reveal));
  useEffect(() => {
    if (!reveal) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const next = media.matches ? reveal.playerIds.length + 1 : chestRevealProgress(reveal);
      setProgress(next);
      if (next <= reveal.playerIds.length) timer = setTimeout(update, Math.max(1, chestRevealStepTime(reveal, next + 1) - Date.now()));
    };
    update();
    media.addEventListener("change", update);
    const visible = () => { if (!document.hidden) update(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", visible); };
  }, [reveal]);
  const stage = reveal ? Math.max(progress, chestRevealProgress(reveal)) : 0;
  const complete = !!reveal && stage > reveal.playerIds.length;
  const celebrate = complete && (!drawStatus || drawStatus === "winner");
  const playerIds = assignedPlayerIds ?? reveal?.playerIds;
  return <section data-game-transition={`chest:${chest}`} className={`flex min-h-64 min-w-0 flex-col rounded-lg border p-4 text-center transition-colors duration-1000 motion-reduce:transition-none ${celebrate ? "border-amber-600 bg-amber-500/10" : "bg-muted/30"}`} aria-label={`Chest ${chest}`}>
    <div className="relative mx-auto mb-2 size-16">
      <img data-game-transition={reveal ? `chest-opening:${reveal.revealedAt}` : undefined} src={chestArtwork[chest - 1]} alt="" className="relative size-16 object-contain" />
    </div>
    <h4 className="font-bold">Chest {chest}</h4>
    <div aria-live="polite" className="mt-3 flex-1 space-y-3">
      {!playerIds ? <p className="text-sm text-muted-foreground">Choices hidden</p> : <>
        {playerIds.length === 0 && assignedPlayerIds && <p className="text-sm text-muted-foreground">No players assigned</p>}
        <ul className="space-y-2 text-sm">{playerIds.map((id, index) => {
          if (assignedPlayerIds === undefined && index >= stage) return <li key={id} aria-hidden="true" className="h-10" />;
          const player = players.find(player => player.id === id);
          return player ? <li key={id} data-game-transition={`chest-player:${id}`} className="flex min-h-10 min-w-0 items-center gap-2 text-left"><PlayerAvatar player={player} className="size-9" /><span className="min-w-0 break-words">{player.name}</span></li> : null;
        })}</ul>
        {reveal && <p aria-hidden={complete || undefined} className="min-h-5 text-sm text-muted-foreground">{complete ? null : stage === 0 ? "Opening the chest…" : assignedPlayerIds || stage === reveal.playerIds.length ? "Revealing the prize…" : "Revealing players…"}</p>}
      </>}
    </div>
    <div aria-live="polite" className="mt-auto flex min-h-15 items-end justify-center pt-4">
      {complete && (drawStatus ? <p data-game-transition={drawStatus === "winner" ? `chest-prize:minority-draw:${chest}` : undefined} className={`flex items-center justify-center gap-2 text-sm font-bold ${drawStatus === "winner" ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"}`}>{drawStatus === "winner" ? <><Coins aria-hidden="true" className="size-5 shrink-0" /><span>300,000 gil</span></> : drawStatus === "tie" ? "Deathroll tie-break" : drawStatus === "pending" ? "Awaiting all chests" : "No prize"}</p> : <p data-game-transition={`chest-prize:${reveal.prize}`} className="flex items-center justify-center gap-2 text-base font-bold text-amber-800 dark:text-amber-200"><Coins aria-hidden="true" className="size-5 shrink-0" />{minorityPrizes.find(prize => prize.value === reveal.prize)?.label ?? "Prize no longer available"}</p>)}
      {!reveal && canReveal && <Button className="min-h-11 w-full whitespace-normal" variant="outline" disabled={disabled} onClick={onReveal}>Reveal chest {chest}</Button>}
    </div>
  </section>;
}
