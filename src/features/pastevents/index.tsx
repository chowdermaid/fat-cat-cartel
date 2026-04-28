import { Link } from "@tanstack/react-router";
import { CalendarDays, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pastEvents = [
  {
    slug: "easter2026",
    emoji: "🐣",
    title: "Easter Social 2026",
    date: "26 April 2026",
    description:
      "Hide & Seek, Death Roll, Eorzea Guessr, Trivia, and bonus games. Points fed into a live scoreboard with prizes for top placements.",
  },
];

export function PastEventsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-bold font-serif">Past Events</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">Archived FC events!</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pastEvents.map((event) => (
          <Card key={event.slug} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{event.emoji}</span>
                  <div>
                    <CardTitle className="text-lg font-serif leading-tight">
                      {event.title}
                    </CardTitle>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <CalendarDays className="h-3 w-3" />
                      {event.date}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Archived
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/pastevents/easter2026">
                  View event
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
