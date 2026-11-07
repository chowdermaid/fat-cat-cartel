import { Crown } from "lucide-react";
import daisOfDarkness from "@/assets/cartel-gil-rush/dais-of-darkness.png";
import orthosCraklaw from "@/assets/cartel-gil-rush/orthos-craklaw.png";
import yanHorn from "@/assets/cartel-gil-rush/yan-horn.png";
import { RuleText } from "./RuleText";

export function Rewards() {
  return (
    <section aria-labelledby="rewards-heading" className="space-y-5">
      <header>
        <h2 id="rewards-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Rewards</h2>
      </header>
      <section aria-labelledby="grand-prizes-heading" className="space-y-3">
        <header><h3 id="grand-prizes-heading" className="flex items-center gap-3 font-serif text-2xl font-extrabold"><Crown aria-hidden="true" className="size-8 shrink-0 text-amber-700 dark:text-[#ffd331]" />Grand prizes</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">First to the crown picks first. Second picks next. Third receives the remaining prize.</p></header>
        <div className="grid gap-3 @[1050px]:grid-cols-3">
          <section aria-label="Prize option 1" className="min-w-0 rounded-lg border bg-muted p-4">
            <div className="flex items-center gap-4">
              <img src={daisOfDarkness} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md object-contain" />
              <div className="min-w-0 text-sm leading-relaxed">
                <a href="https://ffxiv.consolegameswiki.com/wiki/Dais_of_Darkness" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Dais of Darkness</a>
                <p className="mt-1 font-semibold text-muted-foreground"><RuleText text="25,000,000 gil" /></p>
              </div>
            </div>
          </section>
          {[
            { option: 2, name: "Yan Horn", value: "12,000,000 gil", image: yanHorn, url: "https://ffxiv.consolegameswiki.com/wiki/Yan_Horn" },
            { option: 3, name: "Orthos Craklaw", value: "8,000,000 gil", image: orthosCraklaw, url: "https://ffxiv.consolegameswiki.com/wiki/Orthos_Craklaw" },
          ].map((prize) => <section key={prize.option} aria-label={`Prize option ${prize.option}`} className="min-w-0 rounded-lg border bg-muted p-4">
            <div className="flex items-center gap-4">
              <img src={prize.image} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md object-contain" />
              <div className="min-w-0 text-sm leading-relaxed">
                <a href={prize.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{prize.name}</a>
                <p className="mt-1 font-semibold text-muted-foreground"><RuleText text={prize.value} /></p>
              </div>
            </div>
          </section>)}
        </div>
      </section>
    </section>
  );
}
