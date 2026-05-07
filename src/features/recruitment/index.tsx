import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Home, Zap, Calendar, Users } from "lucide-react";

const carouselImages = Object.values(
  import.meta.glob("../../assets/carousel/*", {
    eager: true,
    import: "default",
  }) as Record<string, string>,
);

const perks = [
  {
    icon: Home,
    title: "FC Plot in Shirogane",
    items: [
      "Large FC house with all the amenities",
      "Stable your chocobo for free onions & EXP",
    ],
  },
  {
    icon: Zap,
    title: "Buffs Running 24/7",
    items: [
      "EXP boost active around the clock",
      "Travel cost reduction always on",
    ],
  },
  {
    icon: Users,
    title: "Helpful Community",
    items: [
      "Happy to answer questions or lend a hand",
      "Dungeon runs, MSQ help, and roulette buddies",
    ],
  },
  {
    icon: Calendar,
    title: "Seasonal Events",
    items: [
      "Social events with small games and prizes",
      "Mount farms, treasure hunts, and PvP",
    ],
  },
];

export function RecruitmentPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const perksGridRef = useRef<HTMLDivElement>(null);
  const activityListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;
    animate(pageRef.current.querySelectorAll(".anim-section"), {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(100),
      duration: 450,
      easing: "easeOutQuart",
    });
  }, []);

  useEffect(() => {
    if (!perksGridRef.current) return;
    animate(perksGridRef.current.querySelectorAll(".perk-card"), {
      opacity: [0, 1],
      translateY: [12, 0],
      delay: stagger(70, { start: 200 }),
      duration: 300,
      easing: "easeOutQuad",
    });
  }, []);

  useEffect(() => {
    if (!activityListRef.current) return;
    animate(activityListRef.current.querySelectorAll("li"), {
      opacity: [0, 1],
      translateX: [-10, 0],
      delay: stagger(50, { start: 300 }),
      duration: 280,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div ref={pageRef} className="space-y-12">
      <div className="anim-section">
        <h1 className="text-3xl font-bold font-serif">Join the Meowfia</h1>
        <p className="mt-2 text-lg text-muted-foreground leading-relaxed max-w-2xl">
          A small, relaxed Free Company on FFXIV made up mostly of adults who
          log in after work to unwind, chat, and play without pressure. All
          welcome! Fresh sprouts, returning veterans, and everyone in between.
        </p>
        <p className="mt-2 text-sm text-muted-foreground/70 italic">
          18+ only · No alts · Mostly active evenings
        </p>
      </div>

      <div className="anim-section relative px-8">
        <Carousel opts={{ loop: true }}>
          <CarouselContent>
            {carouselImages.map((src, i) => (
              <CarouselItem key={i}>
                <div className="overflow-hidden rounded-xl aspect-video">
                  <img
                    src={src}
                    alt={`FC screenshot ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      <div className="anim-section">
        <h2 className="text-xl font-semibold font-serif mb-6">
          What the Meowfia Offers
        </h2>
        <div ref={perksGridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, items }) => (
            <Card key={title} className="perk-card">
              <CardHeader className="pb-2">
                <Icon className="h-6 w-6 mb-1 text-primary" />
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="text-xs text-muted-foreground flex gap-2"
                    >
                      <span className="text-primary mt-0.5">✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="anim-section grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold font-serif mb-3">
            What We Get Up To
          </h2>
          <ul ref={activityListRef} className="space-y-2 text-sm text-muted-foreground">
            {[
              "Mount farms, treasure hunts, and PvP",
              "Casual runs of older content for mounts, glam & achievements",
              "Seasonal social events with small games and prizes",
              "Helping each other through roulettes, clears, and MSQ",
              "The occasional gpose kidnapping",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary shrink-0">✦</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-6 flex flex-col justify-between gap-4">
          <div>
            <p className="font-semibold">Interested in joining?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact any recruiter in-game, slide into a Discord DM, or just
              join our server and say hi.
            </p>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="text-foreground font-medium">Chow Chow</span>:
                Discord: @chowdermaid
              </p>
              <p>
                <span className="text-foreground font-medium">Axo Lotl</span>:
                Discord: @fazzrar
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground/70 italic">
              18+ only · No alts please
            </p>
          </div>
          <a
            href="http://discord.gg/TDdhZgQyCR"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Join our Discord
          </a>
        </div>
      </div>
    </div>
  );
}
