import { useMemo, useState } from "react";
import { useCollectionScope } from "@/features/fc-collection/hooks/useCollectionScope";
import { filterByCollectionScope } from "@/features/fc-collection/utils/collectionScope";
import { useMembers } from "@/hooks/useMembers";
import { DEFAULT_TAB, DEFAULT_ZONE_ID, ZONE_TABS } from "../zones";
import { buildScopedHistogram } from "../utils/parseBuckets";
import { mergeRaidStatsMembers } from "../utils/memberMerging";
import { useRaidStats } from "./useRaidStats";
import type { ContentType, MemberData, ZoneEncounter } from "../types";

const EMPTY_ENCOUNTERS: ZoneEncounter[] = [];

export function useRaidStatsPageState() {
  const [activeTab, setActiveTab] = useState<ContentType>(DEFAULT_TAB);
  const [activeZoneId, setActiveZoneId] = useState(DEFAULT_ZONE_ID);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { scope, setScope, includeFriends } = useCollectionScope();

  const { data, loading } = useRaidStats(activeZoneId);
  const members = useMembers();

  const joinedMembers = useMemo(
    () => mergeRaidStatsMembers(data, members),
    [data, members],
  );

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

  return {
    activeTab,
    activeZoneId,
    contentType,
    currentTab,
    data,
    encounters,
    handleTabChange,
    hasVisibleParses,
    includeFriends,
    loading,
    memberCount,
    scopedActivity,
    scopedHistogram,
    scopedJoinedMembers,
    selectedMember,
    selectedMemberId,
    setActiveZoneId,
    setScope,
    setSelectedMemberId,
    scope,
  };
}
