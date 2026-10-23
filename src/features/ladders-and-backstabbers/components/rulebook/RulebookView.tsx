import { useState } from "react";
import { Target } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { abilities, missions, tiles } from "../../constants";
import { chapters, tilePresentation } from "../../presentation";
import type { RulebookChapter } from "../../types";
import { AbilityCard } from "../game/AbilityCard";
import { QuickStart } from "./QuickStart";

export function RulebookView() {
  const [chapter, setChapter] = useState<RulebookChapter>("quick-start");

  return (
    <Tabs orientation="vertical" value={chapter} onValueChange={(value) => setChapter(value as RulebookChapter)} className="grid min-w-0 gap-7 @[800px]:grid-cols-[220px_minmax(0,1fr)] @[800px]:gap-8">
      <TabsList aria-label="Rulebook chapters" className="hidden flex-col items-stretch justify-start gap-2 border-r pr-5 @[800px]:flex">
        {chapters.map(({ id, title, icon: Icon }) => <TabsTrigger key={id} value={id} className="justify-start rounded-r-md border-b-0 border-l-2 px-3 py-3 text-left data-[state=active]:bg-primary/5"><Icon aria-hidden="true" className="size-5 shrink-0" />{title}</TabsTrigger>)}
      </TabsList>
      <div className="@[800px]:hidden">
        <label id="rulebook-chapter-label" className="mb-2 block text-sm font-semibold">Chapter</label>
        <Select value={chapter} onValueChange={(value) => setChapter(value as RulebookChapter)}>
          <SelectTrigger aria-labelledby="rulebook-chapter-label" className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>{chapters.map(({ id, title }) => <SelectItem key={id} value={id} className="min-h-11">{title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="min-w-0 pb-6">
        <TabsContent value="quick-start"><QuickStart onNext={() => setChapter("special-tiles")} /></TabsContent>
        <TabsContent value="special-tiles" className="space-y-6">
          <header><h2 className="font-serif text-3xl font-bold">Special tiles</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Know the colour, resolve the effect, then keep moving towards the crown.</p></header>
          <dl className="grid gap-x-8 gap-y-7 @[1000px]:grid-cols-2">
            {tiles.map((tile) => {
              const { icon: Icon, accent } = tilePresentation[tile.name];
              return <div key={tile.name} className="flex items-start gap-4"><Icon aria-hidden="true" className={`mt-1 size-9 shrink-0 stroke-[1.5] ${accent}`} /><div><dt className="font-serif text-lg font-bold">{tile.name}<span className={`mt-1 block font-sans text-xs font-semibold ${accent}`}>{tile.color}</span></dt><dd className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{tile.effect}</dd></div></div>;
            })}
          </dl>
          <p className="max-w-prose border-t pt-5 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Resolve only the first special tile reached by normal movement.</strong> Extra tile movement never chains; ability movement does not trigger tiles. Positions stay between start and crown. Standalone tile rolls do not use Bank or Backup.</p>
        </TabsContent>
        <TabsContent value="ability-cards" className="space-y-6">
          <header><h2 className="font-serif text-3xl font-bold">Ability cards</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Five enabled abilities. Shared by the crew, single use, applied manually by the host.</p></header>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,220px))] justify-center gap-5 @[800px]:justify-start">
            {abilities.map((ability) => <AbilityCard key={ability.name} ability={ability} />)}
          </div>
          <ul className="max-w-prose list-disc space-y-3 border-t pt-5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Start with one random card; hold at most two. Cards belong to the crew and are single use.</li>
            <li>One proactive card per turn. Reactive cards do not consume the next proactive allowance.</li>
            <li>At most one incoming attack between starts of a crew's turns. Clean Getaway cancels negative tiles, never abilities.</li>
            <li>Hold a card before its trigger; no retroactive play. Declare plays to the host. Valid plays are spent; invalid attempts do not consume cards.</li>
            <li>Tall Poppy uses current positions. Choose one eligible leader when tied; tied ranks use 1, 1, 3. Actor must be strictly behind the target and cannot target itself.</li>
          </ul>
        </TabsContent>
        <TabsContent value="secret-missions" className="space-y-6">
          <header><h2 className="font-serif text-3xl font-bold">Secret missions</h2><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Possible missions, not actual assignments. A private side objective for one raffle entry; never race movement.</p></header>
          <ul className="max-w-prose list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>One private mission per crew; one free redraw before play. Discard the original. Host delivers it privately by tell or Discord.</li>
            <li>Complete once for one raffle entry. Host confirms completion and chooses when to reveal it.</li>
            <li>Accepted first and backup rolls count, including failed backups. Discarded rerolls and tile rolls do not.</li>
            <li>Check movement goals after the full turn. Forced movement outside your turn does not count. For trios, every member means all three.</li>
            <li>Only deal missions supported by the chosen cards and board.</li>
          </ul>
          <dl className="divide-y border-t">
            {missions.map((mission) => <div key={mission.name} className="flex gap-3 py-4"><Target aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-700 dark:text-primary" /><div><dt className="font-serif text-base font-bold">{mission.name}</dt><dd className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{mission.effect}</dd></div></div>)}
          </dl>
        </TabsContent>
      </div>
    </Tabs>
  );
}
