import { Scoreboard } from "./components/Scoreboard";
import { EventCard } from "./components/EventCard";

const events = [
  {
    emoji: "🥚",
    title: "Hide and Seek",
    duration: "45 min+",
    host: "Chow, Potato, Zalka",
    scoreboard: true,
    description:
      "Played over 3 rounds. A different admin acts as the initial seeker each round. All participants are invited to an alliance for easy communication. Everyone starts as a hider, spread out within the designated area.",
    rules: [
      "If tagged by a seeker, they must /pet you to confirm.",
      'Type "tagged" in alliance chat once tagged, then join the seekers.',
      "Seekers work together to find the remaining hiders.",
      "The last three hiders found each round earn points.",
    ],
    pointRules: [
      { label: "Last hider found", points: "5 pts" },
      { label: "2nd last hider found", points: "3 pts" },
      { label: "3rd last hider found", points: "2 pts" },
      { label: "Seekers who tag ≥ 1 hider", points: "1 pt" },
    ],
  },
  {
    emoji: "🧠",
    title: "Trivia",
    duration: "~10 min",
    host: "Axo",
    scoreboard: true,
    description:
      "Quick-fire trivia in the style of chai-style trivia. First person to answer correctly earns a point. Fast fingers win here.",
    pointRules: [
      { label: "First correct answer per question", points: "1 pt" },
    ],
  },
  {
    emoji: "🗺️",
    title: "Eorzea Guessr",
    duration: "~30 min",
    host: "Chow",
    scoreboard: true,
    description:
      "Hosted on Discord via eorguessr.com. You'll be shown screenshots from around Eorzea and have to guess where you are. Chow will host the session and track placements.",
    rules: [
      "Session hosted on Discord by Chow Chow.",
      "Visit eorguessr.com for the game itself.",
      "Final placement determines points.",
    ],
    pointRules: [
      { label: "1st Place", points: "5 pts" },
      { label: "2nd Place", points: "3 pts" },
      { label: "3rd Place", points: "2 pts" },
      { label: "All other participants", points: "1 pt" },
    ],
  },
  {
    emoji: "🎲",
    title: "Death Roll",
    duration: "~20 min",
    host: "Axo",
    scoreboard: false,
    description:
      "A standalone game hosted by Axo. Separate prizes or gil up for grabs. No scoreboard points, just pure gamba not at your expense.",
    notes: "Results don't count toward the main scoreboard.",
  },
  {
    emoji: "⌨️",
    title: "Typeracer",
    duration: "Bonus",
    host: "TBD",
    scoreboard: false,
    description:
      "A bonus hangout game after the main event wraps up — stick around and race each other on Typeracer if you're still around. Prize for the winner.",
    notes: "Results don't count toward the main scoreboard.",
  },
];

export function Easter2026Page() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-serif">Easter Social 2026</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          A full evening of FC events across Hide &amp; Seek, Death Roll,
          Trivia, and Eorzea Guessr plus a bonus Typeracer session for those who
          want to hang around. Points from the scored events feed into the live
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

      {/* Live scoreboard */}
      <div>
        <h2 className="text-xl font-semibold font-serif mb-4">
          Live Scoreboard
        </h2>
        <Scoreboard />
      </div>
    </div>
  );
}
