import type { Member } from "@/types";
import { RANK_SORT_ORDER } from "../constants";
import type { MemberEntry } from "../types";

export function rankSortValue(rank: string | null) {
  return rank ? (RANK_SORT_ORDER.get(rank) ?? 4) : 4;
}

export function sortMemberEntries(entries: MemberEntry[]) {
  return entries.sort(([, a], [, b]) => compareMembers(a, b));
}

function compareMembers(a: Member, b: Member) {
  const rankDiff = rankSortValue(a.fcRank) - rankSortValue(b.fcRank);
  if (rankDiff !== 0) return rankDiff;
  return a.name.localeCompare(b.name);
}
