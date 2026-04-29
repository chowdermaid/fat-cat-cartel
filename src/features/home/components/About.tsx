import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Archive, LayoutGrid, Swords } from "lucide-react";
import { animate, stagger } from "animejs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickLinks = [
  {
    to: "/fc-collection",
    icon: LayoutGrid,
    title: "FC Collection",
    description: "Track mounts and collection progress across FC members.",
  },
  {
    to: "/pastevents",
    icon: Archive,
    title: "Past Events",
    description: "Archived FC socials.",
  },
  {
    to: "/jointhemeowfia",
    icon: Swords,
    title: "Join the Meowfia",
    description:
      "Find out what we're about, what we offer, and how to get in touch with a recruiter.",
  },
] as const;

export function About() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    animate(gridRef.current.querySelectorAll(".about-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <section>
      <div ref={gridRef} className="grid gap-5 sm:grid-cols-3">
        {quickLinks.map(({ to, icon: Icon, title, description }) => (
          <Card key={to} className="about-card flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={to}>
                  {title}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
