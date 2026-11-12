import { Check, Circle, CircleHelp, EyeOff, Hand, VenetianMask } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SplitDecision } from "../../../../../functions/src/cartel-gil-rush-model";
import type { SharedPlayer } from "../../types";
import { HostSelect } from "./HostSelect";
import { PlayerAvatar } from "./PlayerAvatar";

interface SplitParticipantProps {
  index: number;
  player?: SharedPlayer;
  options: SharedPlayer[];
  choice: SplitDecision | "";
  decision: SplitDecision | null;
  amount: number | null;
  canEdit: boolean;
  selectionDisabled: boolean;
  choiceDisabled: boolean;
  onSelect: (id: string) => void;
  onChoose: (decision: SplitDecision) => void;
}

export function SplitParticipant({ index, player, options, choice, decision, amount, canEdit, selectionDisabled, choiceDisabled, onSelect, onChoose }: SplitParticipantProps) {
  const role = index === 0 ? "Landing player" : "Partner";
  const DecisionIcon = decision === "steal" ? VenetianMask : Hand;
  return <article aria-label={role} data-game-transition={decision ? undefined : `split-player:${index}:${player?.id ?? ""}`} className={`relative z-10 row-start-1 flex min-w-0 flex-col items-center text-center ${index === 0 ? "col-start-1" : "col-start-2 @[900px]:col-start-3"}`}>
    <p className="min-h-5 text-sm font-medium text-muted-foreground">{role}</p>
    <div data-game-transition={`split-portrait:${index}:${player?.id ?? ""}`} className="mt-3 shrink-0">
      {player ? <PlayerAvatar player={player} className="size-28 border-2 border-border/70 @[600px]:size-36 @[1100px]:size-40" /> : <div className="flex size-28 items-center justify-center rounded-full border-2 border-border bg-muted @[600px]:size-36 @[1100px]:size-40"><CircleHelp aria-hidden="true" className="size-10 text-muted-foreground" /></div>}
    </div>
    <div className="mt-3 flex min-h-11 w-full max-w-72 min-w-0 items-center justify-center">
      {canEdit && !decision ? <HostSelect label={role} value={player?.id ?? ""} options={options.map(option => ({ value: option.id, label: option.name }))} disabled={selectionDisabled} onChange={onSelect} triggerClassName="h-auto justify-center gap-2 rounded-sm border-transparent px-1 py-1 text-center text-base font-bold shadow-none hover:bg-muted/50 @[600px]:text-xl [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:break-words" /> : <h4 className="min-w-0 text-base leading-snug font-bold break-words @[600px]:text-xl">{player?.name ?? "Waiting for player"}</h4>}
    </div>
    <div className="mt-4 flex min-h-40 w-full max-w-[280px] flex-col items-center @[600px]:min-h-24">
      {decision ? <>
        <p data-game-transition={`split-decision:${index}:${decision}`} className={`flex min-h-11 items-center justify-center gap-2 text-lg font-extrabold @[600px]:text-xl ${decision === "steal" ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}><DecisionIcon aria-hidden="true" className="size-6" />{decision === "split" ? "Split" : "Steal"}</p>
        <p data-game-transition={`split-payout:${index}:${amount}`} className={`mt-2 text-2xl leading-tight font-extrabold break-words tabular-nums @[600px]:text-3xl ${amount ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{(amount ?? 0).toLocaleString("en-AU")} gil</p>
      </> : canEdit ? <>
        <div className="grid w-full grid-cols-1 gap-2 @[600px]:grid-cols-2" aria-label={`Private decision for ${player?.name ?? role.toLowerCase()}`}>
          {(["split", "steal"] as const).map(value => {
            const Icon = value === "split" ? Hand : VenetianMask;
            return <Button key={value} type="button" variant="outline" aria-pressed={choice === value} aria-label={`${role}: ${value}`} disabled={choiceDisabled} onClick={() => onChoose(value)} className={`min-h-11 gap-2 rounded-full px-3 text-sm font-bold shadow-none @[600px]:text-base ${choice === value ? "border-amber-600 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-300 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25" : "border-muted-foreground/50 bg-transparent hover:bg-muted"}`}><Icon aria-hidden="true" className="size-5 shrink-0" />{value === "split" ? "Split" : "Steal"}</Button>;
          })}
        </div>
        <p className={`mt-3 flex min-h-5 items-center justify-center gap-2 text-xs @[600px]:text-sm ${choice ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{choice ? <Check aria-hidden="true" className="size-4 shrink-0" /> : <Circle aria-hidden="true" className="size-4 shrink-0" />}{choice ? "Choice recorded" : "Awaiting choice"}</p>
      </> : <p className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"><EyeOff aria-hidden="true" className="size-4 shrink-0" />Decision hidden</p>}
    </div>
  </article>;
}
