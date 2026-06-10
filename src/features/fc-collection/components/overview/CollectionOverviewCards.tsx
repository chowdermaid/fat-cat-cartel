import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COLLECTIBLE_CONFIG } from "../../constants";
import type { AllCollectibles, CollectionScope, MemberWithMounts } from "../../types";

interface CollectionOverviewCardsProps {
  allCollectibles: AllCollectibles;
  memberCount: number;
  scope: CollectionScope;
  scopedMembers: MemberWithMounts[];
}

export function CollectionOverviewCards({
  allCollectibles,
  memberCount,
  scope,
  scopedMembers,
}: CollectionOverviewCardsProps) {
  return (
    <>
      {COLLECTIBLE_CONFIG.map((cfg) => {
        const items = allCollectibles[cfg.key];
        const avgOwned =
          memberCount > 0
            ? Math.round(
                scopedMembers.reduce(
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
              <p>{memberCount} {scope === "all" ? "people" : "members"}</p>
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
    </>
  );
}
