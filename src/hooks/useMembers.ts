import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { Member } from "@/types";

const CACHE_KEY = "fcc_members_v3";
const CACHE_TTL = 3 * 60 * 60 * 1000;

type MembersCache = {
  data: Record<string, Member>;
  timestamp: number;
  lastUpdated?: number | null;
};

export function useMembers(): Record<string, Member> {
  const [members, setMembers] = useState<Record<string, Member>>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const { data, timestamp } = JSON.parse(raw) as MembersCache;
      if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch {}
    return {};
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      let cached: MembersCache | null = null;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        cached = raw ? (JSON.parse(raw) as MembersCache) : null;
      } catch {}

      const lastUpdatedSnap = await get(ref(db, "membersLastUpdated"));
      const lastUpdated = lastUpdatedSnap.val() as number | null;
      const cacheFresh = cached ? Date.now() - cached.timestamp < CACHE_TTL : false;
      const cacheMatchesServer = lastUpdated == null || cached?.lastUpdated === lastUpdated;

      if (cached && cacheFresh && cacheMatchesServer) return;

      const snap = await get(ref(db, "members"));
      if (cancelled) return;
      const data = snap.val() ?? {};
      setMembers(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now(), lastUpdated }));
    }

    loadMembers().catch(() => {
      if (!cancelled) setMembers((current) => current);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return members;
}
