import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { BarChart2 } from "lucide-react";
import { useRaidStats } from "./api/useRaidStats";
import { useMembers } from "@/hooks/useMembers";
import { CollectionScopeToggle } from "@/features/fc-collection/components/scope/CollectionScopeToggle";
import { useCollectionScope } from "@/features/fc-collection/hooks/useCollectionScope";
import { filterByCollectionScope } from "@/features/fc-collection/utils/collectionScope";
import { MemberBoard } from "./components/MemberBoard";
import { MemberRadarChart } from "./components/MemberRadarChart";
import { AllStarsCard } from "./components/AllStarsCard";
import { JobDistributionCard } from "./components/JobDistributionCard";
import { RecentKillCard } from "./components/RecentKillCard";
import { ParseHistogramCard } from "./components/ParseHistogramCard";
import { BestParseCarousel } from "./components/BestParseCarousel";
import { BestPerJobCarousel } from "./components/BestPerJobCarousel";
import { GuildSummaryStrip } from "./components/GuildSummaryStrip";
import { EncounterAveragesCard } from "./components/EncounterAveragesCard";
import { ZONE_TABS, DEFAULT_ZONE_ID, DEFAULT_TAB } from "./zones";
import type {
  ContentType,
  MemberData,
  ParseBuckets,
  TomestoneActivity,
  ZoneEncounter,
} from "./types";

const EMPTY_ENCOUNTERS: ZoneEncounter[] = [];

function LoadingSkeleton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(".sk"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(35),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, []);
  return (
    <div ref={ref} className="space-y-6">
      <div className="sk space-y-2">
        <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
      </div>
      <div className="sk h-11 rounded-lg bg-muted animate-pulse" />
      <div className="sk h-40 rounded-xl bg-muted animate-pulse" />
      <div className="sk h-40 rounded-xl bg-muted animate-pulse" />
      <div className="sk h-64 rounded-xl bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk h-52 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="sk h-52 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}

