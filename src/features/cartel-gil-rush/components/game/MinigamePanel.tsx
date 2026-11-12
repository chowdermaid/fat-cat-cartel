import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MinigameKind } from "../../../../../functions/src/cartel-gil-rush-model";
import { minigames } from "../../constants";
import type { EventController, SharedEvent } from "../../types";
import { HostSelect } from "./HostSelect";
import { TriviaGame } from "./TriviaGame";
import { MinorityGame } from "./MinorityGame";

export function MinigamePanel({ current, run, disabled, saving = false, canEdit = false, hostToken = null }: { current: SharedEvent; run: EventController["run"]; disabled: boolean; saving?: boolean; canEdit?: boolean; hostToken?: string | null }) {
  const [kind, setKind] = useState<MinigameKind>("trivia");
  const game = current.minigame;
  const reminderRound = Math.floor(current.round / 6) * 6;
  const reminderDue = current.phase === "live" && reminderRound > 0 && current.lastMinigameRound < reminderRound;
  if (game && game.kind !== "trivia" && game.kind !== "minority" && game.kind !== "minority-draw") return null;
  return <section data-game-transition={`minigame-panel:${game?.id ?? "waiting"}`} aria-labelledby="minigame-heading" className="space-y-4 border-t pt-5">
    <h3 id="minigame-heading" className="font-serif text-2xl font-bold">{game ? minigames.find(item => item.value === game.kind)?.label : "Group minigames"}</h3>
    {game ? <>
      {game.kind === "trivia" && <TriviaGame key={game.id} current={current} run={run} disabled={disabled} saving={saving} canEdit={canEdit} />}
      {(game.kind === "minority" || game.kind === "minority-draw") && <MinorityGame key={game.id} current={current} run={run} disabled={disabled} saving={saving} canEdit={canEdit} hostToken={hostToken} />}
    </> : canEdit ? <>
      {reminderDue && <p role="status" aria-label="Group minigame reminder" className="border-l-2 border-primary pl-3 text-sm leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Round {reminderRound}: time for a minigame.</span> Select a group minigame below when you’re ready.</p>}
      <div className="flex flex-wrap items-center gap-3"><div className="w-full @[600px]:w-64"><HostSelect label="Group minigame" value={kind} options={minigames} onChange={value => setKind(value as MinigameKind)} disabled={disabled} /></div><Button className="min-h-11" disabled={disabled || saving} onClick={() => void run({ type: "start-minigame", kind })}>Start minigame</Button></div>
    </> : <p className="text-sm text-muted-foreground">Waiting for the next group minigame.</p>}
  </section>;
}
