import type { ReactNode } from "react";
import { Coins, ExternalLink } from "lucide-react";
import groupTrivia from "@/assets/cartel-gil-rush/group-trivia.png";
import treasureDraw from "@/assets/cartel-gil-rush/treasure-draw.png";
import minorityDraw from "@/assets/cartel-gil-rush/minority-draw.png";
import eorzeaguessr from "@/assets/cartel-gil-rush/eorzeaguessr.png";
import marbleRush from "@/assets/cartel-gil-rush/marble-rush.png";
import groupDeathroll from "@/assets/cartel-gil-rush/group-deathroll.png";
import type { MinigameKind } from "../../../../functions/src/cartel-gil-rush-model";

const games = {
  trivia: { name: "Group Trivia", image: groupTrivia, accent: "border-amber-600/70 bg-amber-100/60 dark:border-amber-500/70 dark:bg-amber-500/10", rules: "Two teams, three questions. First correct answer wins.", rewards: "100k gil per winning teammate, per question." },
  minority: { name: "Treasure Draw", image: treasureDraw, accent: "border-blue-600/60 bg-blue-100/60 dark:border-blue-400/70 dark:bg-blue-500/10", rules: "Choose one of four chests. Saved assignments are visible to everyone. The host reveals each chest's prize.", rewards: "200k gil · 100k gil · Golden dice · 50k gil." },
  "minority-draw": { name: "Minority Draw", image: minorityDraw, accent: "border-emerald-600/60 bg-emerald-100/60 dark:border-emerald-400/70 dark:bg-emerald-500/10", rules: "Choose one of three chests. The least-selected occupied chest wins. Tied groups pick a champion each for Chow's deathroll.", rewards: "200k gil and a golden die for every player in the winning chest." },
  eorzeaguessr: { name: "Eorzeaguessr", image: eorzeaguessr, accent: "border-violet-600/60 bg-violet-100/60 dark:border-violet-400/70 dark:bg-violet-500/10", rules: "Five rounds. Aim for perfect guesses.", rewards: "100k gil per perfect guess each round. Overall: 1st 500k, 2nd 300k, 3rd 200k gil. The top three each receive a golden die." },
  marbles: { name: "Marble Rush", image: marbleRush, accent: "border-teal-600/60 bg-teal-100/60 dark:border-teal-400/70 dark:bg-teal-500/10", rules: "One free marble. Spend 20k gil from your event winnings to get one extra marble.", rewards: "1st 1m, 2nd 500k, 3rd 250k gil. The top three each receive a golden die." },
  deathroll: { name: "Group Deathroll", image: groupDeathroll, accent: "border-red-600/60 bg-red-100/60 dark:border-red-400/70 dark:bg-red-500/10", rules: "Axo hosts a deathroll contest.", rewards: "1st 1m, 2nd 500k, 3rd 300k gil." },
};

const bannerAccents: Record<MinigameKind, string> = {
  trivia: "bg-[#ffd331] text-[#191b17]",
  minority: "bg-blue-400 text-[#191b17]",
  "minority-draw": "bg-emerald-400 text-[#191b17]",
  eorzeaguessr: "bg-violet-400 text-[#191b17]",
  marbles: "bg-teal-400 text-[#191b17]",
  deathroll: "bg-red-400 text-[#191b17]",
};

export function MinigameSummary({ kind, actions, variant = "summary" }: { kind: MinigameKind; actions?: ReactNode; variant?: "summary" | "banner" }) {
  const { name, image, accent, rules, rewards } = games[kind];
  const banner = variant === "banner";
  const url = kind === "eorzeaguessr" ? "https://eorguessr.com/" : kind === "marbles" ? "https://rouletterush.app/" : null;
  return <div className="@container min-w-0">
    <article aria-label={name} className={`grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 rounded-lg ${banner ? `gap-y-0.5 px-5 py-4 @[600px]:grid-cols-[96px_minmax(0,1fr)] @[850px]:gap-x-6 @[850px]:px-6 ${bannerAccents[kind]}` : `gap-y-3 border p-4 @[850px]:grid-cols-[80px_210px_minmax(0,1fr)] @[850px]:gap-x-6 @[850px]:px-6 @[850px]:py-5 ${accent}`}`}>
      {banner && <div className="col-span-full flex min-h-7 items-end justify-between gap-4">
        <p className="text-xs leading-none font-extrabold tracking-[0.2em] uppercase opacity-75">Minigame event</p>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>}
      <img src={image} alt="" className={banner ? "size-16 object-contain @[600px]:row-span-2 @[600px]:size-24" : "size-16 object-contain @[850px]:size-20"} />
      <div className="min-w-0">
        <h3 className={banner ? "font-serif text-3xl leading-tight font-black @[850px]:text-4xl" : "font-serif text-xl leading-snug font-extrabold"}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-sm underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-ring">{name}<ExternalLink aria-hidden="true" className="ml-1.5 inline size-4 align-baseline" /></a> : name}</h3>
      </div>
      <div className={banner ? "col-span-2 min-w-0 space-y-3 @[600px]:col-span-1 @[600px]:col-start-2" : "col-span-2 min-w-0 space-y-2 @[850px]:col-span-1"}>
        <p className={banner ? "text-base leading-relaxed font-semibold @[850px]:text-lg" : "text-base leading-relaxed"}>{kind === "marbles" && <><strong>Chow will stream Marble Rush.</strong>{" "}</>}{rules}</p>
        <p className={banner ? "text-base leading-relaxed font-semibold" : "text-sm leading-relaxed"}><Coins aria-hidden="true" className="mr-1.5 inline size-4 align-[-0.15em]" /><span className="font-bold">Rewards: </span>{rewards}</p>
      </div>
    </article>
  </div>;
}
