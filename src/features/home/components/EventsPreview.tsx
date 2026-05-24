import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { animate } from "animejs";
import { Archive, ArrowRight, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EventsPreview() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    animate(sectionRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      easing: "easeOutQuart",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-serif">Upcoming Events</h2>
        <p className="mt-2 text-muted-foreground">
          Don't miss what the Meowfia has planned.
        </p>
      </div>
      <div className="space-y-5">
        <Card className="flex flex-col border-dashed opacity-60 max-w-sm">
          <CardHeader>
            <CardTitle className="mt-2 font-serif">More Events</CardTitle>
            <CardDescription>
              The Meowfia is always planning something. Stay tuned.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1" />
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              Details TBA
            </Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col max-w-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-serif leading-tight flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  Past Events
                </CardTitle>
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <CalendarDays className="h-3 w-3" />
                  Latest: Easter Social 2026
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Archived
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <CardDescription>
              Browse archived FC socials, scoreboards, and event pages.
            </CardDescription>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/pastevents">
                View archive
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
