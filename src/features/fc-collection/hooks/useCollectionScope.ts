import { useState } from "react";
import { COLLECTION_SCOPE_STORAGE_KEY } from "../constants";
import type { CollectionScope } from "../types";

export type { CollectionScope } from "../types";

function readScope(): CollectionScope {
  try {
    const raw = localStorage.getItem(COLLECTION_SCOPE_STORAGE_KEY);
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
      localStorage.setItem(COLLECTION_SCOPE_STORAGE_KEY, next);
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
