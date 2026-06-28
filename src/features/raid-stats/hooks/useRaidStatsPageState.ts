import { useMemo, useState } from "react";
import { useCollectionScope } from "@/features/fc-collection/hooks/useCollectionScope";
import { filterByCollectionScope } from "@/features/fc-collection/utils/collectionScope";
import { useMembers } from "@/hooks/useMembers";
import { ZONE_TABS } from "../zones";
import { mergeRaidStatsMembers } from "../utils/memberMerging";
import { useRaidStats } from "./useRaidStats";
import type { ContentType, MemberData, ZoneEncounter } from "../types";

const EMPTY_ENCOUNTERS: ZoneEncounter[] = [];

export function useRaidStatsPageState() {
  const [activeTab, setActiveTab] = useState<ContentType | null>(null);
  const [activeZoneId, setActiveZoneIdState] = useState<number | null>(null);
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

  function handleCategorySelect(type: ContentType) {
    setActiveTab(type);
    const tab = ZONE_TABS.find((t) => t.type === type)!;
    setActiveZoneIdState(tab.zones[0].id);
    setSelectedMemberId(null);
  }

  function handleZoneChange(zoneId: number) {
    setActiveZoneIdState(zoneId);
    setSelectedMemberId(null);
  }

  function handleHomeClick() {
    setActiveTab(null);
    setActiveZoneIdState(null);
    setSelectedMemberId(null);
  }

  const currentTab = activeTab
    ? (ZONE_TABS.find((t) => t.type === activeTab) ?? null)
    : null;
  const encounters = data?.meta.encounters ?? EMPTY_ENCOUNTERS;
  const contentType = data?.meta.contentType ?? activeTab ?? "savage";
  const memberCount = Object.keys(scopedJoinedMembers).length;
  const selectedMember = selectedMemberId
    ? (scopedJoinedMembers[selectedMemberId] ?? null)
    : null;
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
    handleHomeClick,
    handleCategorySelect,
    hasVisibleParses,
    includeFriends,
    loading,
    memberCount,
    scopedActivity,
    scopedJoinedMembers,
    selectedMember,
    selectedMemberId,
    setActiveZoneId: handleZoneChange,
    setScope,
    setSelectedMemberId,
    scope,
  };
}
