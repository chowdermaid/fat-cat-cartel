import { useEffect, useState } from "react";
import {
  searchMeowketItems,
} from "../api/meowketFunctions";
import type { MeowketItemSearchResult } from "../types";

export function useMeowketSearch(sessionToken: string | null | undefined) {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MeowketItemSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const trimmedQuery = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!searchDialogOpen || trimmedQuery.length < 2) {
        setResults([]);
        setSearchLoading(false);
        setSearchError("");
        return;
      }

      setSearchLoading(true);
      setSearchError("");
      searchMeowketItems(sessionToken ?? null, trimmedQuery)
        .then((items) => {
          if (!cancelled) setResults(items);
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setResults([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Meowket item search failed.",
          );
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sessionToken, query, searchDialogOpen]);

  return {
    query,
    results,
    searchDialogOpen,
    searchError,
    searchLoading,
    setQuery,
    setSearchDialogOpen,
  };
}
