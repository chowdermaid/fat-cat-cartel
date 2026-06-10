import type { CollectionScope } from "../types";

export function isFriendRank(fcRank: string | null | undefined): boolean {
  return fcRank === "Friend";
}

export function filterByCollectionScope<T extends { fcRank?: string | null }>(
  members: T[],
  scope: CollectionScope,
): T[] {
  if (scope === "all") return members;
  return members.filter((member) => !isFriendRank(member.fcRank));
}
