import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export function EventsPreview() {
  return (
    <section className="py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-serif">Upcoming Events</h2>
        <p className="mt-2 text-muted-foreground">
          Don't miss what the Meowfia has planned.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge>Live Now</Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                April 2026
              </div>
            </div>
            <CardTitle className="mt-2 font-serif">
              Easter Social 2026
            </CardTitle>
            <CardDescription>
              A full evening of events! compete across Hide &amp; Seek, Trivia,
              and Eorzea Guessr for points. Plus Death Roll and Typeracer for
              standalone prizes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex gap-2 items-center">
                <span>🥚</span>
                <span>Hide &amp; Seek — 3 rounds, 45 min+</span>
              </li>
              <li className="flex gap-2 items-center">
                <span>🎲</span>
                <span>Death Roll — standalone prizes</span>
              </li>
              <li className="flex gap-2 items-center">
                <span>🧠</span>
                <span>Trivia — quick-fire, 10 min</span>
              </li>
              <li className="flex gap-2 items-center">
                <span>🗺️</span>
                <span>Eorzea Guessr — 30 min</span>
              </li>
              <li className="flex gap-2 items-center text-muted-foreground/60">
                <span>⌨️</span>
                <span>Typeracer — bonus hangout game</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/easter2026">View Scoreboard & Details</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col border-dashed opacity-60">
          <CardHeader>
            <Badge variant="secondary">Coming Soon</Badge>
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
      </div>
    </section>
  );
}
