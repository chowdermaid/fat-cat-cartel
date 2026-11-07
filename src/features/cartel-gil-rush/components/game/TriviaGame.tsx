import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventController, SharedEvent } from "../../types";
import { PlayerAvatar } from "./PlayerAvatar";

export function TriviaGame({ current, run, disabled, saving = false, canEdit = false }: { current: SharedEvent; run: EventController["run"]; disabled: boolean; saving?: boolean; canEdit?: boolean }) {
  const game = current.minigame!;
  const teams = JSON.stringify(game.teams);
  const [draft, setDraft] = useState<{ A: string; B: string; teams: string; failed: boolean } | null>(null);
  const finalised = !!game.triviaWinnings;
  const ready = game.teams.length === current.players.length && ["A", "B"].every(team => game.teams.some(row => row.team === team));
  const winnings = { A: Number(draft?.A ?? 0), B: Number(draft?.B ?? 0) };
  const valid = (["A", "B"] as const).every(team => { const value = draft?.[team] ?? "0"; return value.trim() !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0; });
  return <form className="@container space-y-5" onSubmit={async event => {
    event.preventDefault();
    if (!canEdit || !ready || !valid || finalised || disabled || saving) return;
    if (draft && !draft.failed && draft.teams !== teams) { setDraft({ ...draft, failed: true }); return; }
    if (!await run({ type: "finalise-trivia", gameId: game.id, winnings }, current.revision)) {
      setDraft(previous => ({ A: previous?.A ?? "0", B: previous?.B ?? "0", teams: previous?.teams ?? teams, failed: true }));
    }
  }}>
    {canEdit && !finalised && <Button type="button" variant="outline" className="min-h-11" disabled={disabled || saving || current.players.length < 2} onClick={async () => {
      if (await run({ type: "shuffle-trivia", gameId: game.id })) setDraft(null);
    }}><Shuffle aria-hidden="true" className="size-4" />Shuffle into two teams</Button>}
    <div className="grid gap-4 @[700px]:grid-cols-2">
      {(["A", "B"] as const).map(team => {
        const players = game.teams.filter(row => row.team === team).map(row => current.players.find(player => player.id === row.id)!);
        return <section key={team} data-game-transition={`team:${game.id}:${team}:${players.map(player => player.id).join(",")}:${game.triviaWinnings?.[team] ?? "pending"}`} aria-label={`Team ${team}`} className={`@container min-w-0 rounded-lg border p-4 @[1000px]:p-5 ${team === "A" ? "border-blue-500/70 bg-blue-500/10" : "border-amber-500/70 bg-amber-500/10"}`}>
          <div className="mb-5 flex items-center justify-between gap-3"><h4 className="flex items-center gap-2 font-serif text-xl font-bold"><span aria-hidden="true" className={`size-2.5 rounded-full ${team === "A" ? "bg-blue-500" : "bg-amber-500"}`} />Team {team}</h4><span className="text-sm text-muted-foreground">{players.length} {players.length === 1 ? "player" : "players"}</span></div>
          <ul className="grid gap-x-4 gap-y-3 @[420px]:grid-cols-2">{players.map(player => <li key={player.id} className="flex min-w-0 items-center gap-3"><PlayerAvatar player={player} className="size-14" /><span className="min-w-0 text-sm font-semibold break-words">{player.name}</span></li>)}</ul>
          {!players.length && <p className="text-sm text-muted-foreground">Shuffle players to form the teams.</p>}
          {canEdit && <label className="mt-5 block space-y-2 border-t pt-4 text-sm font-semibold"><span>Team {team} winnings per player (gil)</span><Input aria-label={`Team ${team} winnings per player (gil)`} type="number" inputMode="numeric" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required className="h-11 text-base" value={game.triviaWinnings?.[team] ?? draft?.[team] ?? "0"} disabled={disabled || finalised} onChange={event => {
            const value = event.target.value;
            setDraft(previous => ({ A: previous?.A ?? "0", B: previous?.B ?? "0", teams: previous?.failed ? teams : previous?.teams ?? teams, failed: false, [team]: value }));
          }} /></label>}
        </section>;
      })}
    </div>
    {canEdit && draft?.failed && !finalised && <p role="alert" className="text-sm text-destructive">Not finalised. Review the latest teams and gil totals, then retry. Your winnings are retained.</p>}
    {canEdit && !finalised && <div className="flex justify-end"><Button type="submit" className="min-h-11" disabled={disabled || saving || !ready || !valid}>{draft?.failed ? "Retry finalising" : "Finalise game & add gil"}</Button></div>}
  </form>;
}
