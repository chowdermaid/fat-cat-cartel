import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HOME_GAZETTE } from "../../constants";
import { useHomeAnimations } from "../../hooks/useHomeAnimations";
import { NewspaperStamp } from "../newspaper/NewspaperStamp";
import fatcatthrone from "../../../../assets/fatcatthrone.png";

export function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);

  useHomeAnimations(sectionRef, ".hero-item", 20, 0, 120, 600);

  return (
    <div className="relative mt-6">
      <div className="absolute -top-6 left-5 z-0 hidden gap-1 sm:flex">
        {["FC file", "Sophia", "Ward 1"].map((label) => (
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
        className="relative z-10 overflow-visible rounded-lg border bg-card/80 px-5 py-6 shadow-sm sm:px-8 sm:pt-10 lg:px-10"
      >
        <div className="absolute right-6 top-5 z-20 hidden sm:block bg-muted">
          <NewspaperStamp>{HOME_GAZETTE.issue}</NewspaperStamp>
        </div>
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="hero-item space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {HOME_GAZETTE.name}
              </p>
              <h1 className="border-y border-dashed py-3 text-4xl font-bold tracking-tight font-serif sm:text-6xl">
                Fat Cat Cartel
              </h1>
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
              A quick look at Fat Cat Cartel’s events, notices, tools, and
              community activity.
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
          <div className="hero-item relative flex flex-col items-center gap-0 rounded-lg border border-dashed bg-background/60 p-4">
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
