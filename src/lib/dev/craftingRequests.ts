import type {
  CraftingMaterialStatus,
  CraftingRequest,
  CraftingRequestDashboardData,
  CraftingRequestDashboardRecord,
  CraftingRequestMember,
  CraftingSelectedItem,
} from "@/features/craftingboard/types";
import {
  DEV_AUTH_LAYER_ENABLED,
  devStorageKey,
  getSelectedDevPersona,
  type DevPersona,
} from "./personas";

const CRAFTING_FEATURE = "craftingRequests";
const COMPLETED_DASHBOARD_MS = 30 * 24 * 60 * 60 * 1000;

type DevCraftingStore = {
  requests: Record<string, CraftingRequest>;
  completedTotal: number;
  memberTotals: Record<string, CraftingMemberTotals>;
};

export type CraftingMemberTotals = {
  fulfilledRequests: number;
  fulfilledItems: number;
  updatedAt: number | null;
};

type CreateCraftingData = {
  materialStatus?: CraftingMaterialStatus;
  materialNote?: string | null;
  items?: CraftingSelectedItem[];
  commission?: CraftingRequest["commission"];
};

const MATERIAL_NOTE_MAX_LENGTH = 100;

type LifecycleData = {
  requestId?: unknown;
};

function emptyStore(): DevCraftingStore {
  return {
    requests: {},
    completedTotal: 0,
    memberTotals: {},
  };
}

