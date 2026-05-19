import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import { Button } from "@/components/ui/button";
import fatcatthrone from "../../../assets/fatcatthrone.png";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    animate(sectionRef.current.querySelectorAll(".hero-item"), {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(120),
      duration: 600,
      easing: "easeOutQuart",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-10 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="hero-item">
          <h1 className="text-5xl font-bold tracking-tight font-serif sm:text-6xl">
            Fat Cat Cartel
          </h1>
          <p className="mt-3 text-xl font-medium text-primary">
            The Meowfia of Eorzea
          </p>
        </div>
        <div className="hero-item flex flex-col items-center gap-0">
          <img src={fatcatthrone} className="w-full max-w-80 h-auto" alt="Fat Cat Cartel" />
          <p className="text-xs text-muted-foreground/70 italic -mt-10">
            drawn by our Dull Hafnir
          </p>
        </div>
        <div className="hero-item flex flex-wrap justify-center gap-3">
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
            <Link to="/pastevents/easter2026">Easter 2026 Event</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
