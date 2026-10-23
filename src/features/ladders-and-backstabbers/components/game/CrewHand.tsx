import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { crewAccents } from "../../presentation";
import type { Attendee, Crew, EventAction } from "../../types";
import { HandSlot } from "./HandSlot";

interface CrewHandProps {
  crew: Crew;
  index: number;
  attendees: Attendee[];
  live: boolean;
  selectedMember: string | null;
  onSelectMember: (id: string) => void;
  run: (action: EventAction) => boolean;
}

export function CrewHand({ crew, index, attendees, live, selectedMember, onSelectMember, run }: CrewHandProps) {
  const accent = crewAccents[index % crewAccents.length];

  return (
    <section aria-labelledby={`${crew.id}-heading`} className="@container/crew min-w-0 space-y-5 border-t py-6">
      <header className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-serif text-xl font-bold", accent)}>{index + 1}</span>
        <h2 id={`${crew.id}-heading`} className="font-serif text-xl font-bold">Crew {String(index + 1).padStart(2, "0")}</h2>
        <span className="ml-auto text-sm text-muted-foreground">{live ? `${crew.hand.length}/2 cards` : crew.memberIds.length === 3 ? "Trio" : "Pair"}</span>
        <ul className="flex w-full flex-wrap gap-x-5 gap-y-2 text-sm">
          {crew.memberIds.map((id) => {
            const person = attendees.find((attendee) => attendee.id === id)!;
            const initials = person.name.split(" ").slice(0, 2).map((word) => word[0]).join("");
            const member = <><Avatar aria-hidden="true" className={cn("size-8 border", accent)}><AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback></Avatar><span className="min-w-0 break-words [overflow-wrap:anywhere]">{person.name}</span></>;
            return (
              <li key={id} className="min-w-0 max-w-full">
                {live ? <div className="flex items-center gap-2 py-1">{member}</div> : (
                  <Button variant={selectedMember === id ? "secondary" : "ghost"} className="h-auto min-h-11 max-w-full justify-start whitespace-normal px-2 py-1 text-left" aria-pressed={selectedMember === id} onClick={() => onSelectMember(id)}>{member}</Button>
                )}
              </li>
            );
          })}
        </ul>
      </header>
      {live && (
        <div className="grid grid-cols-1 items-stretch gap-4 @[400px]/crew:grid-cols-[repeat(2,minmax(0,220px))]">
          {[0, 1].map((slot) => <HandSlot key={slot} card={crew.hand[slot] ?? null} crewId={crew.id} crewNumber={index + 1} run={run} />)}
        </div>
      )}
    </section>
  );
}
