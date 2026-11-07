import { useState } from "react";
import { CircleHelp, Hand, Sparkles, VenetianMask } from "lucide-react";
import { Button } from "@/components/ui/button";
import { splitPayouts } from "../../../../../functions/src/cartel-gil-rush-model";
import type { SplitDecision } from "../../../../../functions/src/cartel-gil-rush-model";
import type { EventController, SharedEvent } from "../../types";
import { tileArtwork } from "../../tileArtwork";
import { HostSelect } from "./HostSelect";
import { PlayerAvatar } from "./PlayerAvatar";

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

  return <section data-game-transition={result ? undefined : "split-panel"} aria-labelledby="split-heading" className="@container space-y-5 border-t pt-5">
    <header data-game-transition="split-header" className="flex items-center gap-4"><img src={tileArtwork.chocobo} alt="" className="size-20 shrink-0 object-contain" /><div className="min-w-0 space-y-1"><p className="text-xs font-extrabold tracking-[0.2em] text-amber-800 uppercase dark:text-amber-300">Chocobo challenge</p><h3 id="split-heading" className="font-serif text-3xl leading-tight font-black @[850px]:text-4xl">Split or Steal</h3></div></header>
    <div className="grid gap-4 @[900px]:grid-cols-2" aria-live="polite">
      {[challenger, partner].map((id, index) => {
        const player = current.players.find(player => player.id === id);
        const decision = result ? index === 0 ? result.challengerDecision : result.partnerDecision : null;
        const DecisionIcon = decision === "steal" ? VenetianMask : Hand;
        const amount = result ? splitPayouts(result)[index] : null;
        const field = index === 0 ? "first" : "second";
        return <article key={index} data-game-transition={result ? undefined : `split-player:${index}:${id}`} aria-label={index === 0 ? "Landing player" : "Partner"} className={`@container min-h-56 min-w-0 rounded-lg border-2 p-5 @[1200px]:p-6 ${decision === "steal" ? "border-amber-500/70 bg-[#382509] text-amber-50" : decision === "split" ? "border-sky-400/60 bg-[#10243f] text-sky-50" : "border-slate-500/60 bg-[#172231] text-slate-50"}`}>
          <p className="mb-3 text-xs font-extrabold tracking-[0.16em] text-white/70 uppercase">{index === 0 ? "Landing player" : "Partner"}</p>
          {canEdit && !result && challenge && <div className="mb-5"><HostSelect label={index === 0 ? "Landing player" : "Partner"} value={id} options={(index === 0 ? current.players : eligible).map(player => ({ value: player.id, label: player.name }))} disabled={disabled || saving || (index === 1 && !challenger)} onChange={value => void run({ type: "set-split-players", challengeId: challenge.id, challenger: index === 0 ? value : challenger, partner: index === 0 ? null : value })} /></div>}
          <div className="flex min-w-0 flex-wrap items-center gap-4 @[450px]:flex-nowrap">
            <div data-game-transition={`split-portrait:${index}:${id}`} className="shrink-0 text-foreground">{player ? <PlayerAvatar player={player} className="size-24 border-2 border-white/30 @[450px]:size-28" /> : <div className="flex size-24 items-center justify-center rounded-full border-2 border-white/25 bg-white/5"><CircleHelp aria-hidden="true" className="size-10 text-white/60" /></div>}</div>
            <div className="min-w-0 flex-1 space-y-3"><h4 className="font-serif text-2xl leading-snug font-black break-words @[450px]:text-3xl">{player?.name ?? "Waiting for player"}</h4>
              {decision ? <p data-game-transition={`split-decision:${index}:${decision}`} className={`flex min-h-12 items-center gap-3 text-2xl font-black uppercase ${decision === "steal" ? "text-amber-200" : "text-sky-100"}`}><DecisionIcon aria-hidden="true" className="size-10 shrink-0 stroke-[1.75]" />{decision}</p> : <p className="inline-flex min-h-12 items-center rounded-md border border-white/15 bg-black/15 px-3 text-sm font-semibold text-white/70">Decision hidden</p>}
            </div>
            <div className="min-w-0 w-full border-t border-white/20 pt-4 @[450px]:w-auto @[450px]:border-t-0 @[450px]:border-l @[450px]:pl-5 @[450px]:pt-0"><p className="text-xs font-extrabold tracking-wider text-white/70 uppercase">Receives</p><div className="relative"><p data-game-transition={amount === null ? undefined : `split-payout:${index}:${amount}`} className={`mt-2 text-3xl leading-tight font-black break-words tabular-nums @[450px]:text-4xl ${amount ? "text-amber-200" : "text-white"}`}>{amount === null ? <span className="text-sm font-semibold text-white/60">Awaiting reveal</span> : `${amount.toLocaleString("en-AU")} gil`}</p>{!!amount && <span aria-hidden="true" data-game-transition={`split-celebration:${index}:${amount}`} className="pointer-events-none absolute -top-3 -right-1 text-amber-200 opacity-0"><Sparkles className="size-7" /></span>}</div></div>
          </div>
          {canEdit && !result && <div className="mt-5 flex flex-wrap gap-2 border-t border-white/20 pt-4" aria-label={`Private decision for ${player?.name ?? (index === 0 ? "landing player" : "partner")}`}>
            {(["split", "steal"] as const).map(value => {
              const Icon = value === "split" ? Hand : VenetianMask;
              return <Button key={value} type="button" variant={choices?.[field] === value ? "default" : "outline"} className={`min-h-11 flex-1 text-base font-bold ${choices?.[field] === value ? "border-amber-400 bg-amber-400 text-[#201504] hover:bg-amber-300" : "border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"}`} aria-pressed={choices?.[field] === value} aria-label={`${index === 0 ? "Landing player" : "Partner"}: ${value}`} disabled={disabled || !challenger || !partner} onClick={() => choose(field, value)}><Icon aria-hidden="true" className="size-5" />{value === "split" ? "Split" : "Steal"}</Button>;
            })}
          </div>}
        </article>;
      })}
    </div>
    {result ? <div className="space-y-4"><p data-game-transition="split-receipt" className="text-sm text-muted-foreground">Payouts added to gil totals. Clearing keeps payouts and partner history.</p>{canEdit && <Button variant="outline" className="min-h-11 border-amber-600/60 text-amber-800 dark:text-amber-300" disabled={disabled || saving} onClick={() => void run({ type: "clear-split" })}>Clear result</Button>}</div> : canEdit && challenge ? <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Only hosts see the decision buttons. Choices stay private until Submit reveals both and adds the payouts.</p>
      {choices?.failed && <p role="alert" className="text-sm text-destructive">Could not reveal. Review the latest players and gil totals, then retry. Your decisions are retained.</p>}
      <div className="flex flex-wrap gap-2"><Button className="min-h-12 bg-amber-400 px-6 text-base font-extrabold text-[#201504] hover:bg-amber-300" disabled={disabled || saving || !ready} onClick={async () => {
        if (disabled || saving || !ready || !choices?.first || !choices.second) return;
        if (!await run({ type: "reveal-split", challengeId: challenge.id, challengerDecision: choices.first, partnerDecision: choices.second }, current.revision)) setDraft({ ...choices, failed: true });
      }}>Submit &amp; reveal</Button><Button variant="ghost" disabled={disabled || saving} onClick={() => void run({ type: "clear-split" })}>Cancel challenge</Button></div>
    </div> : <p role="status" className="text-sm text-muted-foreground">Waiting for the host to reveal both decisions.</p>}
  </section>;
}
