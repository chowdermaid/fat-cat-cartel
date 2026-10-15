import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewspaperSectionLabel } from "../newspaper/NewspaperSectionLabel";
import fatcatthrone from "@/assets/fatcatthrone.png";

const archiveImages = Object.values(
  import.meta.glob("../../../../assets/carousel/*", {
    eager: true,
    import: "default",
  }) as Record<string, string>,
);

const scrapbookImages = [
  {
    src: fatcatthrone,
    alt: "Fat Cat Cartel illustration by Dull Hafnir",
    badge: "FC art",
    caption: "Drawn by our Dull Hafnir.",
    fit: "object-contain",
  },
  ...archiveImages.map((src, index) => ({
    src,
    alt: `FC memory ${index + 1}`,
    badge: `Photo ${index + 1}`,
    caption: `Event archive image ${index + 1}`,
    fit: "object-cover",
  })),
];

export function ScrapbookPreview() {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const canRotate = archiveImages.length > 2;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setPaused(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || !canRotate) return;
    const timer = window.setInterval(() => {
      setPhotoIndex((index) => (index + 2) % archiveImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, canRotate]);

  const visibleImages = [
    scrapbookImages[0],
    ...Array.from({ length: Math.min(2, archiveImages.length) }, (_, offset) =>
      scrapbookImages[1 + (photoIndex + offset) % archiveImages.length],
    ),
  ];

  function stepPhotos(direction: number) {
    setPaused(true);
    setPhotoIndex((index) => (index + direction * 2 + archiveImages.length) % archiveImages.length);
  }

  return (
    <section className="gazette-reveal rounded-lg border bg-card/70 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <NewspaperSectionLabel kicker="Scrapbook">
          From the Files
        </NewspaperSectionLabel>
        <div className="flex flex-wrap items-center gap-2">
          {canRotate && (
            <div className="flex items-center gap-1" role="group" aria-label="Scrapbook photo controls">
              <Button variant="outline" size="icon" aria-label="Previous photos" onClick={() => stepPhotos(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label={paused ? "Play photo rotation" : "Pause photo rotation"} onClick={() => setPaused((value) => !value)}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" aria-label="Next photos" onClick={() => stepPhotos(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/pastevents">
              View archive
              <Archive className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 sm:grid-cols-3">
          {visibleImages.map(({ src, alt, badge, caption, fit }) => (
            <div
              key={src}
              className="gazette-clipping relative overflow-hidden rounded-lg border border-dashed bg-background p-2 shadow-sm"
            >
              <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
              <Badge
                variant="secondary"
                className="absolute left-4 top-4 z-10 text-[0.6rem] uppercase tracking-[0.16em]"
              >
                {badge}
              </Badge>
              <div className={`aspect-[4/3] overflow-hidden rounded-md border ${src === fatcatthrone ? "bg-background" : "bg-card"}`}>
                <img
                  src={src}
                  alt={alt}
                  className={`h-full w-full ${fit}`}
                />
              </div>
              <p className="mt-2 text-xs italic text-muted-foreground">
                {caption}
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
