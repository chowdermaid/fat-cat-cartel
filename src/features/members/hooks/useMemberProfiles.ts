import { useEffect, useState } from "react";
import { readMemberProfiles } from "../api/memberProfiles";
import type { MemberProfileMap } from "../types";

export function useMemberProfiles() {
  const [profiles, setProfiles] = useState<MemberProfileMap>({});

  useEffect(() => {
    let cancelled = false;

    readMemberProfiles()
      .then((nextProfiles) => {
        if (!cancelled) setProfiles(nextProfiles);
      })
      .catch(() => {
        if (!cancelled) setProfiles({});
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return profiles;
}
