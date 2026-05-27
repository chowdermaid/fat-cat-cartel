import { useRef, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import ReactCountryFlag from "react-country-flag";
import { Crown, Heart, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMembers } from "@/hooks/useMembers";
import { db, get, ref } from "@/lib/db";
import {
  timezoneCountryCode,
  timezoneLabel,
} from "@/features/member-profile/profileOptions";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import type { MemberProfile } from "@/features/member-profile/types";

const jobIconMap = import.meta.glob<string>("../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const RANK_SORT_ORDER = new Map([
  ["Boss", 0],
  ["Underpaw", 1],
  ["Housecat", 2],
  ["Stray", 3],
]);

const JOB_MAX_LEVELS: Record<string, number> = {
  Paladin: 100,
  Warrior: 100,
  "Dark Knight": 100,
  Gunbreaker: 100,
  "White Mage": 100,
  Scholar: 100,
  Astrologian: 100,
  Sage: 100,
  Monk: 100,
  Dragoon: 100,
  Ninja: 100,
  Samurai: 100,
  Reaper: 100,
  Viper: 100,
  Bard: 100,
  Machinist: 100,
  Dancer: 100,
  "Black Mage": 100,
  Summoner: 100,
  "Red Mage": 100,
  Pictomancer: 100,
  "Blue Mage": 80,
  Carpenter: 100,
  Blacksmith: 100,
  Armorer: 100,
  Goldsmith: 100,
  Leatherworker: 100,
  Weaver: 100,
  Alchemist: 100,
  Culinarian: 100,
  Miner: 100,
  Botanist: 100,
  Fisher: 100,
};

const JOB_ICON_SLUG: Record<string, string> = {
  Paladin: "paladin",
  Warrior: "warrior",
  "Dark Knight": "darkknight",
  Gunbreaker: "gunbreaker",
  "White Mage": "whitemage",
  Scholar: "scholar",
  Astrologian: "astrologian",
  Sage: "sage",
  Monk: "monk",
  Dragoon: "dragoon",
  Ninja: "ninja",
  Samurai: "samurai",
  Reaper: "reaper",
  Viper: "viper",
  Bard: "bard",
  Machinist: "machinist",
  Dancer: "dancer",
  "Black Mage": "blackmage",
  Summoner: "summoner",
  "Red Mage": "redmage",
  Pictomancer: "pictomancer",
  "Blue Mage": "bluemage",
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
  Miner: "Miner",
  Botanist: "Botanist",
  Fisher: "Fisher",
};

function rankSortValue(rank: string | null) {
  return rank ? (RANK_SORT_ORDER.get(rank) ?? 4) : 4;
}

function rankLabel(rank: string | null) {
  if (rank === "Friend") return "Friend";
  return rank && RANK_SORT_ORDER.has(rank) ? rank : "Member";
}

function rankBadgeClass(rank: string | null) {
  if (rank === "Friend") {
    return "border-pink-300/60 bg-pink-500/10 text-pink-600 dark:border-pink-400/40 dark:bg-pink-400/10 dark:text-pink-200";
  }

  return "";
}

function isOmniMaxed(jobLevels?: Record<string, number | null>) {
  if (!jobLevels) return false;

  return Object.entries(JOB_MAX_LEVELS).every(([job, maxLevel]) => {
    const level = jobLevels[job];
    return typeof level === "number" && level >= maxLevel;
  });
}

function jobLevelProgress(jobLevels?: Record<string, number | null>) {
  const entries = Object.entries(JOB_MAX_LEVELS);
  const maxTotal = entries.reduce((sum, [, maxLevel]) => sum + maxLevel, 0);
  const currentTotal = entries.reduce((sum, [job, maxLevel]) => {
    const level = jobLevels?.[job] ?? 0;
    return sum + Math.min(typeof level === "number" ? level : 0, maxLevel);
  }, 0);

  return (currentTotal / maxTotal) * 100;
}

function jobIconSrc(job: string | undefined): string | null {
  if (!job) return null;
  const slug = JOB_ICON_SLUG[job];
  return slug ? (jobIconMap[`../../assets/jobs/${slug}.png`] ?? null) : null;
}

function MemberCard({
  lodestoneId,
  member,
  profile,
}: {
  lodestoneId: string;
  member: Member;
  profile?: MemberProfile | null;
}) {
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

export function MembersPage() {
  const members = useMembers();
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const pageRef = useRef<HTMLDivElement>(null);

  const entries = Object.entries(members).sort(([, a], [, b]) => {
    const rankDiff = rankSortValue(a.fcRank) - rankSortValue(b.fcRank);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });

  const totalCount = entries.length;

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      const snap = await get(ref(db, "memberProfiles"));
      if (cancelled) return;
      setProfiles((snap.val() ?? {}) as Record<string, MemberProfile>);
    }

    loadProfiles().catch(() => {
      if (!cancelled) setProfiles({});
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pageRef.current || totalCount === 0) return;
    animate(pageRef.current.querySelectorAll(".member-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(35),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [totalCount]);

  return (
    <div ref={pageRef} className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold font-serif">Members</h1>
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {entries.map(([id, member]) => (
            <MemberCard
              key={id}
              lodestoneId={id}
              member={member}
              profile={profiles[id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
