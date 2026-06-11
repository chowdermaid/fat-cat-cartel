import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import { db, get, push, ref, update } from "@/lib/db";
import {
  readDevCraftingRequest,
  readDevCraftingRequestDashboard,
} from "@/lib/dev/craftingRequests";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
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

export type CraftingMemberTotals = {
  fulfilledRequests: number;
  fulfilledItems: number;
  updatedAt: number | null;
};

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

export type CreateCraftingRequestInput = {
  sessionToken: string | null;
  requester: CraftingRequestMember | null;
  materialStatus: CraftingMaterialStatus;
  materialNote?: string | null;
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

export const EMPTY_DASHBOARD_DATA: CraftingRequestDashboardData = {
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
  if (DEV_AUTH_LAYER_ENABLED) {
    return readDevCraftingRequestDashboard();
  }

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

  if (DEV_AUTH_LAYER_ENABLED) {
    return readDevCraftingRequest(safeRequestId);
  }

  const snap = (await get(
    ref(db, `${CRAFTING_REQUEST_PATHS.requests}/${safeRequestId}`),
  )) as DbSnapshot<CraftingRequest>;
  return snap.val();
}

export async function createCraftingRequest({
  sessionToken,
  requester,
  materialStatus,
  materialNote,
  items,
  commission,
}: CreateCraftingRequestInput): Promise<{ ok: true; requestId: string }> {
  if (items.length === 0) throw new Error("Add at least one craftable item.");
  if (!materialStatus) throw new Error("Choose material status.");

  if (DEV_AUTH_LAYER_ENABLED) {
    if (!sessionToken) throw new Error("Member login is required.");
    return callAdminFunction<{ ok: true; requestId: string }>(
      "createCraftingRequest",
      sessionToken,
      { materialStatus, materialNote: materialNote ?? null, items, commission: commission ?? null },
    );
  }

  if (!firebaseApp) {
    if (!requester) throw new Error("Member login is required.");
    const now = Date.now();
    const pushed = await push(ref(db, CRAFTING_REQUEST_PATHS.requests));
    const requestId = pushed.key ?? `crafting_${now}`;
    const request: CraftingRequest = {
      id: requestId,
      status: "open",
      materialStatus,
      materialNote: materialNote ?? null,
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
    { materialStatus, materialNote: materialNote ?? null, items, commission: commission ?? null },
  );
}

export async function acceptCraftingRequest({
  sessionToken,
  member,
  isAdmin,
  requestId,
}: CraftingLifecycleInput): Promise<{ ok: true; requestId: string }> {
  if (!requestId) throw new Error("Request ID is required.");

  if (DEV_AUTH_LAYER_ENABLED) {
    if (!sessionToken) throw new Error("Member login is required.");
    return callAdminFunction<{ ok: true; requestId: string }>(
      "acceptCraftingRequest",
      sessionToken,
      { requestId },
    );
  }

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (!request || request.status !== "open" || request.acceptedBy) {
      if (request) {
        await update(ref(db, ""), {
          [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]:
            request.status === "open" ? dashboardRecordFromRequest(request) : null,
          ...(request.status === "in_progress"
            ? {
                [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]:
                  dashboardRecordFromRequest(request),
              }
            : {}),
          ...(request.status === "completed"
            ? {
                [`${CRAFTING_REQUEST_PATHS.completedRecentIndex}/${requestId}`]:
                  dashboardRecordFromRequest(request),
              }
            : {}),
          ...(request.status === "cancelled"
            ? {
                [`${CRAFTING_REQUEST_PATHS.cancelledIndex}/${requestId}`]:
                  dashboardRecordFromRequest(request),
              }
            : {}),
        });
      }
      throw new Error("Request is no longer open.");
    }
    const isRequester = sameCraftingMember(request.requester, member);
    if (isRequester && !isAdmin) {
      throw new Error("Requesters can close their own request instead.");
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

  if (DEV_AUTH_LAYER_ENABLED) {
    if (!sessionToken) throw new Error("Member login is required.");
    return callAdminFunction<{ ok: true; requestId: string }>(
      "completeCraftingRequest",
      sessionToken,
      { requestId },
    );
  }

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (
      !request ||
      request.status !== "in_progress"
    ) {
      throw new Error("Request cannot be completed.");
    }
    const isRequester = sameCraftingMember(request.requester, member);
    const isAcceptedCrafter =
      sameCraftingMember(request.acceptedBy, member);
    if (!isRequester && !isAcceptedCrafter && !isAdmin) {
      throw new Error("Only the requester, accepted crafter, or admin can complete this request.");
    }
    const now = Date.now();
    const nextRequest: CraftingRequest = {
      ...request,
      status: "completed",
      completedAt: now,
      completedBy: { ...member, completedAt: now },
      updatedAt: now,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: nextRequest,
      [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.completedRecentIndex}/${requestId}`]:
        dashboardRecordFromRequest(nextRequest),
    });
    const statsSnap = (await get(ref(db, CRAFTING_REQUEST_PATHS.stats))) as DbSnapshot<{
      completedTotal?: number;
      memberTotals?: Record<string, CraftingMemberTotals>;
    }>;
    const stats = statsSnap.val();
    const currentMemberTotals =
      stats?.memberTotals?.[member.lodestoneId] ?? emptyCraftingMemberTotals();
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.stats}/completedTotal`]:
        Math.max(0, Number(stats?.completedTotal ?? 0)) + 1,
      [`${CRAFTING_REQUEST_PATHS.stats}/memberTotals/${member.lodestoneId}`]:
        nextCraftingMemberTotals(currentMemberTotals, request.items.length, now),
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

export async function closeCraftingRequest({
  sessionToken,
  member,
  isAdmin,
  requestId,
}: CraftingLifecycleInput): Promise<{ ok: true; requestId: string }> {
  if (!requestId) throw new Error("Request ID is required.");

  if (DEV_AUTH_LAYER_ENABLED) {
    if (!sessionToken) throw new Error("Member login is required.");
    return callAdminFunction<{ ok: true; requestId: string }>(
      "closeCraftingRequest",
      sessionToken,
      { requestId },
    );
  }

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (
      !request ||
      request.status !== "open"
    ) {
      throw new Error("Request cannot be closed.");
    }
    if (
      !sameCraftingMember(request.requester, member) &&
      !isAdmin
    ) {
      throw new Error("Only the requester or admin can close this request.");
    }
    const now = Date.now();
    const nextRequest: CraftingRequest = {
      ...request,
      status: "completed",
      completedAt: now,
      completedBy: { ...member, completedAt: now },
      updatedAt: now,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: nextRequest,
      [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]: null,
      [`${CRAFTING_REQUEST_PATHS.completedRecentIndex}/${requestId}`]:
        dashboardRecordFromRequest(nextRequest),
    });
    const statsSnap = (await get(ref(db, CRAFTING_REQUEST_PATHS.stats))) as DbSnapshot<{
      completedTotal?: number;
      memberTotals?: Record<string, CraftingMemberTotals>;
    }>;
    const stats = statsSnap.val();
    const currentMemberTotals =
      stats?.memberTotals?.[member.lodestoneId] ?? emptyCraftingMemberTotals();
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.stats}/completedTotal`]:
        Math.max(0, Number(stats?.completedTotal ?? 0)) + 1,
      [`${CRAFTING_REQUEST_PATHS.stats}/memberTotals/${member.lodestoneId}`]:
        nextCraftingMemberTotals(currentMemberTotals, request.items.length, now),
    });
    return { ok: true, requestId };
  }

  if (!sessionToken) throw new Error("Member login is required.");
  return callAdminFunction<{ ok: true; requestId: string }>(
    "closeCraftingRequest",
    sessionToken,
    { requestId },
  );
}

export async function reopenCraftingRequest({
  sessionToken,
  member,
  isAdmin,
  requestId,
}: CraftingLifecycleInput): Promise<{ ok: true; requestId: string }> {
  if (!requestId) throw new Error("Request ID is required.");

  if (DEV_AUTH_LAYER_ENABLED) {
    if (!sessionToken) throw new Error("Member login is required.");
    return callAdminFunction<{ ok: true; requestId: string }>(
      "reopenCraftingRequest",
      sessionToken,
      { requestId },
    );
  }

  if (!firebaseApp) {
    if (!member) throw new Error("Member login is required.");
    const request = await readCraftingRequest(requestId);
    if (!request || request.status !== "in_progress") {
      throw new Error("Request cannot be moved back to open.");
    }
    if (
      !sameCraftingMember(request.requester, member) &&
      !isAdmin
    ) {
      throw new Error("Only the requester or admin can move this request back to open.");
    }
    const now = Date.now();
    const nextRequest: CraftingRequest = {
      ...request,
      status: "open",
      acceptedBy: null,
      updatedAt: now,
    };
    await update(ref(db, ""), {
      [`${CRAFTING_REQUEST_PATHS.requests}/${requestId}`]: nextRequest,
      [`${CRAFTING_REQUEST_PATHS.openIndex}/${requestId}`]:
        dashboardRecordFromRequest(nextRequest),
      [`${CRAFTING_REQUEST_PATHS.inProgressIndex}/${requestId}`]: null,
    });
    return { ok: true, requestId };
  }

  if (!sessionToken) throw new Error("Member login is required.");
  return callAdminFunction<{ ok: true; requestId: string }>(
    "reopenCraftingRequest",
    sessionToken,
    { requestId },
  );
}

function dashboardRecordFromRequest(
  request: CraftingRequest,
): CraftingRequestDashboardRecord {
  const items = Array.isArray(request.items) ? request.items : [];
  return {
    id: request.id,
    status: request.status,
    materialStatus: request.materialStatus,
    materialNote: request.materialNote ?? null,
    requester: request.requester,
    acceptedBy: request.acceptedBy ?? null,
    completedBy: request.completedBy ?? null,
    commission: request.commission ?? null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt ?? null,
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
    completedBy: record.completedBy ?? null,
    materialNote: record.materialNote ?? null,
    commission: record.commission ?? null,
    completedAt: record.completedAt ?? null,
    itemCount: typeof record.itemCount === "number" ? record.itemCount : items.length,
    itemNames: Array.isArray(record.itemNames)
      ? record.itemNames
      : items.map((item) => item.itemName),
    items,
  };
}

function emptyCraftingMemberTotals(): CraftingMemberTotals {
  return {
    fulfilledRequests: 0,
    fulfilledItems: 0,
    updatedAt: null,
  };
}

function nextCraftingMemberTotals(
  totals: CraftingMemberTotals,
  itemCount: number,
  now: number,
): CraftingMemberTotals {
  return {
    fulfilledRequests: Math.max(0, Number(totals.fulfilledRequests ?? 0)) + 1,
    fulfilledItems:
      Math.max(0, Number(totals.fulfilledItems ?? 0)) + Math.max(0, itemCount),
    updatedAt: now,
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

function sameCraftingMember(
  left:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
  right:
    | Pick<CraftingRequestMember, "lodestoneId" | "discordUserId">
    | null
    | undefined,
): boolean {
  return (
    sameStringId(left?.lodestoneId, right?.lodestoneId) ||
    sameStringId(left?.discordUserId, right?.discordUserId)
  );
}

function sameStringId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}
