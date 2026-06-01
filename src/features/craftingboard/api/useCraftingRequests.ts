import { useCallback, useEffect, useState } from "react";
import { callAdminFunction } from "@/features/admin/lib/adminFunctions";
import { db, get, push, ref, update } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import type {
  CraftingEligibleCrafter,
  CraftingRecipeSnapshot,
  CraftingMaterialStatus,
  CraftingRequest,
  CraftingRequestDashboardData,
  CraftingRequestDashboardItem,
  CraftingRequestDashboardRecord,
  CraftingRequestMember,
  CraftingSelectedItem,
} from "../types";

export const CRAFTING_REQUEST_PATHS = {
  requests: "craftingRequests",
  openIndex: "craftingRequestIndexes/open",
  inProgressIndex: "craftingRequestIndexes/inProgress",
  completedRecentIndex: "craftingRequestIndexes/completedRecent",
  cancelledIndex: "craftingRequestIndexes/cancelled",
  stats: "craftingRequestStats",
} as const;

const COMPLETED_DASHBOARD_DAYS = 30;
const COMPLETED_DASHBOARD_MS =
  COMPLETED_DASHBOARD_DAYS * 24 * 60 * 60 * 1000;

type DbSnapshot<T> = {
  val(): T | null;
};

type DashboardIndexValue = Record<
  string,
  CraftingRequestDashboardRecord | null
>;

export type CraftingRequestsState = {
  data: CraftingRequestDashboardData;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  reload: () => Promise<void>;
};

export type CreateCraftingRequestInput = {
  sessionToken: string | null;
  requester: CraftingRequestMember | null;
  materialStatus: CraftingMaterialStatus;
  items: CraftingSelectedItem[];
  commission?: {
    offered: boolean;
    gil: number | null;
  } | null;
};

export type CraftingLifecycleInput = {
  sessionToken: string | null;
  member: CraftingRequestMember | null;
  isAdmin?: boolean;
  requestId: string;
};

const EMPTY_DASHBOARD_DATA: CraftingRequestDashboardData = {
  open: [],
  inProgress: [],
  completed: [],
  stats: {
    completedTotal: 0,
  },
};

function byUpdatedAtDesc(
  a: CraftingRequestDashboardRecord,
  b: CraftingRequestDashboardRecord,
) {
  return b.updatedAt - a.updatedAt;
}

function byCompletedAtDesc(
  a: CraftingRequestDashboardRecord,
  b: CraftingRequestDashboardRecord,
) {
  return (b.completedAt ?? 0) - (a.completedAt ?? 0);
}

function recordsFromIndex(
  value: DashboardIndexValue | null,
): CraftingRequestDashboardRecord[] {
  return Object.values(value ?? {}).filter(
    (record): record is CraftingRequestDashboardRecord => Boolean(record),
  ).map(normalizeDashboardRecord);
}

function recentCompletedOnly(
  records: CraftingRequestDashboardRecord[],
  now = Date.now(),
) {
  const cutoff = now - COMPLETED_DASHBOARD_MS;
  return records.filter(
    (record) =>
      record.status === "completed" &&
      typeof record.completedAt === "number" &&
      record.completedAt >= cutoff,
  );
}

export async function readCraftingRequestDashboard(): Promise<CraftingRequestDashboardData> {
  const [openSnap, inProgressSnap, completedSnap, statsSnap] = await Promise.all([
    get(ref(db, CRAFTING_REQUEST_PATHS.openIndex)) as Promise<
      DbSnapshot<DashboardIndexValue>
    >,
    get(ref(db, CRAFTING_REQUEST_PATHS.inProgressIndex)) as Promise<
      DbSnapshot<DashboardIndexValue>
    >,
    get(ref(db, CRAFTING_REQUEST_PATHS.completedRecentIndex)) as Promise<
      DbSnapshot<DashboardIndexValue>
    >,
    get(ref(db, CRAFTING_REQUEST_PATHS.stats)) as Promise<
      DbSnapshot<{ completedTotal?: number }>
    >,
  ]);

  const completedRecords = recordsFromIndex(completedSnap.val());
  return {
    open: recordsFromIndex(openSnap.val()).sort(byUpdatedAtDesc),
    inProgress: recordsFromIndex(inProgressSnap.val()).sort(byUpdatedAtDesc),
    completed: recentCompletedOnly(completedRecords).sort(
      byCompletedAtDesc,
    ),
    stats: {
      completedTotal: Math.max(
        0,
        Number(statsSnap.val()?.completedTotal ?? 0),
      ),
    },
  };
}

export async function readCraftingRequest(
  requestId: string,
): Promise<CraftingRequest | null> {
  const safeRequestId = requestId.trim();
  if (!safeRequestId) return null;

  const snap = (await get(
    ref(db, `${CRAFTING_REQUEST_PATHS.requests}/${safeRequestId}`),
  )) as DbSnapshot<CraftingRequest>;
  return snap.val();
}

export async function createCraftingRequest({
  sessionToken,
  requester,
  materialStatus,
  items,
  commission,
}: CreateCraftingRequestInput): Promise<{ ok: true; requestId: string }> {
  if (items.length === 0) throw new Error("Add at least one craftable item.");
  if (!materialStatus) throw new Error("Choose material status.");

  if (!firebaseApp) {
    if (!requester) throw new Error("Member login is required.");
    const now = Date.now();
    const pushed = await push(ref(db, CRAFTING_REQUEST_PATHS.requests));
    const requestId = pushed.key ?? `crafting_${now}`;
    const request: CraftingRequest = {
      id: requestId,
      status: "open",
      materialStatus,
      requester,
      items,
      commission: commission ?? null,
      discordMessage: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: request,
      [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]:
        dashboardRecordFromRequest(request),
    });
    return { ok: true, requestId };
  }

  if (!sessionToken) throw new Error("Member login is required.");
  return callAdminFunction<{ ok: true; requestId: string }>(
    "createCraftingRequest",
    sessionToken,
    { materialStatus, items, commission: commission ?? null },
  );
}

