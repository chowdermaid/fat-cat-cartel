import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Dices,
  Hammer,
  Mountain,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { HOME_GAZETTE } from "../../constants";
import { useHomeAnimations } from "../../hooks/useHomeAnimations";
import { useHomeGreeting } from "../../hooks/useHomeGreeting";
import omgpeets from "../../../../assets/fatcat/omgpeets.png";
import type { ClubhouseProps } from "../../types";
import { CartelClubhouse } from "../clubhouse/CartelClubhouse";

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

export function HomeHero({
  memberCount,
  members,
  profiles,
}: { memberCount: number } & ClubhouseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const auth = useAdminAuth();
  const greetingName = auth.authed
    ? auth.session?.characterName || auth.session?.discordDisplayName || auth.session?.discordUsername
    : null;
  const birthday = auth.authed && auth.session?.lodestoneId ? profiles[auth.session.lodestoneId]?.birthday : null;
  const greeting = useHomeGreeting(greetingName, birthday);

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
        className="relative z-10 flex h-full flex-1 overflow-hidden rounded-lg border bg-card/80 shadow-sm"
      >
        <div className="grid flex-1 items-stretch gap-x-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]">
          <div className="hero-item @container flex min-w-0 flex-col gap-5 px-5 py-6 sm:px-8 sm:pt-10 lg:py-8 lg:pl-10 lg:pr-0">
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
            <div className="flex flex-1 flex-col justify-center gap-4 border-b border-dashed pb-5">
              <h2 className="hidden text-3xl font-semibold leading-snug tracking-tight font-serif [overflow-wrap:anywhere] @min-[34rem]:block">
                {greeting}
              </h2>
              <ul className="flex flex-wrap gap-x-5 gap-y-3">
                {FC_FOCUS_ITEMS.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium"
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {label}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
                <Link
                  to="/members"
                  className="inline-flex items-center gap-1 rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Meet the crew
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
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
          <div className="flex min-w-0">
            <CartelClubhouse members={members} profiles={profiles} />
          </div>
        </div>
      </section>
    </div>
  );
}
