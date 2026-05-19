import { useEffect, useState } from "react";
import { db, ref, onValue } from "@/lib/db";
import type { Member } from "@/types";

export function useMembers(): Record<string, Member> {
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    return onValue(ref(db, "members"), (snap: { val(): Record<string, Member> | null }) => {
      setMembers(snap.val() ?? {});
    });
  }, []);

  return members;
}
