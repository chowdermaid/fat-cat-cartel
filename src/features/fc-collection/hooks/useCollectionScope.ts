import { useState } from "react";

export type CollectionScope = "fc" | "all";

const STORAGE_KEY = "fcc_collection_scope_v1";

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

function readScope(): CollectionScope {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "all" ? "all" : "fc";
  } catch {
    return "fc";
  }
}

export function useCollectionScope() {
  const [scope, setScopeState] = useState<CollectionScope>(readScope);

  function setScope(next: CollectionScope) {
    setScopeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  }

  return {
    scope,
    setScope,
    includeFriends: scope === "all",
  };
}
