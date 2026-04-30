import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { animate, stagger } from "animejs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFCCollection } from "./api/useFCCollection";
import { COLLECTIBLE_CONFIG } from "./collectibleConfig";
import { FCStats } from "./components/FCStats";

export function FCCollectionPage() {
  const { allCollectibles, membersWithMounts } = useFCCollection();
  const memberCount = membersWithMounts.length;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    animate(gridRef.current.querySelectorAll(".collectible-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold font-serif">FC Collection</h1>
        <p className="mt-1 text-muted-foreground">I love data</p>
      </div>

      <FCStats allCollectibles={allCollectibles} members={membersWithMounts} />

      {/* Privacy notice */}
      <div className="flex gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold">
            Your Lodestone profile must be set to public for your data to
            appear.
          </span>{" "}
          Go to{" "}
          <a
            href="https://na.finalfantasyxiv.com/lodestone/my/setting/account/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Lodestone account settings
          </a>{" "}
          and set <span className="font-medium">Achievements</span>,{" "}
          <span className="font-medium">Mounts</span>, and{" "}
          <span className="font-medium">Minions</span> to{" "}
          <span className="font-medium">Everyone</span>, and ask chow to refresh
          the data. (i'll automate this eventually bear with me q.q)
        </p>
      </div>

      <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {COLLECTIBLE_CONFIG.map((cfg) => {
          const items = allCollectibles[cfg.key];
          const avgOwned =
            memberCount > 0
              ? Math.round(
                  membersWithMounts.reduce(
                    (s, m) => s + m.owned[cfg.key].size,
                    0,
                  ) / memberCount,
                )
              : 0;
          const Icon = cfg.icon;
          return (
            <Card key={cfg.key} className="collectible-card flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  {cfg.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
                <p>
                  {items.length} {cfg.singular.toLowerCase()}s
                </p>
                {memberCount > 0 && (
                  <p>
                    Avg owned: {avgOwned} / {items.length}
                  </p>
                )}
                <p>{memberCount} members</p>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/fc-collection/$type" params={{ type: cfg.key }}>
                    View {cfg.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
