import { useState } from "react";
import { Coins, Dices, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAMAZU_EFFECTS } from "../../../../../functions/src/cartel-gil-rush-namazu";
import type { EventController, SharedEvent } from "../../types";
import { tileArtwork } from "../../tileArtwork";
import { PlayerAvatar } from "./PlayerAvatar";
import { RuleText } from "../rulebook/RuleText";
import { EventBanner } from "../EventBanner";

export function NamazuPanel({ current, run, canEdit, disabled, saving = false }: { current: SharedEvent; run: EventController["run"]; canEdit: boolean; disabled: boolean; saving?: boolean }) {
  const [roll, setRoll] = useState("");
  const encounter = current.namazu;
  if (!encounter) return null;
  const player = current.players.find(player => player.id === encounter.target);
  const busy = disabled || saving;
  const randomTarget = [5, 6, 8].includes(encounter.effect);
  const validRoll = roll.trim() !== "" && Number.isInteger(Number(roll)) && Number(roll) >= 1 && Number(roll) <= 6;
  return <section aria-labelledby="namazu-heading" data-game-transition={`namazu:${encounter.id}`} className="@container space-y-5">
    <EventBanner label="Game effect" title="Event!" headingId="namazu-heading" image={tileArtwork.namazu} className="bg-[#E8B58C]" actions={canEdit ? <Button variant="outline" size="sm" className="h-7 border-black/25 bg-transparent px-2.5 text-xs text-[#191b17] shadow-none hover:bg-black/10 hover:text-[#191b17]" disabled={busy} onClick={() => void run({ type: "clear-namazu", encounterId: encounter.id })}>End event</Button> : undefined}>
      <p aria-live="polite" data-game-transition={`namazu-effect:${encounter.id}:${encounter.effect}`} className="text-base leading-relaxed font-semibold @[850px]:text-lg"><RuleText text={NAMAZU_EFFECTS[encounter.effect - 1]} /></p>
    </EventBanner>
    <div aria-live="polite" className="space-y-4">
      {randomTarget && <div className="flex flex-wrap items-center gap-3">
        {player && <div data-game-transition={`namazu-target:${encounter.id}:${encounter.targetDraw}`} className="flex min-w-0 flex-1 items-center gap-3"><PlayerAvatar player={player} className="size-16" /><p className="min-w-0 text-xl font-bold break-words">{player.name}</p></div>}
        {canEdit && <Button variant="outline" className="min-h-11" disabled={busy || (encounter.effect === 6 && current.players.length < 2)} onClick={() => void run({ type: "reroll-namazu-target", encounterId: encounter.id }, current.revision)}>{player ? <RotateCcw aria-hidden="true" className="size-4" /> : <Dices aria-hidden="true" className="size-4" />}{player ? "Reroll player" : "Randomise player"}</Button>}
      </div>}
      {canEdit && encounter.effect === 7 && <form className="flex flex-wrap items-end gap-3" onSubmit={async event => {
        event.preventDefault();
        if (!canEdit || busy || !validRoll || encounter.payout) return;
        await run({ type: "award-namazu-gil", encounterId: encounter.id, roll: Number(roll) }, current.revision);
      }}>
        <label className="space-y-2 text-sm font-semibold"><span className="block">/random 6 result</span><Input type="number" inputMode="numeric" min={1} max={6} step={1} required aria-label="Namazu /random 6 result" value={encounter.payout?.roll ?? roll} onChange={event => setRoll(event.target.value)} disabled={disabled || !!encounter.payout} className="h-11 w-32" /></label>
        <Button type="submit" className="min-h-11" disabled={busy || !validRoll || !!encounter.payout}><Coins aria-hidden="true" className="size-4" />{encounter.payout ? "Gil added" : validRoll ? `Add ${(Number(roll) * 10_000).toLocaleString("en-AU")} gil each` : "Add gil"}</Button>
      </form>}
    </div>
  </section>;
}
