import { Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerWithColor } from "../../types";
import { useDmuProgress } from "../../hooks/useDmuProgress";
import { formatDateTime, formatPercent, timeAgoShort } from "../../utils/formatting";

export function DmuRecentActivity({
  activities,
  players,
}: {
  activities: NonNullable<ReturnType<typeof useDmuProgress>["data"]>["activities"];
  players: Record<string, PlayerWithColor>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Cached DMU activity history, newest first.</p>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DMU activity is cached yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {activities.slice(0, 24).map((activity) => {
              const player = players[activity.lodestoneId];
              const result =
                activity.clearCount > 0
                  ? `${activity.clearCount} clear${activity.clearCount === 1 ? "" : "s"}`
                  : activity.bestProgress != null
                    ? `${formatPercent(activity.bestProgress)} best pull`
                    : "activity";
              return (
                <div key={`${activity.lodestoneId}-${activity.id}`} className="flex items-center gap-3 px-4 py-3">
                  {player?.avatarUrl ? (
                    <img src={player.avatarUrl} alt={player.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{player?.name ?? "Unknown"} - Dancing Mad</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {activity.jobAbbr ?? activity.job ?? "Unknown job"} - {result}
                      {activity.wipeCount > 0 ? `, ${activity.wipeCount} wipes` : ""}
                      {activity.killDuration ? `, ${activity.killDuration}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span title={formatDateTime(activity.startedAt)}>{timeAgoShort(activity.startedAt)}</span>
                    {activity.reportUrl && (
                      <a href={activity.reportUrl} target="_blank" rel="noopener noreferrer" aria-label="Open report">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
