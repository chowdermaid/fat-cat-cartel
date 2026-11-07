import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { minorityChestCount, minorityWinners } from "../../../../../functions/src/cartel-gil-rush-model";
import type { EventController, SharedEvent } from "../../types";
import { minorityPrizes } from "../../constants";
import { chestArtwork } from "../../chestArtwork";
import { useMinorityAssignments } from "../../hooks/useMinorityAssignments";
import { MinorityChest } from "./MinorityChest";
import { HostSelect } from "./HostSelect";

export function MinorityGame({ current, run, disabled, saving = false, canEdit = false, hostToken = null }: { current: SharedEvent; run: EventController["run"]; disabled: boolean; saving?: boolean; canEdit?: boolean; hostToken?: string | null }) {
  const game = current.minigame!;
  const privateState = useMinorityAssignments(hostToken, game.id, canEdit);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ choices: Record<string, number>; revision: number } | null>(null);
  const [deathrollChest, setDeathrollChest] = useState("");
  const draw = game.kind === "minority-draw";
  const chests = Array.from({ length: minorityChestCount(game.kind) }, (_, index) => index + 1);
  const allRevealed = game.chestReveals.length === chests.length;
  const winner = game.minorityDrawWinner ?? null;
  const tied = draw && allRevealed && winner === null ? minorityWinners(game.chestReveals.flatMap(row => row.playerIds.map(id => ({ id, chest: row.chest })))) : [];
  const choices = draft?.choices ?? Object.fromEntries(privateState.saved?.choices.map(choice => [choice.id, choice.chest]) ?? []);
  const locked = !!privateState.saved?.locked || game.chestReveals.length > 0;
  const busy = disabled || privateState.loading || privateState.pending;
  const ready = current.players.every(player => chests.includes(choices[player.id]));
  function edit(change: { choices: Record<string, number> }) {
    setDraft({ revision: draft?.revision ?? privateState.saved?.revision ?? 0, ...change });
  }
  return <div className="space-y-4">
    <div className={draw ? "grid grid-cols-1 gap-3 @[500px]:grid-cols-3" : "grid grid-cols-2 gap-3 @[700px]:grid-cols-4"}>
      {chests.map(chest => <MinorityChest key={chest} chest={chest} reveal={game.chestReveals.find(row => row.chest === chest)} players={current.players} assignedPlayerIds={draw ? undefined : game.treasureAssignments?.choices.filter(choice => choice.chest === chest).map(choice => choice.id) ?? game.chestReveals.find(row => row.chest === chest)?.playerIds ?? []} drawStatus={!draw ? undefined : winner !== null ? winner === chest ? "winner" : "no-prize" : !allRevealed ? "pending" : tied.includes(chest) ? "tie" : "no-prize"} canReveal={canEdit} disabled={busy || saving || !privateState.saved || !!draft} onReveal={() => void run({ type: "reveal-minority-chest", gameId: game.id, chest })} />)}
    </div>
    {draw && winner !== null && <p role="status" className="font-semibold text-amber-800 dark:text-amber-200">Chest {winner} wins. Each player in that chest has been awarded 200,000 gil and a golden die.</p>}
    {draw && tied.length > 1 && <section aria-label="Deathroll tie-break" className="space-y-3 border-l-4 border-amber-500 pl-4">
      <p className="font-semibold">Chests {tied.join(", ")} tie for the fewest players.</p>
      <p className="text-sm text-muted-foreground">Each tied group picks a champion. Chow hosts the deathroll.</p>
      {canEdit && <div className="flex flex-wrap items-center gap-3"><div className="w-full @[600px]:w-60"><HostSelect label="Deathroll-winning chest" value={deathrollChest} options={tied.map(chest => ({ value: String(chest), label: `Chest ${chest}` }))} onChange={setDeathrollChest} disabled={busy} /></div><Button className="min-h-11" disabled={busy || saving || !tied.includes(Number(deathrollChest))} onClick={() => void run({ type: "resolve-minority-draw", gameId: game.id, chest: Number(deathrollChest) })}>Award winning chest</Button></div>}
    </section>}
    {canEdit && <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" className="min-h-11" disabled={busy}>{draft ? "Save assignment edits" : privateState.saved ? "View chest assignments" : "Record chest assignments"}</Button></DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-xl">
        <DialogHeader><DialogTitle>{draw ? "Private chest assignments" : "Chest assignments"}</DialogTitle><DialogDescription>{draw ? "Saved assignments are visible only to hosts. Reveal each chest from the game screen." : "Saving makes assigned players visible to everyone. Prizes stay hidden until you reveal each chest."}</DialogDescription></DialogHeader>
        <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[50dvh]"><div className="space-y-3 pr-3">
          {current.players.map(player => <fieldset key={player.id} className="space-y-2 border-b pb-3"><legend className="text-sm font-bold">{player.name}</legend><div className={draw ? "grid grid-cols-3 gap-2" : "grid grid-cols-4 gap-2"}>{chests.map(chest => <Button key={chest} variant={choices[player.id] === chest ? "default" : "outline"} aria-pressed={choices[player.id] === chest} aria-label={`${player.name}: chest ${chest}`} disabled={busy || locked} onClick={() => edit({ choices: { ...choices, [player.id]: chest } })}><img src={chestArtwork[chest - 1]} alt="" className="size-5 object-contain" />{chest}</Button>)}</div></fieldset>)}
          {privateState.saved && !draw && <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">{privateState.saved.prizes.map((prize, index) => <li key={index}>Chest {index + 1}: {minorityPrizes.find(option => option.value === prize)?.label}</li>)}</ul>}
          <p className="text-xs text-muted-foreground">{draw ? "After all three reveals, the least-selected occupied chest wins. Ties go to a deathroll hosted by Chow." : "Prizes shuffle once per minigame."} Assignments lock when the first reveal begins.</p>
        </div></ScrollArea>
        <p className="text-sm text-muted-foreground">{current.players.filter(player => choices[player.id]).length} / {current.players.length} assigned</p>
        {privateState.error && <p role="alert" className="text-sm text-destructive">{privateState.error} Your draft is retained.</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy || saving} onClick={async () => { if (await privateState.reload()) setDraft(null); }}>Reload saved assignments</Button>{!locked && <Button className="min-h-11" disabled={busy || saving || !ready} onClick={async () => {
          if (await privateState.save(current.players.map(player => ({ id: player.id, chest: choices[player.id] })), draft?.revision ?? privateState.saved?.revision ?? 0)) { setDraft(null); setOpen(false); }
        }}>Save assignments</Button>}</div>
      </DialogContent>
    </Dialog>}
    {canEdit && privateState.error && !open && <p role="alert" className="text-sm text-destructive">{privateState.error}</p>}
  </div>;
}
