import { CircleAlert, Crown, Dice6, Palette, Route } from "lucide-react";
import { MOOD_START_ROUND } from "../../constants";
import { RuleText } from "./RuleText";

const steps = [
  { title: "Check the mood", icon: Palette, lines: [`Board moods apply from round ${MOOD_START_ROUND}.`] },
  { title: "Roll /random 6", icon: Dice6, lines: ["Roll once when called."] },
  { title: "Move & resolve", icon: Route, lines: ["Follow the numbered path."] },
];

export function QuickStart() {
  return (
    <div className="min-w-0">
      <div className="min-w-0 space-y-4">
        <header>
          <h2 id="quick-start-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Quick start</h2>
        </header>
        <section aria-labelledby="quick-finish-heading" className="flex items-start gap-4">
          <Crown aria-hidden="true" className="size-10 shrink-0 text-amber-700 dark:text-[#ffd331]" />
          <div><h3 id="quick-finish-heading" className="font-serif text-xl font-bold">Finishing</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">The first three to reach the crown can choose a prize. Game stops after 3 finishers</p></div>
        </section>
        <div className="flex items-center gap-3 rounded-lg border border-amber-600/60 bg-amber-400/5 px-4 py-3">
          <CircleAlert aria-hidden="true" className="size-7 shrink-0 text-amber-700 dark:text-[#ffd331]" />
          <div><p className="text-base leading-snug font-bold text-amber-800 dark:text-[#ffd331]">Board moods apply from round {MOOD_START_ROUND}.</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Each mood lasts three individual player turns.</p></div>
        </div>
        <div className="space-y-3">
        <ol className="relative space-y-4 before:absolute before:top-5 before:bottom-5 before:left-5 before:w-px before:bg-amber-500">
          {steps.map(({ title, icon: Icon, lines }, index) => <li key={title} className="relative grid grid-cols-[40px_minmax(0,1fr)] items-start gap-3 @[1100px]:grid-cols-[40px_32px_minmax(0,1fr)] @[1100px]:gap-4">
            <span className="z-10 flex size-10 items-center justify-center rounded-full border-2 border-amber-500 bg-background font-serif text-sm font-extrabold dark:border-[#ffd331]">{String(index + 1).padStart(2, "0")}</span>
            <Icon aria-hidden="true" className="mt-1 hidden size-8 text-amber-700 @[1100px]:block dark:text-[#ffd331]" />
            <div className="pt-1"><h3 className="text-sm leading-snug font-extrabold uppercase"><RuleText text={title} /></h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lines.map((line) => <span key={line} className="block"><RuleText text={line} /></span>)}</p></div>
          </li>)}
        </ol>
        </div>
      </div>
    </div>
  );
}
