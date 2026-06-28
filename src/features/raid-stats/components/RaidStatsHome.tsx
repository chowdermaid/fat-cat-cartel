import { ArrowRight } from "lucide-react";
import highEndIcon from "@/assets/icons/highend-icon.png";
import raidIcon from "@/assets/icons/raid-icon.png";
import trialIcon from "@/assets/icons/trial-icon.png";
import { Card, CardContent } from "@/components/ui/card";
import { ZONE_TABS } from "../zones";
import type { ContentType } from "../types";

interface Props {
  onSelect: (type: ContentType) => void;
}

const CARD_ICONS: Record<ContentType, string> = {
  savage: highEndIcon,
  trial: trialIcon,
  alliance: raidIcon,
  ultimate: highEndIcon,
};

const CARD_COPY: Record<ContentType, string> = {
  savage: "Current and past Arcadion tiers",
  trial: "Extreme trials and single-encounter fights",
  alliance: "Echoes of Vana'diel alliance clears",
  ultimate: "Current & legacy ultimates",
};

export function RaidStatsHome({ onSelect }: Props) {
  return (
    <div className="grid max-w-5xl gap-4">
      {ZONE_TABS.map((tab) => {
        const icon = CARD_ICONS[tab.type];
        const latest = tab.zones[0];

        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => onSelect(tab.type)}
            className="group cursor-pointer text-left"
          >
            <Card className="h-full transition-colors hover:border-primary/60 hover:bg-muted/40">
              <CardContent className="grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex items-center gap-4 sm:block">
                  <div className="flex h-16 w-16 items-center justify-center">
                    <img
                      src={icon}
                      alt=""
                      className="h-14 w-14 object-contain"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="sm:hidden">
                    <p className="font-serif text-xl font-semibold leading-tight">
                      {tab.label}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {CARD_COPY[tab.type]}
                    </p>
                  </div>
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="hidden sm:block">
                    <h2 className="font-serif text-xl font-semibold leading-tight">
                      {tab.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {CARD_COPY[tab.type]}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {tab.zones.length} zones
                    </span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      Latest: {latest.shortName}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {tab.zones.map((zone) => (
                      <span
                        key={zone.id}
                        className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {zone.shortName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm font-medium text-primary sm:justify-end">
                  <span>View {tab.label}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
