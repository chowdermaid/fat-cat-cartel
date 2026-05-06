import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Info } from "lucide-react";
import { useRaidStats } from "./api/useRaidStats";
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
import type { ContentType } from "./types";

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
      className={`rounded-md font-medium transition-colors ${
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

export function RaidStatsPage() {
  const [activeTab, setActiveTab] = useState<ContentType>(DEFAULT_TAB);
  const [activeZoneId, setActiveZoneId] = useState(DEFAULT_ZONE_ID);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data, loading } = useRaidStats(activeZoneId);
  const pageRef = useRef<HTMLDivElement>(null);

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
  const encounters = data?.meta.encounters ?? [];
  const contentType = data?.meta.contentType ?? activeTab;
  const memberCount = data ? Object.keys(data.members).length : 0;
  const selectedMember =
    selectedMemberId && data?.members[selectedMemberId]
      ? data.members[selectedMemberId]
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-serif">Raid Stats</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Parsed from FFLogs free company rankings · refreshes hourly
        </p>
      </div>

      {/* Main tab bar */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
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

      {activeTab === "ultimate" ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium">Ultimate stats coming soon</p>
          <p className="text-sm text-muted-foreground">
            i cant for the life of me figure out where the ult stats r hidden
            hang with me
          </p>
        </div>
      ) : loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            No data yet for this zone — the hourly sync hasn't run. Check back
            soon.
          </p>
        </div>
      ) : Object.values(data.members).every(
          (m) =>
            Object.keys(
              contentType === "savage" ? (m.savage ?? {}) : (m.normal ?? {}),
            ).length === 0,
        ) ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium">No logs found for this zone</p>
          <p className="text-sm text-muted-foreground">
            Free company members haven't uploaded logs to FFLogs for this
            content yet.
          </p>
        </div>
      ) : (
        <div ref={pageRef} className="space-y-6">
          {/* Zone info bar */}
          <div className="anim-section flex items-end justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {data.meta.name} · {memberCount} members · updated{" "}
              {timeAgoShort(data.lastUpdated)}
            </p>
          </div>

          {/* Summary strip */}
          <div className="anim-section">
            <GuildSummaryStrip
              members={data.members}
              encounters={encounters}
              contentType={contentType}
            />
          </div>

          {/* FFLogs notice */}
          <div className="anim-section flex gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Data is pulled from{" "}
              <a
                href="https://www.fflogs.com/guild/id/139556"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                our FFLogs free company page
              </a>{" "}
              and refreshes every hour.
            </p>
          </div>

          {/* Best parse carousel */}
          <div className="anim-section">
            <BestParseCarousel
              members={data.members}
              encounters={encounters}
              contentType={contentType}
            />
          </div>

          {/* Best per job carousel */}
          <div className="anim-section">
            <BestPerJobCarousel
              members={data.members}
              contentType={contentType}
            />
          </div>

          {/* Member board + radar chart */}
          <div className="anim-section grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MemberBoard
                members={data.members}
                encounters={encounters}
                contentType={contentType}
                selectedId={selectedMemberId}
                onSelect={setSelectedMemberId}
              />
            </div>
            <div>
              <MemberRadarChart
                member={selectedMember}
                encounters={encounters}
                contentType={contentType}
              />
            </div>
          </div>

          {/* Parse distribution — full width, savage only */}
          {contentType === "savage" && (
            <div className="anim-section">
              <ParseHistogramCard
                histogram={data.parseHistogram}
                encounters={encounters}
                contentType={contentType}
              />
            </div>
          )}

          {/* Cards grid */}
          <div className="anim-section grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AllStarsCard members={data.members} />
            <EncounterAveragesCard
              members={data.members}
              encounters={encounters}
              contentType={contentType}
            />
            <JobDistributionCard
              members={data.members}
              contentType={contentType}
            />
            {data.recentKill && <RecentKillCard kill={data.recentKill} />}
          </div>
        </div>
      )}
    </div>
  );
}
