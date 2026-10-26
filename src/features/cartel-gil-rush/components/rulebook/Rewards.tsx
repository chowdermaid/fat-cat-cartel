import { CircleHelp, Crown } from "lucide-react";

export function Rewards() {
  return (
    <section aria-labelledby="rewards-heading" className="space-y-5">
      <header>
        <h2 id="rewards-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Rewards</h2>
      </header>
      <section aria-labelledby="grand-prizes-heading" className="space-y-3">
        <header><h3 id="grand-prizes-heading" className="flex items-center gap-3 font-serif text-2xl font-extrabold"><Crown aria-hidden="true" className="size-8 shrink-0 text-amber-700 dark:text-[#ffd331]" />Grand prizes</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">First to the crown picks first. Second picks next. Third receives the remaining prize.</p></header>
        <div className="grid gap-3 @[1050px]:grid-cols-3">
          {[1, 2, 3].map((option) => <section key={option} aria-label={`Prize option ${option}`} className="min-w-0 rounded-lg border bg-muted p-4">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-md border border-muted-foreground bg-background/50"><CircleHelp className="size-8 text-muted-foreground" /></span>
              <div className="min-w-0 text-sm leading-relaxed"><p className="font-semibold text-foreground">FFXIV item</p><p className="mt-1 text-muted-foreground">To be announced.</p></div>
            </div>
          </section>)}
        </div>
      </section>
    </section>
  );
}
