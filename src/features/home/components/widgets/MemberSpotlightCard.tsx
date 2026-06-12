import { Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembers } from "@/hooks/useMembers";
import { getInitials, selectDailyMember } from "../../utils/dailySelection";
import { ClippingCard } from "../newspaper/ClippingCard";

export function MemberSpotlightCard() {
  const members = useMembers();
  const memberCount = Object.keys(members).length;
  const spotlightMember = selectDailyMember(members);

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
                <div className="rounded-md border border-dashed bg-card/70 p-1">
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
                </div>
              </div>
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
            <div className="rounded-md border border-dashed bg-background/70 p-3">
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