export async function acceptCraftingRequest({
  sessionToken,
  member,
  requestId,
}: CraftingLifecycleInput): Promise<{ ok: true; requestId: string }> {
  if (!requestId) throw new Error("Request ID is required.");

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (!request || request.status !== "open" || request.acceptedBy) {
      await update(ref(db, ""), {
        [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]: null,
        ...(request?.status === "in_progress"
          ? {
              [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]:
                dashboardRecordFromRequest(request),
            }
          : {}),
        ...(request?.status === "completed"
          ? {
              [`${CRAFTING_REQUEST_PATHS.completedRecentIndex}/${requestId}`]:
                dashboardRecordFromRequest(request),
            }
          : {}),
        ...(request?.status === "cancelled"
          ? {
              [`${CRAFTING_REQUEST_PATHS.cancelledIndex}/${requestId}`]:
                dashboardRecordFromRequest(request),
            }
          : {}),
      });
      throw new Error("Request is no longer open.");
    }
    const now = Date.now();
    const nextRequest: CraftingRequest = {
      ...request,
      status: "in_progress",
      acceptedBy: { ...member, acceptedAt: now },
      updatedAt: now,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: nextRequest,
      [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]:
        dashboardRecordFromRequest(nextRequest),
    });
    return { ok: true, requestId };
  }

  if (!sessionToken) throw new Error("Member login is required.");
  return callAdminFunction<{ ok: true; requestId: string }>(
    "acceptCraftingRequest",
    sessionToken,
    { requestId },
  );
}

export async function completeCraftingRequest({
  sessionToken,
  member,
  isAdmin,
  requestId,
}: CraftingLifecycleInput): Promise<{ ok: true; requestId: string }> {
  if (!requestId) throw new Error("Request ID is required.");

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (!request || request.status !== "in_progress" || !request.acceptedBy) {
      throw new Error("Request is not in progress.");
    }
    if (request.acceptedBy.lodestoneId !== member.lodestoneId && !isAdmin) {
      throw new Error("Only the accepted crafter or admin can complete this request.");
    }
    const now = Date.now();
    const nextRequest: CraftingRequest = {
      ...request,
      status: "completed",
      completedAt: now,
      updatedAt: now,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: nextRequest,
      [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.completedRecentIndex}/${requestId}`]:
        dashboardRecordFromRequest(nextRequest),
    });
    const statsSnap = (await get(
      ref(db, `${CRAFTING_REQUEST_PATHS.stats}/completedTotal`),
    )) as DbSnapshot<number>;
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.stats}/completedTotal`]:
        Math.max(0, Number(statsSnap.val() ?? 0)) + 1,
    });
    return { ok: true, requestId };
  }

  if (!sessionToken) throw new Error("Member login is required.");
  return callAdminFunction<{ ok: true; requestId: string }>(
    "completeCraftingRequest",
    sessionToken,
    { requestId },
  );
}

export function useCraftingRequests(): CraftingRequestsState {
  const [data, setData] =
    useState<CraftingRequestDashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await readCraftingRequestDashboard());
    } catch {
      setError("Crafting requests could not be loaded.");
      setData(EMPTY_DASHBOARD_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
    isEmpty:
      !loading &&
      !error &&
      data.open.length === 0 &&
      data.inProgress.length === 0 &&
      data.completed.length === 0,
  };
}

function dashboardRecordFromRequest(
  request: CraftingRequest,
): CraftingRequestDashboardRecord {
  const items = Array.isArray(request.items) ? request.items : [];
  return {
    id: request.id,
    status: request.status,
    materialStatus: request.materialStatus,
    requester: request.requester,
    acceptedBy: request.acceptedBy ?? null,
    commission: request.commission ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt,
    itemCount: items.length,
    itemNames: items.map((item) => item.itemName),
    items,
  };
}

function normalizeDashboardRecord(
  record: CraftingRequestDashboardRecord,
): CraftingRequestDashboardRecord {
  const items = Array.isArray(record.items)
    ? record.items.map(normalizeDashboardItem)
    : [];
  return {
    ...record,
    acceptedBy: record.acceptedBy ?? null,
    commission: record.commission ?? null,
    completedAt: record.completedAt ?? null,
    itemCount: typeof record.itemCount === "number" ? record.itemCount : items.length,
    itemNames: Array.isArray(record.itemNames)
      ? record.itemNames
      : items.map((item) => item.itemName),
    items,
  };
}

function normalizeDashboardItem(
  item: CraftingRequestDashboardItem,
): CraftingRequestDashboardItem {
  const snapshot = item.recipeSnapshot ?? ({} as CraftingRecipeSnapshot);
  return {
    ...item,
    recipeSnapshot: {
      ...snapshot,
      recipeId: snapshot.recipeId ?? item.selectedRecipeId,
      crafter: snapshot.crafter ?? "Crafter",
      recipeLevel: snapshot.recipeLevel ?? null,
      amountResult: snapshot.amountResult ?? 1,
      ingredients: safeArray(snapshot.ingredients),
      crystals: safeArray(snapshot.crystals),
      clusters: safeArray(snapshot.clusters),
      precrafts: safeArray(snapshot.precrafts),
      eligibleCrafters: safeArray<CraftingEligibleCrafter>(
        snapshot.eligibleCrafters,
      ),
    },
  };
}

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}
