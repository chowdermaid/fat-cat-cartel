import { ExternalLink } from "lucide-react";
import { Scoreboard } from "./components/Scoreboard";
import { EventCard } from "./components/EventCard";
import { HideAndSeekDialog } from "./components/HideAndSeekDialog";
import leftEaster from "../../assets/easter26/lefteaster.png";
import rightEaster from "../../assets/easter26/righteaster.png";

const hideAndSeekPointRules = [
  { label: "Last hider found", points: "5 pts" },
  { label: "2nd last hider found", points: "3 pts" },
  { label: "3rd last hider found", points: "2 pts" },
  { label: "Tag a Golden Chicken 🐔", points: "2 pts" },
];

const events = [
  {
    emoji: "🥚",
    title: "Hide and Seek",
    duration: "45 min+",
    host: "Chow, Potato, Zalka",
    scoreboard: true,
    description:
      "Played over 3 rounds. A different admin acts as the initial seeker each round. Everyone starts as a hider — last ones standing earn the most points. Watch out for Golden Chickens!",
    rulesContent: <HideAndSeekDialog />,
    pointRules: hideAndSeekPointRules,
  },
  {
    emoji: "🎲",
    title: "Death Roll",
    duration: "~20 min",
    host: "Axo",
    scoreboard: false,
    description:
      "A standalone game hosted by Axo. Pure gamba, not at your expense. Top 3 walk away with gil prizes.",
    prizeRules: [
      { label: "1st Place", prize: "2,000,000 gil" },
      { label: "2nd Place", prize: "1,000,000 gil" },
      { label: "3rd Place", prize: "500,000 gil" },
    ],
    notes: "Results don't count toward the main scoreboard.",
  },
  {
    emoji: "🗺️",
    title: "Eorzea Guessr",
    duration: "~30 min",
    host: "Chow",
    scoreboard: true,
    description:
      "Hosted on Discord via eorguessr.com. You'll be shown screenshots from around Eorzea and have to guess where you are.",
    rules: [
      "3 sessions of 5 rounds each.",
      "Will feature expansions from ARR, Heavensward and Stormblood.",
      "Final placement determines points.",
    ],
    pointRules: [
      { label: "1st Place", points: "5 pts" },
      { label: "2nd Place", points: "3 pts" },
      { label: "3rd Place", points: "2 pts" },
      { label: "All other participants", points: "1 pt" },
    ],
    link: "https://eorguessr.com/",
  },
  {
    emoji: "🧠",
    title: "Trivia",
    duration: "~10 min",
    host: "Axo",
    scoreboard: true,
    description:
      "Quick-fire trivia in the style of chai-style trivia. First person to answer correctly earns a point (and gil).",
    pointRules: [
      { label: "First correct answer per question", points: "1 pt" },
    ],
    prizeRules: [{ label: "Per correct answer", prize: "200,000 gil" }],
  },
  {
    emoji: "⌨️",
    title: "Typeracer",
    duration: "Bonus",
    host: "Chow",
    scoreboard: false,
    description:
      "A bonus game while the winners & prizes are being sorted out. Winner takes home the /read & /study emotes.",
    prizeRules: [{ label: "1st Place", prize: "/read & /study emotes" }],
    notes: "Results don't count toward the main scoreboard.",
    link: "https://play.typeracer.com/",
  },
  {
    emoji: "🎨",
    title: "Skribbl.io",
    duration: "Bonus",
    host: "Chow",
    scoreboard: false,
    description:
      "A chill after-hangout drawing and guessing game. Stick around and embarrass yourself with terrible drawings.",
    notes: "No scoreboard points. Just for fun.",
    link: "https://skribbl.io/",
  },
];

export function Easter2026Page() {
  return (
    <div className="flex items-end">
      {/* Left image — sticky to bottom as user scrolls */}
      <div className="hidden 2xl:block w-56 shrink-0 self-end sticky bottom-0">
        <img
          src={leftEaster}
          alt=""
          className="w-full h-auto pointer-events-none select-none"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-serif">Easter Social 2026</h1>
          <p className="mt-1 text-sm text-muted-foreground/70">26 April 2026</p>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            A full evening of FC events across Hide &amp; Seek, Death Roll,
            Trivia, and Eorzea Guessr plus bonus games for those who want to
            hang around. Points from the scored events feed into the live
            scoreboard below, with prizes for the top placements!
          </p>
        </div>

        {/* Event schedule */}
        <div>
          <h2 className="text-xl font-semibold font-serif mb-4">
            Event Schedule
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
            {events.map((event) => (
              <EventCard key={event.title} {...event} />
            ))}
          </div>
        </div>

        {/* Main prizes */}
        <div>
          <h2 className="text-xl font-semibold font-serif mb-1">Main Prizes</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The top 4 players on the scoreboard each get to choose one prize, in
            order of placement. 1st picks first, then 2nd, 3rd, and 4th.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Orthos Craklaw",
                href: "https://ffxiv.consolegameswiki.com/wiki/Orthos_Craklaw",
              },
              {
                label: "Figmental Weapon Coffer",
                href: "https://ffxiv.consolegameswiki.com/wiki/Figmental_Weapon_Coffer",
              },
              {
                label: "Cosmoboard",
                href: "https://ffxiv.consolegameswiki.com/wiki/Cosmoboard",
              },
              {
                label: "Pure White Dye ×4",
                href: "https://ffxiv.consolegameswiki.com/wiki/General-purpose_Pure_White_Dye",
              },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground group"
              >
                <span className="flex-1 leading-snug">{label}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>

        {/* Live scoreboard */}
        <div>
          <h2 className="text-xl font-semibold font-serif mb-4">
            Live Scoreboard
          </h2>
          <Scoreboard />
        </div>
      </div>

      {/* Right image — sticky to bottom as user scrolls */}
      <div className="hidden 2xl:block w-56 shrink-0 self-end sticky bottom-0">
        <img
          src={rightEaster}
          alt=""
          className="w-full h-auto pointer-events-none select-none"
        />
      </div>
    </div>
  );
}
