import { Crown, Dice6, Route } from "lucide-react";
import { RuleText } from "./RuleText";

const steps = [
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
        <section aria-labelledby="quick-finish-heading" className="flex items-start gap-3 rounded-lg border border-amber-600/60 bg-amber-400/5 px-4 py-3">
          <Crown aria-hidden="true" className="size-7 shrink-0 text-amber-700 dark:text-[#ffd331]" />
          <div><h3 id="quick-finish-heading" className="text-base leading-snug font-bold text-amber-800 dark:text-[#ffd331]">Finishing</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">The first three to finish choose prizes in order. Finished racers stop taking board turns but remain eligible for group minigames and gil prizes.</p></div>
        </section>
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
