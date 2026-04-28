import { Link } from "@tanstack/react-router";
import { Mountain, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFCCollection } from "./api/useFCCollection";

export function FCCollectionPage() {
  const {
    members,
    allMounts,
    membersWithMounts,
  } = useFCCollection();

  const totalOwned = membersWithMounts.reduce(
    (sum, m) => sum + m.ownedMountIds.size,
    0,
  );
  const avgOwned =
    membersWithMounts.length > 0
      ? Math.round(totalOwned / membersWithMounts.length)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-serif">FC Collection</h1>
        <p className="mt-1 text-muted-foreground">
          What we have as an FC — or a wall of shame.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Mountain className="h-5 w-5 text-muted-foreground shrink-0" />
              Mounts
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
            <p>{allMounts.length} mounts tracked</p>
            {members.length > 0 && (
              <p>
                Avg owned: {avgOwned} / {allMounts.length}
              </p>
            )}
            <p>{members.length} members</p>
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/fc-collection/mounts">
                View Mounts
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground shrink-0" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground space-y-0.5">
            <p>Ranked by collection progress</p>
            <p>{members.length} members competing</p>
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