function readStore(): DevCraftingStore {
  if (typeof window === "undefined") return emptyStore();
  const raw = window.localStorage.getItem(devStorageKey(CRAFTING_FEATURE));
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<DevCraftingStore>;
    return {
      requests:
        parsed.requests && typeof parsed.requests === "object"
          ? (parsed.requests as Record<string, CraftingRequest>)
          : {},
      completedTotal: Math.max(0, Number(parsed.completedTotal ?? 0)),
      memberTotals:
        parsed.memberTotals && typeof parsed.memberTotals === "object"
          ? (parsed.memberTotals as Record<string, CraftingMemberTotals>)
          : {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: DevCraftingStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(devStorageKey(CRAFTING_FEATURE), JSON.stringify(store));
}

function assertAuthenticated(persona: DevPersona): void {
  if (!persona.authenticated) {
    throw new Error("Dev persona is not authenticated.");
  }
}

function memberFromPersona(persona: DevPersona): CraftingRequestMember {
  return {
    discordUserId: persona.discordUserId,
    lodestoneId: persona.lodestoneId,
    characterName: persona.characterName,
    fcRank: persona.fcRank,
    avatarUrl: null,
  };
}

function requestIdFromData(data: LifecycleData): string {
  const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
  if (!requestId) throw new Error("Request ID is required.");
  return requestId;
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

function visibleCompleted(
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

function activeRequest(
  store: DevCraftingStore,
  requestId: string,
): CraftingRequest {
  const request = store.requests[requestId];
  if (!request) throw new Error("Request was not found.");
  return request;
}

function writeRequest(store: DevCraftingStore, request: CraftingRequest) {
  writeStore({
    ...store,
    requests: {
      ...store.requests,
      [request.id]: request,
    },
  });
}

export function readDevCraftingRequestDashboard(): CraftingRequestDashboardData {
  const store = readStore();
  const records = Object.values(store.requests).map(dashboardRecordFromRequest);
  return {
    open: records.filter((record) => record.status === "open").sort(byUpdatedAtDesc),
    inProgress: records
      .filter((record) => record.status === "in_progress")
      .sort(byUpdatedAtDesc),
    completed: visibleCompleted(
      records.filter((record) => record.status === "completed"),
    ).sort(byCompletedAtDesc),
    stats: {
      completedTotal: store.completedTotal,
    },
  };
}

export function readDevCraftingRequest(requestId: string): CraftingRequest | null {
  if (!requestId.trim()) return null;
  return readStore().requests[requestId] ?? null;
}

export function readDevCraftingMemberTotals(
  lodestoneId: string,
): CraftingMemberTotals {
  return readStore().memberTotals[lodestoneId] ?? emptyMemberTotals();
}

export function createDevCraftingRequest(data: CreateCraftingData) {
  if (!DEV_AUTH_LAYER_ENABLED) throw new Error("Dev auth layer is not enabled.");
  const persona = getSelectedDevPersona();
  assertAuthenticated(persona);
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) throw new Error("Add at least one craftable item.");
  if (!data.materialStatus) throw new Error("Choose material status.");

  const now = Date.now();
  const requestId = `dev_crafting_${now}_${Math.random().toString(36).slice(2, 8)}`;
  const request: CraftingRequest = {
    id: requestId,
    status: "open",
    materialStatus: data.materialStatus,
    materialNote:
      data.materialStatus === "requester_has_some_materials"
        ? String(data.materialNote ?? "").trim().slice(0, MATERIAL_NOTE_MAX_LENGTH) || null
        : null,
    requester: memberFromPersona(persona),
    items,
    commission: data.commission ?? null,
    discordMessage: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  writeRequest(readStore(), request);
  return { ok: true as const, requestId };
}

export function acceptDevCraftingRequest(data: LifecycleData) {
  const persona = getSelectedDevPersona();
  assertAuthenticated(persona);
  const requestId = requestIdFromData(data);
  const store = readStore();
  const request = activeRequest(store, requestId);
  if (request.status !== "open" || request.acceptedBy) {
    throw new Error("Request is no longer open.");
  }
  const member = memberFromPersona(persona);
  if (sameCraftingMember(request.requester, member) && !isCraftingAdminPersona(persona)) {
    throw new Error("Requesters can close their own request instead.");
  }
  const now = Date.now();
  writeRequest(store, {
    ...request,
    status: "in_progress",
    acceptedBy: { ...member, acceptedAt: now },
    updatedAt: now,
  });
  return { ok: true as const, requestId };
}

export function completeDevCraftingRequest(data: LifecycleData) {
  const persona = getSelectedDevPersona();
  assertAuthenticated(persona);
  const requestId = requestIdFromData(data);
  const store = readStore();
  const request = activeRequest(store, requestId);
  if (request.status !== "in_progress") {
    throw new Error("Request cannot be completed.");
  }
  const member = memberFromPersona(persona);
  const isRequester = sameCraftingMember(request.requester, member);
  const isAcceptedCrafter = sameCraftingMember(request.acceptedBy, member);
  if (!isRequester && !isAcceptedCrafter && !isCraftingAdminPersona(persona)) {
    throw new Error("Only the requester, accepted crafter, or admin can complete this request.");
  }
  const now = Date.now();
  const totals = nextMemberTotals(
    store.memberTotals[member.lodestoneId] ?? emptyMemberTotals(),
    request.items.length,
    now,
  );
  writeStore({
    ...store,
    completedTotal: store.completedTotal + 1,
    memberTotals: {
      ...store.memberTotals,
      [member.lodestoneId]: totals,
    },
    requests: {
      ...store.requests,
      [requestId]: {
        ...request,
        status: "completed",
        completedAt: now,
        completedBy: { ...member, completedAt: now },
        updatedAt: now,
      },
    },
  });
  return { ok: true as const, requestId };
}

export function closeDevCraftingRequest(data: LifecycleData) {
  const persona = getSelectedDevPersona();
  assertAuthenticated(persona);
  const requestId = requestIdFromData(data);
  const store = readStore();
  const request = activeRequest(store, requestId);
  if (request.status !== "open") {
    throw new Error("Request cannot be closed.");
  }
  const member = memberFromPersona(persona);
  if (
    !sameCraftingMember(request.requester, member) &&
    !isCraftingAdminPersona(persona)
  ) {
    throw new Error("Only the requester or admin can close this request.");
  }
  const now = Date.now();
  const totals = nextMemberTotals(
    store.memberTotals[member.lodestoneId] ?? emptyMemberTotals(),
    request.items.length,
    now,
  );
  writeStore({
    ...store,
    completedTotal: store.completedTotal + 1,
    memberTotals: {
      ...store.memberTotals,
      [member.lodestoneId]: totals,
    },
    requests: {
      ...store.requests,
      [requestId]: {
        ...request,
        status: "completed",
        completedAt: now,
        completedBy: { ...member, completedAt: now },
        updatedAt: now,
      },
    },
  });
  return { ok: true as const, requestId };
}

export function reopenDevCraftingRequest(data: LifecycleData) {
  const persona = getSelectedDevPersona();
  assertAuthenticated(persona);
  const requestId = requestIdFromData(data);
  const store = readStore();
  const request = activeRequest(store, requestId);
  if (request.status !== "in_progress") {
    throw new Error("Request cannot be moved back to open.");
  }
  const member = memberFromPersona(persona);
  if (
    !sameCraftingMember(request.requester, member) &&
    !isCraftingAdminPersona(persona)
  ) {
    throw new Error("Only the requester or admin can move this request back to open.");
  }
  const now = Date.now();
  writeRequest(store, {
    ...request,
    status: "open",
    acceptedBy: null,
    updatedAt: now,
  });
  return { ok: true as const, requestId };
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

function emptyMemberTotals(): CraftingMemberTotals {
  return {
    fulfilledRequests: 0,
    fulfilledItems: 0,
    updatedAt: null,
  };
}

function nextMemberTotals(
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

function sameStringId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function isCraftingAdminPersona(persona: { isAdmin: boolean; fcRank: string | null }): boolean {
  const rank = String(persona.fcRank ?? "").trim().toLowerCase();
  return persona.isAdmin || rank === "boss" || rank === "underpaw";
}
