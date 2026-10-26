import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMembers } from "@/hooks/useMembers";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Member } from "@/types";
import type { EventController, Player } from "../../types";
import { PlayerAvatar } from "./PlayerAvatar";

interface PlayerSetupProps {
  players: Player[];
  run: EventController["run"];
  disabled: boolean;
}

export function PlayerSetupDialog({ players, run, error, onClose, disabled }: PlayerSetupProps & { error: string | null; onClose: () => void }) {
  const members = useMembers();
  return (
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col [&>button]:size-11">
      <DialogHeader className="pr-10 text-left"><DialogTitle>Manage players</DialogTitle><DialogDescription>Choose members or add guests. Starting randomises and locks the order.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[60dvh] [&>div]:!block"><div className="pr-3"><PlayerSetup players={players} run={run} members={members} disabled={disabled} /></div></ScrollArea>
      <Button variant="outline" className="min-h-11 shrink-0" onClick={onClose}>Done</Button>
    </DialogContent>
  );
}

function PlayerSetup({ players, run, members, disabled }: PlayerSetupProps & { members: Record<string, Member> }) {
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const visibleMembers = Object.entries(members).filter(([, member]) => member.name.toLowerCase().includes(search.toLowerCase())).sort(([, a], [, b]) => a.name.localeCompare(b.name));

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5">
      <section aria-labelledby="roster-heading" className="space-y-3">
        <h3 id="roster-heading" className="text-sm font-semibold">Choose roster members</h3>
        <Input aria-label="Search roster members" placeholder="Search members and Friends" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11" />
        <ScrollArea className="h-48" viewportClassName="h-full [&>div]:!block">
          <ul className="divide-y pr-3">
            {visibleMembers.map(([rosterId, member]) => {
              const selected = players.some((player) => player.rosterId === rosterId || player.name.toLowerCase() === member.name.trim().replace(/\s+/g, " ").toLowerCase());
              return <li key={rosterId}>
                <Button variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-2 py-2 text-left" disabled={selected} onClick={() => run({ type: "add", player: { id: crypto.randomUUID(), rosterId, name: member.name, avatarUrl: member.avatarUrl ?? null } })}>
                  <PlayerAvatar player={member} />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{member.name}<span className="block text-xs text-muted-foreground">{member.fcRank === "Friend" ? "Friend" : member.server}</span></span>
                  {selected ? <><Check aria-hidden="true" className="size-4 shrink-0" /><span className="sr-only">Already added</span></> : <><Plus aria-hidden="true" className="size-4 shrink-0" /><span className="sr-only">Add player</span></>}
                </Button>
              </li>;
            })}
            {visibleMembers.length === 0 && <li className="py-3 text-sm text-muted-foreground">{search ? "No matching roster members." : "No roster members available yet. You can add a guest below."}</li>}
          </ul>
        </ScrollArea>
      </section>
      <form className="space-y-2 border-t pt-4" onSubmit={async (event) => {
        event.preventDefault();
        if (await run({ type: "add", player: { id: crypto.randomUUID(), name: guestName, avatarUrl: null } })) setGuestName("");
      }}>
        <label htmlFor="guest-name" className="text-sm font-semibold">Add a guest</label>
        <div className="flex gap-2"><Input id="guest-name" placeholder="Character name" value={guestName} maxLength={80} onChange={(event) => setGuestName(event.target.value)} className="h-11 min-w-0" /><Button type="submit" className="min-h-11" disabled={!guestName.trim()}><Plus aria-hidden="true" className="size-4" />Add</Button></div>
      </form>
      <section className="space-y-2 border-t pt-4" aria-labelledby="selected-players-heading">
        <h3 id="selected-players-heading" className="text-sm font-semibold">Selected players ({players.length})</h3>
        {players.length === 0 && <p className="text-sm text-muted-foreground">Add at least one player to start.</p>}
        {players.map((player) => <form key={`${player.id}-${player.name}`} className="flex min-w-0 items-center gap-1" onSubmit={(event) => {
          event.preventDefault();
          const name = new FormData(event.currentTarget).get("name");
          if (typeof name === "string") run({ type: "rename", id: player.id, name });
        }}>
          {player.rosterId ? <span className="min-w-0 flex-1 py-2 text-sm break-words [overflow-wrap:anywhere]">{player.name}</span> : <><Input name="name" defaultValue={player.name} maxLength={80} aria-label={`Rename ${player.name}`} className="h-11 min-w-0" /><Button type="submit" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Save name for ${player.name}`}><Check aria-hidden="true" className="size-4" /></Button></>}
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Remove ${player.name}`} onClick={() => run({ type: "remove", id: player.id })}><Trash2 aria-hidden="true" className="size-4" /></Button>
        </form>)}
      </section>
    </fieldset>
  );
}
