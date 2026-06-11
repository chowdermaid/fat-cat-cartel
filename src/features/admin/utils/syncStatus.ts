import { FRESHNESS_MS, SOURCE_LABEL } from "../constants";
import type {
  SourceSyncStatus,
  SyncMetadata,
  SyncSource,
  SyncState,
} from "../types";
import { formatTimeAgo } from "./formatting";
import type { ParseEntry } from "@/features/raid-stats/types";

export function statusVariant(status: SyncState): "default" | "secondary" | "outline" | "destructive" {
  if (status === "current") return "default";
  if (status === "failed") return "destructive";
  if (status === "stale" || status === "unknown-age") return "secondary";
  return "outline";
}

export function statusText(status: SyncState): string {
  if (status === "current") return "Current";
  if (status === "stale") return "Stale";
  if (status === "no-id") return "No ID";
  if (status === "no-data") return "No data";
  if (status === "no-activity") return "No activity";
  if (status === "failed") return "Failed";
  if (status === "unknown-age") return "Unknown age";
  return "Missing";
}

export function buildStatus(
  source: SyncSource,
  hasData: boolean,
  missingState: SyncState,
  missingDetail: string,
  metadata?: SyncMetadata,
  dataDetail?: string,
  fallbackLastSuccessAt?: number | null,
): SourceSyncStatus {
  const label = SOURCE_LABEL[source];
  if (metadata?.status === "error") {
    return {
      source,
      state: "failed",
      label,
      detail: metadata.message ?? `${label} refresh failed.`,
      actionable: true,
    };
  }
  if (!hasData) {
    return {
      source,
      state: missingState,
      label,
      detail: missingDetail,
      actionable: true,
    };
  }
  const lastSuccessAt = metadata?.lastSuccessAt ?? fallbackLastSuccessAt ?? null;
  if (!lastSuccessAt) {
    return {
      source,
      state: "unknown-age",
      label,
      detail: dataDetail ?? `${label} data exists, but no sync timestamp has been recorded.`,
      actionable: true,
    };
  }

  const age = Date.now() - lastSuccessAt;
  const detail = `${dataDetail ?? `${label} data exists`}. Last synced ${formatTimeAgo(lastSuccessAt)}.`;
  if (age > FRESHNESS_MS[source]) {
    return {
      source,
      state: "stale",
      label,
      detail,
      actionable: true,
    };
  }
  return {
    source,
    state: "current",
    label,
    detail,
    actionable: false,
  };
}

export function hasParseData(parse: ParseEntry | null | undefined): boolean {
  return Object.keys(parse?.savage ?? {}).length > 0
    || Object.keys(parse?.normal ?? {}).length > 0
    || parse?.allStars != null;
}
