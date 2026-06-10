import { db, get, ref } from "@/lib/db";
import type { MemberProfileMap } from "../types";

export async function readMemberProfiles(): Promise<MemberProfileMap> {
  const snap = await get(ref(db, "memberProfiles"));
  return (snap.val() ?? {}) as MemberProfileMap;
}
