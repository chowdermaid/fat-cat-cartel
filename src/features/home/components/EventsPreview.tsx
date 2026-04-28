import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EventsPreview() {
  return (
    <section className="py-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-serif">Upcoming Events</h2>
        <p className="mt-2 text-muted-foreground">
          Don't miss what the Meowfia has planned.
        </p>
      </div>
      <div>
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
      </div>
    </section>
  );
}
