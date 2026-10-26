import dice from "@/assets/cartel-gil-rush/dice.png";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moodOrder, moods } from "../../constants";
import { moodArtwork } from "../../moodArtwork";
import { cn } from "@/lib/utils";
import type { EventController, Mood } from "../../types";

const moodSurfaces: Record<Mood, string> = {
  yellow: "bg-[#ffd331] text-[#191b17]",
  blue: "bg-[#95c5ef] text-[#152635]",
  violet: "bg-[#c3a0eb] text-[#291638]",
  red: "bg-[#ef9790] text-[#391916]",
};

export function MoodPanel({ mood, run, disabled }: { mood: Mood | null; run: EventController["run"]; disabled: boolean }) {
  const active = mood ? moods[mood] : null;
  return (
    <section data-event-reveal aria-labelledby="active-mood-heading" className={cn("rounded-xl p-5 transition-colors duration-200 motion-reduce:transition-none @[900px]:p-6", mood ? moodSurfaces[mood] : "border bg-muted/40")}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1 basis-64">
          <p className="mb-2 text-xs font-extrabold tracking-[0.24em] uppercase">Board mood</p>
          <div data-event-mood-content className="flex flex-wrap items-center gap-4 @[1100px]:gap-6">
            <img src={(mood && moodArtwork[mood]) || dice} alt="" className="size-16 shrink-0 object-contain @[1100px]:size-22" />
            <div className="min-w-0 flex-1 basis-40">
              <h2 id="active-mood-heading" className="font-serif text-3xl leading-tight font-extrabold break-words [overflow-wrap:anywhere] @[1200px]:text-[46px]">{active?.name ?? "No mood"}</h2>
              {active && <p className="mt-1 max-w-prose text-base leading-relaxed font-bold @[1100px]:text-xl">{mood === "red" ? "Resolve a fall down a red arrow, then receive 200,000 gil." : active.rule}</p>}
            </div>
          </div>
        </div>
        <Select value={mood ?? "none"} disabled={disabled} onValueChange={value => void run({ type: "set-mood", mood: value === "none" ? null : value as Mood })}>
          <SelectTrigger aria-label="Board mood" className="min-h-11 w-full max-w-64 border-current/25 bg-transparent text-current"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">No mood</SelectItem>{moodOrder.map(id => <SelectItem key={id} value={id}>{moods[id].name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </section>
  );
}
