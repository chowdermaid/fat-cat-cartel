import { Link } from "@tanstack/react-router";
import ReactCountryFlag from "react-country-flag";
import { Crown, Heart, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  timezoneCountryCode,
  timezoneLabel,
} from "@/features/member-profile/profileOptions";
import { cn } from "@/lib/utils";
import type { MemberCardProps } from "../types";
import { rankBadgeClass, rankLabel } from "../utils/display";
import { jobIconSrc } from "../utils/jobIcons";
import { isOmniMaxed, jobLevelProgress } from "../utils/jobProgress";

export function MemberCard({ lodestoneId, member, profile }: MemberCardProps) {
  const timezone = profile?.timezone;
  const firstJob = profile?.mainJobs?.[0];
  const firstJobIcon = jobIconSrc(firstJob);
  const omniMaxed = isOmniMaxed(member.jobLevels);
  const progress = jobLevelProgress(member.jobLevels);
  const progressLabel = progress.toFixed(1);

  return (
    <Link
      to="/members/$lodestoneId"
      params={{ lodestoneId }}
      className="member-card group grid min-h-36 grid-cols-[4rem_minmax(0,1fr)] gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
    >
      <div className="pt-1">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-border transition-all group-hover:ring-primary/50"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted ring-2 ring-border transition-all group-hover:ring-primary/50">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-sm font-semibold">{member.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "max-w-full gap-1 px-2 py-0 text-[0.68rem]",
                rankBadgeClass(member.fcRank),
              )}
            >
              {member.fcRank === "Friend" ? (
                <Heart className="h-3 w-3 shrink-0 fill-current" />
              ) : (
                <Shield className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{rankLabel(member.fcRank)}</span>
            </Badge>
            {omniMaxed && (
              <Badge className="gap-1 border-transparent bg-[linear-gradient(170deg,#38bdf8,#3b82f6,#6366f1,#8b5cf6)] px-2 py-0 text-[0.68rem] text-white shadow-sm">
                <Crown className="h-3 w-3 shrink-0" />
                <span>Omni</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-1.5 text-xs text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            {timezone ? (
              <ReactCountryFlag
                countryCode={timezoneCountryCode(timezone)}
                svg
                aria-hidden="true"
                className="shrink-0 text-sm leading-none"
              />
            ) : (
              <span className="h-3.5 w-3.5 shrink-0 rounded-sm bg-muted" />
            )}
            <span className="truncate">
              {timezone ? timezoneLabel(timezone) : "No timezone"}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            {firstJobIcon ? (
              <img
                src={firstJobIcon}
                alt=""
                className="h-4 w-4 shrink-0 rounded-sm object-contain"
              />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-sm bg-muted" />
            )}
            <span className="truncate">{firstJob ?? "No main job"}</span>
          </div>
        </div>

        <div className="mt-auto space-y-1">
          <div className="flex items-center justify-between gap-2 text-[0.68rem] text-muted-foreground">
            <span className="truncate">Level progress</span>
            <span className="font-medium text-foreground">
              {progressLabel}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                omniMaxed
                  ? "bg-[linear-gradient(90deg,#38bdf8,#3b82f6,#6366f1,#8b5cf6)]"
                  : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
