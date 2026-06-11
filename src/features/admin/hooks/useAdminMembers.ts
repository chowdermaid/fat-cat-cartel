import { useEffect, useState } from "react";
import { db, onValue, ref } from "@/lib/db";
import type { Member } from "@/types";
import type { AdminMember } from "../types";

export function useAdminMembers() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [collectionLastFetched, setCollectionLastFetched] = useState<number | null>(null);
  const [raidLastUpdated, setRaidLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    return onValue(ref(db, "members"), (snap: { val(): Record<string, Member> | null }) => {
      const val = snap.val() as Record<string, Member> | null;
      if (!val) {
        setMembers([]);
        return;
      }
      setMembers(
        Object.entries(val)
          .map(([id, m]) => ({ id, ...m }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "raidStats/lastUpdated"), (snap: { val(): number | null }) => {
      setRaidLastUpdated(snap.val() ?? null);
    });
  }, []);

  useEffect(() => {
    return onValue(
      ref(db, "fcCollection/collectibles/lastFetched"),
      (snap: { val(): number | null }) => {
        setCollectionLastFetched(snap.val() ?? null);
      },
    );
  }, []);

  return {
    members,
    collectionLastFetched,
    raidLastUpdated,
  };
}
