import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, ArrowRight } from "lucide-react";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif">FC Collection</h1>
        <p className="mt-1 text-muted-foreground">I love data</p>
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

        <Card className="collectible-card flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground shrink-0" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
            <p>
              Place for axo to flex her collection (aka carbon date how old she
              is)
            </p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/fc-collection/leaderboard">
                View Leaderboard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
