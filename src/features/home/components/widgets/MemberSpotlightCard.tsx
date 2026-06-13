import { Link } from "@tanstack/react-router";
import { ArrowRight, Mountain, Rabbit, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { getInitials, selectDailyMember } from "../../utils/dailySelection";
import type { HomeWeeklyData } from "../../types";
import { ClippingCard } from "../newspaper/ClippingCard";

function excerptBio(bio: string | null | undefined): string | null {
  const cleanBio = bio?.trim();
  if (!cleanBio) return null;
  return cleanBio;
}

export function MemberSpotlightCard({
  profiles,
}: {
  profiles: HomeWeeklyData["profiles"];
}) {
  const members = useMembers();
  const memberCount = Object.keys(members).length;
  const spotlightMember = selectDailyMember(members);
  const bio = spotlightMember
    ? excerptBio(profiles[spotlightMember.lodestoneId]?.bio)
    : null;

  return (
    <ClippingCard className="gazette-reveal" rotate="right">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-lg">
          <Star className="h-4 w-4 text-primary" />
          Person of Interest
        </CardTitle>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Member file
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {spotlightMember ? (
          <>
            <div className="rounded-md border bg-background/70 p-3">
              <div className="grid gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
                <div className="rounded-md border bg-card/70 p-1">
                  {spotlightMember.avatarUrl ? (
                    <img
                      src={spotlightMember.avatarUrl}
                      alt={spotlightMember.name}
                      className="aspect-square w-full rounded-sm object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-sm bg-muted text-sm font-semibold text-muted-foreground">
                      {getInitials(spotlightMember.name)}
                    </div>
                  )}
                  <p className="mt-1 text-center text-[0.55rem] font-semibold uppercase tracking-[0.16em]">
                    File photo
                  </p>
                </div>
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2">
                    Member file
                  </Badge>
                  <p className="truncate font-medium text-foreground">
                    {spotlightMember.name}
                  </p>
                  <p className="mt-1 text-xs">
                    {spotlightMember.fcRank ?? "Cartel member"}
                  </p>
                  {(spotlightMember.totalMounts != null ||
                    spotlightMember.totalMinions != null) && (
                    <div className="mt-3 flex min-w-0 gap-2 overflow-hidden">
                      {spotlightMember.totalMounts != null && (
                        <Badge
                          variant="secondary"
                          className="min-w-0 shrink gap-1"
                        >
                          <Mountain className="h-3 w-3 shrink-0" />
                          {spotlightMember.totalMounts.toLocaleString()} mounts
                        </Badge>
                      )}
                      {spotlightMember.totalMinions != null && (
                        <Badge
                          variant="secondary"
                          className="min-w-0 shrink gap-1"
                        >
                          <Rabbit className="h-3 w-3 shrink-0" />
                          {spotlightMember.totalMinions.toLocaleString()} minions
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {bio && (
                <p className="mt-3 border-l-4 border-primary/50 pl-3 text-xs italic leading-relaxed">
                  "{bio}"
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link
                to="/members/$lodestoneId"
                params={{ lodestoneId: spotlightMember.lodestoneId }}
              >
                View profile
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-md border bg-background/70 p-3">
              <p className="font-medium text-foreground">
                {memberCount === 0
                  ? "Spotlight loading"
                  : "No members available."}
              </p>
              <p className="mt-1">
                Daily spotlight appears once member data is ready.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/members">
                Browse members
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </ClippingCard>
  );
}
