import { ArrowRight, Dice2, Dice4, Dice5 } from "lucide-react";
import { moodOrder, moods, MOOD_START_ROUND } from "../../constants";
import { moodArtwork } from "../../moodArtwork";
import { RuleText } from "./RuleText";

const presentation = {
  yellow: { accent: "text-amber-700 dark:text-[#ffd331]", card: "border-amber-500/40 bg-amber-100 dark:bg-amber-400/15" },
  blue: { accent: "text-blue-700 dark:text-[#46baff]", card: "border-blue-500/40 bg-blue-100 dark:bg-blue-500/15" },
  violet: { accent: "text-violet-700 dark:text-[#bc67ff]", card: "border-violet-500/40 bg-violet-100 dark:bg-violet-500/15" },
  red: { accent: "text-red-700 dark:text-[#ff6058]", card: "border-red-500/40 bg-red-100 dark:bg-red-500/15" },
};

export function BoardMoods() {
  return (
    <section aria-labelledby="board-moods-heading" className="space-y-4">
      <header>
        <h2 id="board-moods-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Board moods</h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">Begins from round {MOOD_START_ROUND}. Three individual player turns per mood.</p>
      </header>
      <div className="space-y-4">
        {moodOrder.map((id) => {
          const { accent, card } = presentation[id];
          return <section key={id} aria-labelledby={`mood-rule-${id}`} className={`grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-lg border p-5 @[900px]:grid-cols-[64px_180px_minmax(0,1fr)] @[1100px]:gap-x-6 ${card}`}>
            <img src={moodArtwork[id]} alt="" className="size-12 shrink-0 object-contain @[900px]:mx-auto" />
            <div className="min-w-0">
              <h3 id={`mood-rule-${id}`} className="font-serif text-xl leading-snug font-extrabold">{moods[id].name}</h3>
            </div>
            <div className="col-span-2 min-w-0 space-y-3 @[900px]:col-span-1">
              <p className="text-base leading-relaxed font-semibold"><RuleText text={id === "red" ? "Resolve a fall down a red arrow, then receive 200,000 gil." : moods[id].rule} /></p>
              {id === "violet" && <ul aria-label="Violet movement examples" className="space-y-2 text-sm">
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1"><Dice2 aria-hidden="true" className={`size-4 ${accent}`} /><strong className={accent}>2</strong> then <Dice5 aria-hidden="true" className={`size-4 ${accent}`} /><strong className={accent}>5</strong></span><span><ArrowRight aria-hidden="true" className="mr-1 inline size-4 align-[-0.15em] text-muted-foreground" />Move 7 (2 + 5)</span></li>
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1"><Dice4 aria-hidden="true" className={`size-4 ${accent}`} /><strong className={accent}>4</strong> then <Dice4 aria-hidden="true" className={`size-4 ${accent}`} /><strong className={accent}>4</strong></span><span><ArrowRight aria-hidden="true" className="mr-1 inline size-4 align-[-0.15em] text-muted-foreground" />Move 1</span></li>
              </ul>}
            </div>
          </section>;
        })}
      </div>
    </section>
  );
}
