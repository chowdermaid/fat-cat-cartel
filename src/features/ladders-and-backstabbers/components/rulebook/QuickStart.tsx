import { ArrowRight, Crown, Dice2, Dice4, Dice6, Dices, HandCoins, Handshake, Route, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStartProps {
  onNext: () => void;
}

export function QuickStart({ onNext }: QuickStartProps) {
  return (
    <div className="space-y-7">
      <header>
        <h2 className="font-serif text-3xl font-bold">Quick start</h2>
        <p className="mt-2 text-base text-muted-foreground">Two partners. One position. First to the crown.</p>
      </header>
      <ol className="grid gap-6 border-b pb-7 @[900px]:grid-cols-3">
        {[
          { title: "Pair up", icon: Users, text: "Share one position, one hand and one secret mission." },
          { title: "Roll /random 6", icon: Dices, text: "First roller types /random 6 ingame." },
          { title: "Choose your move", icon: Route, text: "Bank It or ask your partner to Back Me Up." },
        ].map(({ title, icon: Icon, text }, index) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary font-serif text-lg font-bold">{index + 1}</span>
            <div><Icon aria-hidden="true" className="mb-3 size-9 text-amber-700 dark:text-primary" /><h3 className="font-serif text-lg font-bold">{title}</h3><p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{text}</p></div>
          </li>
        ))}
      </ol>
      <div className="grid gap-7 border-b pb-7 @[900px]:grid-cols-2">
        <section className="space-y-4" aria-labelledby="bank-it-heading">
          <div className="flex items-start gap-4">
            <HandCoins aria-hidden="true" className="size-11 shrink-0 text-amber-700 dark:text-primary" />
            <div><h3 id="bank-it-heading" className="font-serif text-2xl font-bold">Bank It</h3><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Keep your first roll and move forward that many spaces.</p></div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Example</p>
          <div className="rounded-lg bg-[#f6efdf] p-1.5 text-[#25211b]">
            <p className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#b65a50]/60 px-3 py-4 text-sm font-bold"><Dice4 aria-hidden="true" className="size-8" /><span>First 4</span><ArrowRight aria-hidden="true" className="size-4" /><span>Move 4</span></p>
          </div>
        </section>
        <section className="space-y-4 @[900px]:border-l @[900px]:pl-7" aria-labelledby="backup-heading">
          <div className="flex items-start gap-4">
            <Handshake aria-hidden="true" className="size-11 shrink-0 text-amber-700 dark:text-primary" />
            <div><h3 id="backup-heading" className="font-serif text-2xl font-bold">Back Me Up</h3><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Your partner rolls. <strong className="text-foreground">Strictly higher?</strong> Add both rolls. Equal or lower? Move just 1.</p></div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Examples</p>
          <div className="space-y-2">
            <div className="rounded-lg bg-[#f6efdf] p-1.5 text-[#25211b]"><p className="flex flex-wrap items-center justify-center gap-2 rounded border border-[#b65a50]/60 px-3 py-3 text-sm font-bold"><Dice4 aria-hidden="true" className="size-7" /><span>First 4</span><Dice6 aria-hidden="true" className="size-7" /><span>Backup 6</span><ArrowRight aria-hidden="true" className="size-4" /><span>Move 10</span></p></div>
            <div className="rounded-lg bg-[#f6efdf] p-1.5 text-[#25211b]"><p className="flex flex-wrap items-center justify-center gap-2 rounded border border-[#b65a50]/60 px-3 py-3 text-sm font-bold"><Dice4 aria-hidden="true" className="size-7" /><span>First 4</span><Dice2 aria-hidden="true" className="size-7" /><span>Backup 4 or 2</span><ArrowRight aria-hidden="true" className="size-4" /><span>Move 1</span></p></div>
          </div>
        </section>
      </div>
      <section aria-labelledby="good-to-know-heading" className="border-b pb-6">
        <h3 id="good-to-know-heading" className="mb-4 font-serif text-xl font-bold">Good to know</h3>
        <ul className="grid gap-4 text-sm leading-relaxed text-muted-foreground @[900px]:grid-cols-3">
          <li>Alternate the first roller each turn; your partner is backup.</li>
          <li>One backup attempt. A first roll of 6 cannot be beaten.</li>
          <li>About 10 seconds to choose; no choice means Bank It.</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Compare natural rolls before applying movement modifiers.</p>
      </section>
      <div className="grid gap-6 border-b pb-6 @[900px]:grid-cols-2">
        <section className="flex items-start gap-3" aria-labelledby="finish-heading"><Crown aria-hidden="true" className="size-10 shrink-0 text-amber-700 dark:text-primary" /><div><h3 id="finish-heading" className="font-serif text-lg font-bold">Finish at the crown</h3><p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">Reach or pass it, resolve the full turn and reactions, then the host confirms the winner. No exact roll needed. The race ends; no card can reverse it.</p></div></section>
        <section className="flex items-start gap-3" aria-labelledby="crew-setup-heading"><Users aria-hidden="true" className="size-10 shrink-0 text-amber-700 dark:text-primary" /><div><h3 id="crew-setup-heading" className="font-serif text-lg font-bold">Crew setup</h3><p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">Usually 10–14 players in 5–7 crews. Odd attendance makes one trio; rotate A, B, C as first roller, with the next member as backup.</p><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Follow the numbered zigzag path; crews may share tiles. Host sets crown, ladders and falls before play.</p></div></section>
      </div>
      <Button variant="ghost" className="min-h-11 whitespace-normal text-amber-800 dark:text-primary" onClick={onNext}>Next: Special tiles<ArrowRight aria-hidden="true" className="size-4" /></Button>
    </div>
  );
}
