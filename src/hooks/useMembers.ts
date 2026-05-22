import { useEffect, useState } from "react";
import { db, ref, get } from "@/lib/db";
import type { Member } from "@/types";

const CACHE_KEY = "fcc_members_v3";
const CACHE_TTL = 3 * 60 * 60 * 1000;

export function useMembers(): Record<string, Member> {
  const [members, setMembers] = useState<Record<string, Member>>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const { data, timestamp } = JSON.parse(raw) as { data: Record<string, Member>; timestamp: number };
      if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { timestamp } = JSON.parse(raw) as { timestamp: number };
        if (Date.now() - timestamp < CACHE_TTL) return;
      }
    } catch {}

    get(ref(db, "members")).then((snap: { val(): Record<string, Member> | null }) => {
      const data = snap.val() ?? {};
      setMembers(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    });
  }, []);

  return members;
}
