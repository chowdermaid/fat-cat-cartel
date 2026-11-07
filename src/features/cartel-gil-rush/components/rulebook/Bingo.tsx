import { Coins } from "lucide-react";
import bingoArtwork from "@/assets/cartel-gil-rush/bingo.png";

export function Bingo() {
  return <section aria-labelledby="bingo-heading" className="space-y-5">
    <h2 id="bingo-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Bingo</h2>
    <div className="@container min-w-0">
      <div className="grid min-w-0 gap-4 rounded-lg border border-primary/30 bg-primary/10 p-4 @[600px]:grid-cols-[80px_minmax(0,1fr)] @[600px]:items-center @[850px]:px-6 @[850px]:py-5">
        <img src={bingoArtwork} alt="" width={80} height={80} className="mx-auto size-20 shrink-0 object-contain" />
        <div className="min-w-0 space-y-2">
          <p className="text-base leading-relaxed">Nine random missions. Tick them on your Bingo card in Game, then screenshot to Chow at the end of the event.</p>
          <p className="text-sm leading-relaxed"><Coins aria-hidden="true" className="mr-1.5 inline size-4 align-[-0.15em]" /><span className="font-bold">Rewards: </span>3+ missions: 250k gil. 6+ missions: 500k gil. All 9: 1m gil. Highest tier only.</p>
        </div>
      </div>
    </div>
  </section>;
}
