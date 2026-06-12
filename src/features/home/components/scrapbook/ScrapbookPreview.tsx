import { Link } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewspaperSectionLabel } from "../newspaper/NewspaperSectionLabel";

const scrapbookImages = Object.values(
  import.meta.glob("../../../../assets/carousel/*", {
    eager: true,
    import: "default",
  }) as Record<string, string>,
).slice(0, 3);

export function ScrapbookPreview() {
  return (
    <section className="gazette-reveal rounded-lg border bg-card/70 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <NewspaperSectionLabel kicker="Scrapbook">
          From the Files
        </NewspaperSectionLabel>
        <Button variant="outline" size="sm" asChild>
          <Link to="/pastevents">
            View archive
            <Archive className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 sm:grid-cols-3">
          {scrapbookImages.map((src, index) => (
            <div
              key={src}
              className="gazette-clipping relative overflow-hidden rounded-lg border border-dashed bg-background p-2 shadow-sm"
            >
              <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
              <Badge
                variant="secondary"
                className="absolute left-4 top-4 z-10 text-[0.6rem] uppercase tracking-[0.16em]"
              >
                Photo {index + 1}
              </Badge>
              <div className="aspect-[4/3] overflow-hidden rounded-md border bg-card">
                <img
                  src={src}
                  alt={`FC memory ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-xs italic text-muted-foreground">
                Event archive image {index + 1}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-md border border-dashed bg-background/70 p-4">
          <Badge variant="secondary">Latest archive</Badge>
          <p className="mt-3 font-medium">Easter Social 2026</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Scoreboards, games, prizes, and event notes are tucked into the
            archive.
          </p>
        </div>
      </div>
    </section>
  );
}
