import type { MemberData, TomestoneActivity } from "../../types";
import { timeAgoShort } from "../../utils/timeFormatting";

export function TomestoneActivitySection({
  activities,
  members,
}: {
  activities: TomestoneActivity[];
  members: Record<string, MemberData>;
}) {
  if (activities.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Recent Activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Activity from the last 30 days.
        </p>
      </div>
      <div className="divide-y">
        {activities.slice(0, 16).map((activity) => {
          const member = members[activity.lodestoneId];
          const result =
            activity.clearCount > 0
              ? `${activity.clearCount} clear${activity.clearCount === 1 ? "" : "s"}`
              : activity.bestProgress != null
                ? `${activity.bestProgress.toFixed(1)}% best pull`
                : "activity";
          return (
            <div
              key={`${activity.lodestoneId}-${activity.id}`}
              className="flex items-center gap-3 px-4 py-3"
            >
              {member?.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member?.name ?? "Unknown"} - {activity.encounterName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activity.jobAbbr ?? activity.job ?? "Unknown job"} - {result}
                  {activity.wipeCount > 0
                    ? `, ${activity.wipeCount} wipes`
                    : ""}
                  {activity.killDuration ? `, ${activity.killDuration}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {timeAgoShort(activity.startedAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
