import { useEffect, useState } from "react";
import { db, get, ref } from "@/lib/db";
import type { MemberCacheData } from "@/features/fc-collection/types";
import type { ParseEntry, TomestoneActivity } from "@/features/raid-stats/types";
import type {
  AdminMember,
  MemberSyncStatus,
  SyncMetadata,
  SyncSource,
} from "../types";
import { buildStatus, hasParseData } from "../utils/syncStatus";
import { formatTimeAgo } from "../utils/formatting";

async function readValue<T>(path: string, fallback: T): Promise<T> {
  try {
    const snap = await get(ref(db, path));
    return (snap.val() ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function useAdminMemberSyncStatuses(
  members: AdminMember[],
  reloadToken: number,
) {
  const [syncStatuses, setSyncStatuses] = useState<Record<string, MemberSyncStatus>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSyncStatuses() {
      const [
        collectionData,
        activityData,
        parseData,
        sourceStatusData,
      ] = await Promise.all([
        readValue<Record<string, MemberCacheData>>("fcCollection/memberData", {}),
        readValue<Record<string, { tomestone?: { recent?: TomestoneActivity[] | Record<string, TomestoneActivity> } }>>("memberActivity", {}),
        readValue<Record<string, ParseEntry>>("raidStats/zones/73/parses", {}),
        readValue<Record<string, Partial<Record<SyncSource, SyncMetadata>>>>("memberSyncStatus", {}),
      ]);

      if (cancelled) return;

      const next: Record<string, MemberSyncStatus> = {};

      for (const member of members) {
        const collection = collectionData[member.id];
        const tomestoneRecent = activityData[member.id]?.tomestone?.recent;
        const tomestoneCount = Array.isArray(tomestoneRecent)
          ? tomestoneRecent.length
          : Object.keys(tomestoneRecent ?? {}).length;
        const parse = parseData[member.id];
        const collectionCount = collection
          ? Object.values(collection.owned ?? {}).reduce((total, owned) => total + owned.length, 0)
          : 0;
        const hasTomestoneProfile = member.tomestoneProfile != null;
        const hasLodestoneData = Boolean(member.avatarUrl || (member.jobLevels && Object.keys(member.jobLevels).length > 0));
        const sourceStatus = sourceStatusData[member.id] ?? {};

        next[member.id] = {
          collection: buildStatus(
            "collection",
            Boolean(collection),
            "missing",
            "No collection member data.",
            sourceStatus.collection,
            collection
              ? `${collectionCount} tracked collectibles, member data fetched ${formatTimeAgo(collection.lastFetched)}`
              : undefined,
            sourceStatus.collection?.lastSuccessAt ? null : collection?.lastFetched,
          ),
          tomestone: buildStatus(
            "tomestone",
            hasTomestoneProfile && tomestoneCount > 0,
            hasTomestoneProfile ? "no-activity" : "missing",
            hasTomestoneProfile
              ? "Tomestone profile exists, but no recent activity rows are stored."
              : "No Tomestone profile is stored.",
            sourceStatus.tomestone,
            hasTomestoneProfile
              ? `${tomestoneCount} recent activity rows`
              : undefined,
          ),
          fflogs: buildStatus(
            "fflogs",
            hasParseData(parse),
            member.fflogsId ? "no-data" : "no-id",
            member.fflogsId
              ? `Linked FFLogs ID ${member.fflogsId}, but no default-zone parses are stored.`
              : "No FFLogs ID has been resolved for this character.",
            sourceStatus.fflogs,
            hasParseData(parse)
              ? "Parse data found in the current default zone"
              : undefined,
          ),
          lodestone: buildStatus(
            "lodestone",
            hasLodestoneData,
            "missing",
            "No Lodestone portrait or job levels are stored.",
            sourceStatus.lodestone,
            hasLodestoneData
              ? member.jobLevelsLastFetched
                ? `Job levels fetched ${formatTimeAgo(member.jobLevelsLastFetched)}`
                : "Portrait loaded"
              : undefined,
            sourceStatus.lodestone?.lastSuccessAt ? null : member.jobLevelsLastFetched,
          ),
        };
      }

      setSyncStatuses(next);
    }

    if (members.length === 0) {
      setSyncStatuses({});
      return;
    }

    loadSyncStatuses().catch(() => {
      if (!cancelled) setSyncStatuses({});
    });

    return () => {
      cancelled = true;
    };
  }, [members, reloadToken]);

  return syncStatuses;
}
