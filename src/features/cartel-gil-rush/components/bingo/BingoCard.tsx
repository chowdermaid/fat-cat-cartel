import { Check, Coins, Flag } from "lucide-react";
import dice from "@/assets/cartel-gil-rush/dice.png";
import goldenDie from "@/assets/cartel-gil-rush/golden-dice.png";
import minorityDraw from "@/assets/cartel-gil-rush/minority-draw.png";
import eorzeaguessr from "@/assets/cartel-gil-rush/eorzeaguessr.png";
import marbleRush from "@/assets/cartel-gil-rush/marble-rush.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bingoMissions } from "../../constants";
import { tileArtwork } from "../../tileArtwork";
import { bingoReward } from "../../utils/bingo";
import type { BingoController, BingoMission } from "../../types";

const artwork = { ...tileArtwork, die: dice, "golden-die": goldenDie, "minority-draw": minorityDraw, eorzeaguessr, marbles: marbleRush };

function MissionIcon({ icon }: { icon: BingoMission["icon"] }) {
  const classes = "size-8 shrink-0 object-contain @[420px]/bingo:size-10";
  if (icon === "coins") return <Coins aria-hidden="true" className={`${classes} text-amber-300`} />;
  if (icon === "flag") return <Flag aria-hidden="true" className={`${classes} text-amber-300`} />;
  return <img src={artwork[icon]} alt="" className={classes} />;
}

const rewardTiers = [
  { amount: 250_000, label: "3+ lines", reward: "250k gil" },
  { amount: 500_000, label: "6+ lines", reward: "500k gil" },
  { amount: 1_000_000, label: "9 lines", reward: "1m gil" },
];

export function BingoCard({ bingo }: { bingo: BingoController }) {
  const { card, storageUnavailable, toggle } = bingo;
  const count = card.completedIds.length;
  const reward = bingoReward(count);
  return <section aria-label="Bingo card" className="@container/bingo mx-auto w-full max-w-[560px] rounded-lg border border-primary/30 bg-primary/10 p-4 text-foreground">
    <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="font-serif text-[28px] leading-tight font-extrabold text-amber-800 dark:text-primary">Bingo</h2>
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-muted-foreground">{count} of 9 complete</p>
    </header>
    <div role="group" aria-label="Bingo missions" className="grid auto-rows-fr grid-cols-3 gap-1.5 @[420px]/bingo:gap-2">
      {card.missionIds.map(id => {
        const mission = bingoMissions.find(mission => mission.id === id)!;
        const complete = card.completedIds.includes(id);
        return <Button key={id} type="button" variant="outline" aria-pressed={complete} aria-label={mission.text} data-bingo-mission={id} onClick={() => toggle(id)} className={cn("relative h-auto min-h-36 min-w-0 flex-col gap-2 whitespace-normal rounded-md border px-1.5 py-3 text-center text-xs leading-snug font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background @[420px]/bingo:min-h-40 @[420px]/bingo:px-2 @[420px]/bingo:text-sm", complete ? "border-amber-400 bg-[#3b3011] text-amber-50 hover:bg-[#473a16] hover:text-amber-50" : "border-white/20 bg-[#222222] text-[#f6f3ea] hover:border-white/40 hover:bg-[#2a2a2a] hover:text-white")}>
          {complete && <Check aria-hidden="true" className="absolute top-1.5 right-1.5 size-4 text-amber-300" />}
          <MissionIcon icon={mission.icon} />
          <span className="break-words">{mission.text}</span>
        </Button>;
      })}
    </div>
    <section aria-label="End-of-event reward" className="mt-4 border-t border-primary/20 pt-3">
      <h3 className="font-serif text-lg font-extrabold">End-of-event reward</h3>
      <dl className="mt-3 grid grid-cols-3 divide-x divide-primary/20 text-center text-xs">
        {rewardTiers.map(tier => <div key={tier.amount} className={cn("px-1 py-1", reward === tier.amount ? "font-extrabold text-amber-800 dark:text-primary" : "text-muted-foreground")}>
          <dt>{tier.label}</dt><dd className="mt-1 flex items-center justify-center gap-1 font-bold text-amber-800 dark:text-primary"><Coins aria-hidden="true" className="size-3.5 shrink-0" />{tier.reward}</dd>
        </div>)}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Tick and screenshot to Chow at the end of the event</p>
      <p className="sr-only">Current reward: {reward.toLocaleString("en-AU")} gil.</p>
    </section>
    {storageUnavailable && <p role="alert" className="mt-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">Progress cannot be saved in this browser. Your card still works for this session.</p>}
  </section>;
}
