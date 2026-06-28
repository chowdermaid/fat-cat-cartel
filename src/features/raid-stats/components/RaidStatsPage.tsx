import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { ArrowLeft, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionScopeToggle } from "@/features/fc-collection/components/scope/CollectionScopeToggle";
import { useRaidStatsPageState } from "../hooks/useRaidStatsPageState";
import { timeAgoShort } from "../utils/timeFormatting";
import { TomestoneActivitySection } from "./activity/TomestoneActivitySection";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { RaidStatsTabButton } from "./navigation/RaidStatsTabButton";
import { BestParseCarousel } from "./parses/BestParseCarousel";
import { BestPerJobCarousel } from "./parses/BestPerJobCarousel";
import { MemberBoard } from "./parses/MemberBoard";
import { MemberRadarChart } from "./parses/MemberRadarChart";
import { RaidStatsHome } from "./RaidStatsHome";
import { AllStarsCard } from "./summary/AllStarsCard";
import { EncounterAveragesCard } from "./summary/EncounterAveragesCard";
import { GuildSummaryStrip } from "./summary/GuildSummaryStrip";
import { JobDistributionCard } from "./summary/JobDistributionCard";
import { RecentKillCard } from "./kills/RecentKillCard";

export function RaidStatsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const {
    activeTab,
    activeZoneId,
    contentType,
    currentTab,
    data,
    encounters,
    handleCategorySelect,
    handleHomeClick,
    hasVisibleParses,
    includeFriends,
    loading,
    memberCount,
    scopedActivity,
    scopedJoinedMembers,
    selectedMember,
    selectedMemberId,
    setActiveZoneId,
    setScope,
    setSelectedMemberId,
    scope,
  } = useRaidStatsPageState();

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

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-4">
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

      {!activeTab || !currentTab ? (
        <RaidStatsHome onSelect={handleCategorySelect} />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHomeClick}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              All categories
            </Button>
          </div>

          {currentTab.zones.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {currentTab.zones.map((zone) => (
                <RaidStatsTabButton
                  key={zone.id}
                  size="sm"
                  active={activeZoneId === zone.id}
                  onClick={() => setActiveZoneId(zone.id)}
                >
                  {zone.shortName}
                </RaidStatsTabButton>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab && currentTab && loading ? (
        <LoadingSkeleton />
      ) : activeTab && currentTab && !data ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            No data yet for this zone. The sync hasn't run yet. Check back soon.
          </p>
        </div>
      ) : activeTab && currentTab && !hasVisibleParses && scopedActivity.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 px-6 py-10 text-center space-y-2">
          <p className="text-sm font-medium">No raid data found for this zone</p>
          <p className="text-sm text-muted-foreground">
            {includeFriends ? "Tracked characters" : "Free company members"}{" "}
            do not have FFLogs or Tomestone activity for this content yet.
          </p>
        </div>
      ) : activeTab && currentTab && data ? (
        <div ref={pageRef} className="min-w-0 max-w-full space-y-6">
          <div className="anim-section flex items-end justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {data.meta.name} Â· {memberCount} members Â· updated{" "}
              {timeAgoShort(data.lastUpdated)}
            </p>
          </div>

          {hasVisibleParses && (
            <>
              <div className="anim-section">
                <GuildSummaryStrip
                  members={scopedJoinedMembers}
                  encounters={encounters}
                  contentType={contentType}
                />
              </div>

              <div className="anim-section min-w-0 max-w-full overflow-hidden">
                <BestParseCarousel
                  members={scopedJoinedMembers}
                  encounters={encounters}
                  contentType={contentType}
                  showFriendBadges={includeFriends}
                />
              </div>

              <div className="anim-section min-w-0 max-w-full overflow-hidden">
                <BestPerJobCarousel
                  members={scopedJoinedMembers}
                  contentType={contentType}
                  showFriendBadges={includeFriends}
                />
              </div>

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
      ) : null}
    </div>
  );
}
