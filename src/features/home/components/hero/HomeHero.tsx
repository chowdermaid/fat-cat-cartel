import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Dices,
  Hammer,
  Mountain,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HOME_GAZETTE } from "../../constants";
import { useHomeAnimations } from "../../hooks/useHomeAnimations";
import { NewspaperStamp } from "../newspaper/NewspaperStamp";
import omgpeets from "../../../../assets/fatcat/omgpeets.png";
import fatcatthrone from "../../../../assets/fatcatthrone.png";

const FC_FOCUS_ITEMS: {
  icon: LucideIcon;
  label: string;
}[] = [
  { icon: Swords, label: "High-End Content" },
  { icon: CalendarDays, label: "Events" },
  { icon: Hammer, label: "Crafting" },
  { icon: Mountain, label: "Mount Farms" },
  { icon: Dices, label: "Roulettes" },
];

export function HomeHero({ memberCount }: { memberCount: number }) {
  const sectionRef = useRef<HTMLElement>(null);

  useHomeAnimations(sectionRef, ".hero-item", 20, 0, 120, 600);

  return (
    <div className="relative mt-6 flex h-full w-full">
      <div className="absolute -top-6 left-5 z-0 hidden gap-1 sm:flex">
        {["FC file", "Sophia", "Ward 1, Plot 60, Shirogane"].map((label) => (
          <span
            key={label}
            className="rounded-t-md border border-b-0 bg-card px-3 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm"
          >
            {label}
          </span>
        ))}
      </div>
      <section
        ref={sectionRef}
        className="relative z-10 flex h-full flex-1 overflow-visible rounded-lg border bg-card/80 px-5 py-6 shadow-sm sm:px-8 sm:pt-10 lg:px-10"
      >
        <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)_minmax(12rem,18rem)]">
          <div className="hero-item space-y-5 lg:col-start-1">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {HOME_GAZETTE.name}
              </p>
              <div className="flex flex-wrap items-center gap-3 border-y border-dashed py-3">
                <h1 className="text-4xl font-bold tracking-tight font-serif sm:text-6xl">
                  Fat Cat Cartel
                </h1>
                <img
                  src={omgpeets}
                  className="h-auto max-h-12 w-auto max-w-20 object-contain sm:max-h-16 sm:max-w-24"
                  alt="Fat Cat Cartel peets"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {HOME_GAZETTE.metadata.map((item) => (
                <span
                  key={item}
                  className="w-fit rounded-sm border border-dashed bg-background/60 px-2 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="max-w-3xl border-b border-dashed pb-3 font-serif text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {HOME_GAZETTE.headline}
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              News from the house: events, notices, tools, and very legal
              operations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a
                  href="http://discord.gg/TDdhZgQyCR"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Discord
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/jointhemeowfia">Join the Meowfia</Link>
              </Button>
            </div>
          </div>
          <div className="hero-item flex h-full flex-col rounded-md border bg-muted/30 p-3 lg:col-start-2 lg:row-span-2">
            <div className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              FC BIO
            </div>
            <div className="mb-3 rounded-md border bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Members
              </div>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-serif text-4xl font-semibold leading-none text-foreground">
                  {memberCount}
                </span>
                <span className="pb-1 text-xs font-medium text-muted-foreground">
                  on file
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-wrap content-start gap-2 lg:flex-col lg:flex-nowrap">
              {FC_FOCUS_ITEMS.map(({ icon: Icon, label }) => (
                <Badge
                  key={label}
                  variant="secondary"
                  className="justify-start gap-2 rounded-sm border bg-background/70 px-2.5 py-1.5 text-xs font-medium text-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </Badge>
              ))}
            </div>
          </div>
          <div className="hero-item relative flex flex-col items-center gap-0 rounded-lg border border-dashed bg-background/60 p-4 lg:col-start-3 lg:row-span-2">
            <div className="absolute -right-3 -top-3 z-20 hidden bg-muted sm:block">
              <NewspaperStamp>{HOME_GAZETTE.issue}</NewspaperStamp>
            </div>
            <img
              src={fatcatthrone}
              className="h-auto w-full max-w-72"
              alt="Fat Cat Cartel"
            />
            <p className="-mt-7 border-t border-dashed px-2 pt-2 text-center text-xs italic text-muted-foreground/80">
              Drawn by our Dull Hafnir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