function timeAgoShort(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (mins < 2) return "just now";
  if (hours < 1) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function emptyBuckets(): ParseBuckets {
  return { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 };
}

function percentileBucket(p: number): keyof ParseBuckets {
  if (p >= 100) return "gold";
  if (p >= 99) return "pink";
  if (p >= 95) return "orange";
  if (p >= 75) return "purple";
  if (p >= 50) return "blue";
  if (p >= 25) return "green";
  return "grey";
}

function buildScopedHistogram(
  members: Record<string, MemberData>,
  encounters: Array<{ key: string }>,
): Record<string, { savage: ParseBuckets; normal: ParseBuckets }> {
  const histogram = Object.fromEntries(
    encounters.map((enc) => [
      enc.key,
      { savage: emptyBuckets(), normal: emptyBuckets() },
    ]),
  ) as Record<string, { savage: ParseBuckets; normal: ParseBuckets }>;

  for (const member of Object.values(members)) {
    for (const [key, parse] of Object.entries(member.savage ?? {})) {
      if (!parse || !histogram[key]) continue;
      histogram[key].savage[percentileBucket(parse.percentile)]++;
    }
    for (const [key, parse] of Object.entries(member.normal ?? {})) {
      if (!parse || !histogram[key]) continue;
      histogram[key].normal[percentileBucket(parse.percentile)]++;
    }
  }

  return histogram;
}

function TabButton({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: "md" | "sm";
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-md font-medium transition-colors ${
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}

function TomestoneActivitySection({
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

export function RaidStatsPage() {
  const [activeTab, setActiveTab] = useState<ContentType>(DEFAULT_TAB);
  const [activeZoneId, setActiveZoneId] = useState(DEFAULT_ZONE_ID);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { scope, setScope, includeFriends } = useCollectionScope();

  const { data, loading } = useRaidStats(activeZoneId);
  const members = useMembers();
  const pageRef = useRef<HTMLDivElement>(null);

  const joinedMembers = useMemo((): Record<string, MemberData> => {
    if (!data) return {};
    const ids = new Set([
      ...Object.keys(data.parses ?? {}),
      ...Object.keys(data.members ?? {}),
    ]);
    return Object.fromEntries(
      [...ids].map((id) => {
        const parse = data.parses?.[id] ?? { savage: {}, normal: {}, allStars: null };
        const identity = members[id];
        return [
          id,
          {
            ...parse,
            name: identity?.name ?? "Unknown",
            server: identity?.server ?? "",
            lodestoneId: id,
            avatarUrl: identity?.avatarUrl ?? null,
            fcRank: identity?.fcRank ?? null,
            isFriend: identity?.fcRank === "Friend",
            tomestone: data.members?.[id] ?? null,
          },
        ];
      }),
    );
  }, [data, members]);

  const scopedJoinedMembers = useMemo((): Record<string, MemberData> => {
    const scoped = filterByCollectionScope(Object.values(joinedMembers), scope);
    return Object.fromEntries(
      scoped.map((member) => [member.lodestoneId ?? member.name, member]),
    );
  }, [joinedMembers, scope]);

  function handleTabChange(type: ContentType) {
    setActiveTab(type);
    const tab = ZONE_TABS.find((t) => t.type === type)!;
    setActiveZoneId(tab.zones[0].id);
    setSelectedMemberId(null);
  }

  useEffect(() => {
    if (!data || !pageRef.current) return;
    animate(pageRef.current.querySelectorAll(".anim-section"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [data]);

  const currentTab = ZONE_TABS.find((t) => t.type === activeTab)!;
  const encounters = data?.meta.encounters ?? EMPTY_ENCOUNTERS;
  const contentType = data?.meta.contentType ?? activeTab;
  const memberCount = Object.keys(scopedJoinedMembers).length;
  const selectedMember = selectedMemberId
    ? (scopedJoinedMembers[selectedMemberId] ?? null)
    : null;
  const scopedHistogram = useMemo(
    () => buildScopedHistogram(scopedJoinedMembers, encounters),
    [scopedJoinedMembers, encounters],
  );
  const scopedActivity = useMemo(
    () =>
      (data?.recentActivity ?? []).filter(
        (activity) =>
          includeFriends || members[activity.lodestoneId]?.fcRank !== "Friend",
      ),
    [data?.recentActivity, includeFriends, members],
  );
  const hasVisibleParses = Object.values(scopedJoinedMembers).some(
    (m) =>
      Object.keys(
        contentType === "savage" ? (m.savage ?? {}) : (m.normal ?? {}),
      ).length > 0,
  );

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <BarChart2 className="h-7 w-7 text-muted-foreground" />
            Raid Stats
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Historical parse performance from fflogs
          </p>
        </div>
        <CollectionScopeToggle scope={scope} onChange={setScope} />
      </div>

      {/* Main tab bar */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
        {ZONE_TABS.map((tab) => (
          <TabButton
            key={tab.type}
            active={activeTab === tab.type}
            onClick={() => handleTabChange(tab.type)}
          >
            {tab.label}
          </TabButton>
        ))}
      </div>

      {/* Sub-zone tabs */}
      {currentTab.zones.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {currentTab.zones.map((zone) => (
            <TabButton
              key={zone.id}
              size="sm"
              active={activeZoneId === zone.id}
              onClick={() => setActiveZoneId(zone.id)}
            >
              {zone.shortName}
            </TabButton>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            No data yet for this zone. The sync hasn't run yet. Check back soon.
          </p>
        </div>
      ) : !hasVisibleParses && scopedActivity.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium">No raid data found for this zone</p>
          <p className="text-sm text-muted-foreground">
            {includeFriends ? "Tracked characters" : "Free company members"}{" "}
            do not have FFLogs or Tomestone activity for this content yet.
          </p>
        </div>
      ) : (
        <div ref={pageRef} className="min-w-0 max-w-full space-y-6">
          {/* Zone info bar */}
          <div className="anim-section flex items-end justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {data.meta.name} · {memberCount} members · updated{" "}
              {timeAgoShort(data.lastUpdated)}
            </p>
          </div>

          {hasVisibleParses && (
            <>
              {/* Summary strip */}
              <div className="anim-section">
                <GuildSummaryStrip
                  members={scopedJoinedMembers}
                  encounters={encounters}
                  contentType={contentType}
                />
              </div>

              {/* Best parse carousel */}
              <div className="anim-section min-w-0 max-w-full overflow-hidden">
                <BestParseCarousel
                  members={scopedJoinedMembers}
                  encounters={encounters}
                  contentType={contentType}
                  showFriendBadges={includeFriends}
                />
              </div>

              {/* Best per job carousel */}
              <div className="anim-section min-w-0 max-w-full overflow-hidden">
                <BestPerJobCarousel
                  members={scopedJoinedMembers}
                  contentType={contentType}
                  showFriendBadges={includeFriends}
                />
              </div>

              {/* Member board + radar chart */}
              <div className="anim-section grid min-w-0 gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <MemberBoard
                    members={scopedJoinedMembers}
                    encounters={encounters}
                    contentType={contentType}
                    selectedId={selectedMemberId}
                    onSelect={setSelectedMemberId}
                    showFriendBadges={includeFriends}
                  />
                </div>
                <div className="min-w-0">
                  <MemberRadarChart
                    member={selectedMember}
                    encounters={encounters}
                    contentType={contentType}
                    showFriendBadges={includeFriends}
                  />
                </div>
              </div>

              {/* Parse distribution, savage only */}
              {contentType === "savage" && (
                <div className="anim-section">
                  <ParseHistogramCard
                    histogram={scopedHistogram}
                    encounters={encounters}
                    contentType={contentType}
                  />
                </div>
              )}

              {/* Cards grid */}
              <div className="anim-section grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AllStarsCard
                  members={scopedJoinedMembers}
                  showFriendBadges={includeFriends}
                />
                <EncounterAveragesCard
                  members={scopedJoinedMembers}
                  encounters={encounters}
                  contentType={contentType}
                />
                <JobDistributionCard
                  members={scopedJoinedMembers}
                  contentType={contentType}
                />
                {data.recentKill && <RecentKillCard kill={data.recentKill} />}
              </div>
            </>
          )}

          {!hasVisibleParses && scopedActivity.length > 0 && (
            <div className="anim-section rounded-lg border bg-muted/30 px-6 py-6 text-center space-y-2">
              <p className="text-sm font-medium">No FFLogs parses found</p>
              <p className="text-sm text-muted-foreground">
                Tomestone activity is available for this zone.
              </p>
            </div>
          )}

          <div className="anim-section">
            <TomestoneActivitySection
              activities={scopedActivity}
              members={scopedJoinedMembers}
            />
          </div>
        </div>
      )}
    </div>
  );
}
