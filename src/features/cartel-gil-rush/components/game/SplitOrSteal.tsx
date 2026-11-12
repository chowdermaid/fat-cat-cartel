import { useState } from "react";
import { Check, Coins, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { splitPayouts } from "../../../../../functions/src/cartel-gil-rush-model";
import type { SplitDecision } from "../../../../../functions/src/cartel-gil-rush-model";
import type { EventController, SharedEvent } from "../../types";
import { tileArtwork } from "../../tileArtwork";
import { EventBanner } from "../EventBanner";
import { SplitParticipant } from "./SplitParticipant";

export function SplitOrSteal({ current, run, disabled, saving = false, canEdit = false }: { current: SharedEvent; run: EventController["run"]; disabled: boolean; saving?: boolean; canEdit?: boolean }) {
  const [draft, setDraft] = useState<{ key: string; first: SplitDecision | ""; second: SplitDecision | ""; failed: boolean } | null>(null);
  const challenge = current.splitChallenge;
  const result = current.splitResult;
  const challenger = result?.challenger ?? challenge?.challenger ?? "";
  const partner = result?.partner ?? challenge?.partner ?? "";
  const key = `${challenge?.id}:${challenger}:${partner}`;
  const choices = draft?.key === key ? draft : null;
  const history = current.splitPartners.filter(pair => pair.challenger === challenger);
  const eligible = current.players.filter(player => player.id !== challenger && !history.some(pair => pair.partner === player.id));
  const ready = !!challenger && !!partner && !!choices?.first && !!choices?.second;
  function choose(field: "first" | "second", value: SplitDecision) {
    setDraft({ key, first: choices?.first ?? "", second: choices?.second ?? "", failed: false, [field]: value });
  }

  if (!challenge && !result) return null;

  return <section data-game-transition={result ? undefined : "split-panel"} aria-labelledby="split-heading" className="@container space-y-5">
    <div data-game-transition="split-header"><EventBanner label="Game effect" title="Split or Steal" headingId="split-heading" image={tileArtwork.chocobo} className="bg-[#FFB45F]" actions={canEdit ? <Button variant="outline" size="sm" className="h-7 border-black/25 bg-transparent px-2.5 text-xs text-[#191b17] shadow-none hover:bg-black/10 hover:text-[#191b17]" disabled={disabled || saving} onClick={() => void run({ type: "clear-split" })}>{result ? "Clear result" : "Cancel challenge"}</Button> : undefined} /></div>
    <div data-split-layout="portraits" className="relative mx-auto grid w-full max-w-[1100px] grid-cols-2 items-start gap-x-4 gap-y-6 py-6 @[900px]:grid-cols-[minmax(0,1fr)_190px_minmax(0,1fr)] @[900px]:gap-x-6" aria-live="polite">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-32 hidden border-t border-muted-foreground/35 @[900px]:block @[1100px]:top-[136px]" />
      {[challenger, partner].map((id, index) => <SplitParticipant
        key={index}
        index={index}
        player={current.players.find(player => player.id === id)}
        options={index === 0 ? current.players : eligible}
        choice={choices?.[index === 0 ? "first" : "second"] ?? ""}
        decision={result ? index === 0 ? result.challengerDecision : result.partnerDecision : null}
        amount={result ? splitPayouts(result)[index] : null}
        canEdit={canEdit}
        selectionDisabled={disabled || saving || (index === 1 && !challenger)}
        choiceDisabled={disabled || !challenger || !partner}
        onSelect={value => { if (challenge) void run({ type: "set-split-players", challengeId: challenge.id, challenger: index === 0 ? value : challenger, partner: index === 0 ? null : value }); }}
        onChoose={value => choose(index === 0 ? "first" : "second", value)}
      />)}
      <div className="relative z-10 col-span-2 row-start-2 mx-auto flex w-full max-w-sm items-center justify-center gap-7 @[900px]:col-span-1 @[900px]:col-start-2 @[900px]:row-start-1 @[900px]:max-w-none @[900px]:flex-col @[900px]:gap-16 @[900px]:pt-20 @[1100px]:pt-[88px]">
        <div aria-label="200,000 gil pot" className="flex shrink-0 flex-col items-center gap-2 bg-background px-3">
          <Coins aria-hidden="true" className="size-12 stroke-[1.4] text-amber-700 dark:text-amber-300" />
          <p className="text-xl leading-7 font-extrabold whitespace-nowrap tabular-nums @[600px]:text-2xl">200,000 gil</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          {canEdit && !result && challenge ? <>
            <Button type="button" variant="outline" aria-label="Reveal both decisions" className="size-20 rounded-full border-2 border-amber-600 bg-transparent p-0 text-amber-700 shadow-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-45 dark:border-amber-300 dark:text-amber-300 dark:hover:bg-amber-400/10" disabled={disabled || saving || !ready} onClick={async () => {
              if (disabled || saving || !ready || !choices?.first || !choices.second) return;
              if (!await run({ type: "reveal-split", challengeId: challenge.id, challengerDecision: choices.first, partnerDecision: choices.second }, current.revision)) setDraft({ ...choices, failed: true });
            }}><Eye aria-hidden="true" className="size-8 stroke-[1.5]" /></Button>
            <span aria-hidden="true" className="text-center text-xs text-muted-foreground @[600px]:text-sm">{choices?.failed ? "Retry reveal" : "Reveal together"}</span>
          </> : <>
            <div aria-hidden="true" className={`flex size-20 items-center justify-center rounded-full border-2 ${result ? "border-amber-600 text-amber-700 dark:border-amber-300 dark:text-amber-300" : "border-border text-muted-foreground"}`}>{result ? <Check className="size-8" /> : <Eye className="size-8 stroke-[1.5]" />}</div>
            <span data-game-transition={result ? "split-receipt" : undefined} role="status" className="text-center text-xs text-muted-foreground @[600px]:text-sm">{result ? "Revealed" : "Awaiting reveal"}</span>
          </>}
        </div>
      </div>
    </div>
    {canEdit && choices?.failed && !result && <p role="alert" className="text-center text-sm text-destructive">Could not reveal. Review the latest players and gil totals, then retry. Your decisions are retained.</p>}
  </section>;
}
