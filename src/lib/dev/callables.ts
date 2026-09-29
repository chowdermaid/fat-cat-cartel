import type { GameServerId } from "@/features/gameserver/types";
import type { GameServerFixture } from "@/features/gameserver/api/gameServerFixtures";
import { createGameServerMockState, parseMockCatalogServerIds, parseMockServerId } from "@/features/gameserver/api/gameServerMockState";
import { devGameServerAccessStatus, devGameServerCapabilities, readGameServerAccessStore, upsertLocalGameServerAccess, deleteLocalGameServerAccess } from "./gameServerAccess";
import {
  acceptDevCraftingRequest,
  closeDevCraftingRequest,
  completeDevCraftingRequest,
  createDevCraftingRequest,
  reopenDevCraftingRequest,
} from "./craftingRequests";
import {
  DEV_AUTH_LAYER_ENABLED,
  DEV_PERSONAS,
  devPersonaHasCapability,
  devStorageKey,
  getSelectedDevPersona,
  type DevPersona,
} from "./personas";

type DevCallableHandler = (
  data: Record<string, unknown>,
  sessionToken: string,
) => unknown | Promise<unknown>;

type CalendarRequestCreator = {
  discordUserId: string;
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
};

type CalendarRequest = {
  id: string;
  title: string;
  description: string | null;
  startAt: number;
  roleIds: string[];
  submittedAt: number;
  creator: CalendarRequestCreator;
};

type CalendarStore = {
  requests: CalendarRequest[];
  events: Record<string, unknown>;
};

const handlers = new Map<string, DevCallableHandler>();
const CALENDAR_FEATURE = "calendar";

function assertDevLayer(): void {
  if (!DEV_AUTH_LAYER_ENABLED) {
    throw new Error("Dev auth layer is not enabled.");
  }
}

function assertAuthenticated(persona: DevPersona): void {
  if (!persona.authenticated) {
    throw new Error("Dev persona is not authenticated.");
  }
}

function assertCapability(persona: DevPersona, capability: Parameters<typeof devPersonaHasCapability>[1]): void {
  assertAuthenticated(persona);
  if (!devPersonaHasCapability(persona, capability)) {
    throw new Error(`Dev persona does not have ${capability}.`);
  }
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mockMeowketSearch(query: string) {
  const items = [
    {
      itemId: 44090,
      name: "Claro Walnut Lumber",
      levelItem: 710,
      recipeId: 35001,
    },
    {
      itemId: 44112,
      name: "Rroneek Serge",
      levelItem: 710,
      recipeId: 35002,
    },
    {
      itemId: 44125,
      name: "Black Star",
      levelItem: 710,
      recipeId: 35003,
    },
  ];
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
}

function mockMeowketCalculation(data: Record<string, unknown>) {
  const itemId = Number(data.itemId);
  const quantity = Math.max(1, Math.floor(Number(data.quantity) || 1));
  if (itemId !== 44090) {
    throw new Error("Local mock recipe is unavailable for this item.");
  }
  return {
    item: {
      itemId: 44090,
      recipeId: 35001,
      name: "Claro Walnut Lumber",
      requestedQuantity: quantity,
      crafterJob: "Carpenter",
      recipeLevel: 99,
      yieldPerCraft: 1,
      craftsRequired: quantity,
    },
    finalItemPrices: [],
    materials: [
      {
        itemId: 43985,
        name: "Claro Walnut Log",
        quantityPerCraft: 5,
        totalQuantity: 5 * quantity,
        category: "ingredient",
        worldPrices: [],
      },
      {
        itemId: 8,
        name: "Wind Crystal",
        quantityPerCraft: 8,
        totalQuantity: 8 * quantity,
        category: "crystal",
        worldPrices: [],
      },
    ],
    cheapestShoppingList: [],
    estimatedMaterialCost: null,
    sellEstimate: {
      world: "Sophia",
      unitPrice: null,
      totalRevenue: null,
      source: "unavailable",
    },
    estimatedGrossProfit: null,
    warnings: ["Local mock result. Market prices land in Phase 4."],
  };
}

function parseEventPayload(data: Record<string, unknown>): {
  title: string;
  description: string | null;
  startAt: number;
  roleIds: string[];
} {
  const title = cleanText(data.title).slice(0, 120);
  const description = cleanText(data.description).slice(0, 1200) || null;
  const startAt = typeof data.startAt === "number" ? data.startAt : Number(data.startAt);
  const roleIds = Array.isArray(data.roleIds)
    ? data.roleIds.filter((roleId): roleId is string => typeof roleId === "string")
    : [];

  if (!title) throw new Error("Event title is required.");
  if (!Number.isFinite(startAt)) throw new Error("Event start time is required.");

  return { title, description, startAt: Math.floor(startAt), roleIds };
}

function readCalendarStore(): CalendarStore {
  if (typeof window === "undefined") return { requests: [], events: {} };
  const raw = window.localStorage.getItem(devStorageKey(CALENDAR_FEATURE));
  if (!raw) return { requests: [], events: {} };
  try {
    const parsed = JSON.parse(raw) as Partial<CalendarStore>;
    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      events:
        parsed.events && typeof parsed.events === "object"
          ? parsed.events as Record<string, unknown>
          : {},
    };
  } catch {
    return { requests: [], events: {} };
  }
}

function writeCalendarStore(store: CalendarStore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(devStorageKey(CALENDAR_FEATURE), JSON.stringify(store));
}

function mockEventId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makePlannerEventId(id: string): string {
  return `devPlanner_${id}`;
}

function makePlannerEvent(
  id: string,
  payload: ReturnType<typeof parseEventPayload>,
  leader: CalendarRequestCreator,
) {
  const now = Date.now();
  return {
    title: payload.title,
    description: payload.description,
    startAt: payload.startAt,
    endAt: null,
    location: "Local Dev",
    source: "raidHelper",
    sourceUrl: null,
    plannerMessageId: id,
    raidHelperEventId: id,
    leaderId: leader.discordUserId,
    leaderName: leader.characterName,
    templateId: "local-dev",
    rawDate: null,
    rawTime: null,
    lastSyncedAt: now,
    updatedAt: now,
    status: "scheduled",
  };
}

function creatorFromPersona(persona: DevPersona): CalendarRequestCreator {
  return {
    discordUserId: persona.discordUserId,
    lodestoneId: persona.lodestoneId,
    characterName: persona.characterName,
    fcRank: persona.fcRank,
    avatarUrl: null,
  };
}

function parseDevDiscordId(value: unknown): string {
  const discordUserId = cleanText(value);
  if (!/^\d{16,24}$/.test(discordUserId) && !/^dev-[a-z-]+$/.test(discordUserId)) {
    throw new Error("A valid Discord user ID is required.");
  }
  return discordUserId;
}

function parseDevDisplayName(value: unknown): string {
  const displayName = cleanText(value).slice(0, 80);
  if (!displayName) throw new Error("Display name is required.");
  return displayName;
}

const gameServers = createGameServerMockState("persona", {
  read: (feature) => typeof window === "undefined" ? null : window.localStorage.getItem(devStorageKey(feature)),
  write: (feature, value) => { if (typeof window !== "undefined") window.localStorage.setItem(devStorageKey(feature), value); },
});

function assertGameServerAccess(persona: DevPersona, serverId: GameServerId): void {
  assertAuthenticated(persona);
  if (!devGameServerAccessStatus(persona, serverId).canUseGameServers) throw new Error("Game server whitelist required.");
}

function registerDefaultHandlers(): void {
  if (handlers.size > 0) return;

  handlers.set("listGameServerAccess", (data) => {
    const serverId = parseMockServerId(data, true);
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return {
      ok: true,
      entries: Object.values(readGameServerAccessStore(serverId)).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    };
  });

  handlers.set("listGameServerAccessCandidates", (data) => {
    const serverId = parseMockServerId(data, true);
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    const store = readGameServerAccessStore(serverId);
    const linkedDiscordIds = new Set<string>();
    const candidates = DEV_PERSONAS
      .filter((candidate) => candidate.authenticated)
      .map((candidate) => {
        linkedDiscordIds.add(candidate.discordUserId);
        return {
          lodestoneId: candidate.lodestoneId,
          discordUserId: candidate.discordUserId,
          displayName:
            store[candidate.discordUserId]?.displayName ||
            candidate.characterName,
          characterName: candidate.characterName,
          fcRank: candidate.fcRank,
          avatarUrl: null,
          accessEntry: store[candidate.discordUserId] ?? null,
          implicitAccess:
            candidate.fcRank === "Boss" || candidate.fcRank === "Underpaw",
        };
      })
      .sort((a, b) => a.characterName.localeCompare(b.characterName));
    return {
      ok: true,
      candidates,
      legacyEntries: Object.values(store)
        .filter((entry) => !linkedDiscordIds.has(entry.discordUserId))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    };
  });

  handlers.set("upsertGameServerAccess", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return upsertLocalGameServerAccess({
      discordUserId: parseDevDiscordId(data.discordUserId), displayName: parseDevDisplayName(data.displayName),
      enabled: data.enabled === undefined ? true : data.enabled === true,
      expiresAt: data.expiresAt as number | null, notes: cleanText(data.notes) || null,
    }, persona.discordUserId, parseMockServerId(data, true));
  });

  handlers.set("deleteGameServerAccess", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return deleteLocalGameServerAccess(parseDevDiscordId(data.discordUserId), parseMockServerId(data, true));
  });

  handlers.set("listGameServerAuditLog", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return gameServers.events(parseMockServerId(data, true), 25);
  });
  handlers.set("listGameServerEvents", (data) => {
    assertGameServerAccess(getSelectedDevPersona(), parseMockServerId(data, true));
    return gameServers.events(parseMockServerId(data, true), 5);
  });
  handlers.set("getGameServerSettings", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return { ok: true, settings: gameServers.settings(parseMockServerId(data, true)) };
  });
  handlers.set("updateGameServerSettings", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return gameServers.updateSettings(parseMockServerId(data), data.enabled === true,
      cleanText(data.disabledMessage) || null, persona);
  });
  handlers.set("getGameServers", (data) => {
    const serverIds = parseMockCatalogServerIds(data);
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    const access = devGameServerCapabilities(persona);
    const allowedIds = serverIds.filter((id) => access.gameServerAccessById[id]);
    if (!allowedIds.length) throw new Error("Game server whitelist required.");
    return gameServers.catalog(allowedIds);
  });
  handlers.set("getGameServerAccessStatus", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    return devGameServerAccessStatus(persona, parseMockServerId(data, true));
  });
  handlers.set("getGameServerStatus", (data) => {
    assertGameServerAccess(getSelectedDevPersona(), parseMockServerId(data, true));
    return gameServers.status(parseMockServerId(data));
  });
  handlers.set("getGameServerTelemetry", (data) => {
    assertGameServerAccess(getSelectedDevPersona(), parseMockServerId(data, true));
    return gameServers.telemetry(parseMockServerId(data));
  });
  for (const action of ["start", "stop"] as const) {
    handlers.set(action === "start" ? "startGameServer" : "stopGameServer", (data) => {
      const persona = getSelectedDevPersona();
      assertGameServerAccess(persona, parseMockServerId(data));
      return gameServers.action(parseMockServerId(data), action, persona);
    });
  }

  handlers.set("getAdminSession", () => {
    const persona = getSelectedDevPersona();
    if (!persona.authenticated) {
      throw new Error("Dev persona is not authenticated.");
    }
    return {
      ok: true,
      discordUserId: persona.discordUserId,
      lodestoneId: persona.lodestoneId,
      characterName: persona.characterName,
      fcRank: persona.fcRank,
      avatarUrl: null,
      roleIds: persona.roleIds,
      isAdmin: persona.isAdmin,
      isHousecat: persona.isHousecat,
      ...devGameServerCapabilities(persona),
      capabilities: persona.capabilities,
      expiresAt: Number.MAX_SAFE_INTEGER,
    };
  });

  handlers.set("searchMeowketItems", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "admin:*");
    const query = cleanText(data.query);
    if (query.length < 2) return [];
    return mockMeowketSearch(query);
  });

  handlers.set("calculateMeowketProfit", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "admin:*");
    return mockMeowketCalculation(data);
  });

  handlers.set("createRaidHelperEvent", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "calendar:event:create");
    const payload = parseEventPayload(data);
    const id = mockEventId("direct");
    const eventId = makePlannerEventId(id);
    const event = makePlannerEvent(id, payload, creatorFromPersona(persona));
    const store = readCalendarStore();
    writeCalendarStore({
      ...store,
      events: { ...store.events, [eventId]: event },
    });
    return { ok: true, eventId, event, roleIds: payload.roleIds };
  });

  handlers.set("submitCalendarEventRequest", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "calendar:eventRequest:create");
    const payload = parseEventPayload(data);
    const request: CalendarRequest = {
      id: mockEventId("request"),
      title: payload.title,
      description: payload.description,
      startAt: payload.startAt,
      roleIds: payload.roleIds,
      submittedAt: Date.now(),
      creator: creatorFromPersona(persona),
    };
    const store = readCalendarStore();
    writeCalendarStore({ ...store, requests: [...store.requests, request] });
    return { ok: true, request };
  });

  handlers.set("listCalendarEventRequests", () => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "calendar:eventRequest:review");
    return { ok: true, requests: readCalendarStore().requests };
  });

  handlers.set("approveCalendarEventRequest", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "calendar:eventRequest:review");
    const requestId = cleanText(data.requestId);
    const store = readCalendarStore();
    const request = store.requests.find((item) => item.id === requestId);
    if (!request) throw new Error("Event request was not found.");
    const id = mockEventId("approved");
    const eventId = makePlannerEventId(id);
    const event = makePlannerEvent(
      id,
      {
        title: request.title,
        description: request.description,
        startAt: request.startAt,
        roleIds: request.roleIds,
      },
      request.creator,
    );
    writeCalendarStore({
      requests: store.requests.filter((item) => item.id !== requestId),
      events: { ...store.events, [eventId]: event },
    });
    return { ok: true, eventId, event, roleIds: request.roleIds };
  });

  handlers.set("denyCalendarEventRequest", (data) => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "calendar:eventRequest:review");
    const requestId = cleanText(data.requestId);
    const store = readCalendarStore();
    writeCalendarStore({
      ...store,
      requests: store.requests.filter((item) => item.id !== requestId),
    });
    return { ok: true };
  });

  handlers.set("createCraftingRequest", (data) =>
    createDevCraftingRequest(data),
  );
  handlers.set("acceptCraftingRequest", (data) =>
    acceptDevCraftingRequest(data),
  );
  handlers.set("completeCraftingRequest", (data) =>
    completeDevCraftingRequest(data),
  );
  handlers.set("closeCraftingRequest", (data) =>
    closeDevCraftingRequest(data),
  );
  handlers.set("reopenCraftingRequest", (data) =>
    reopenDevCraftingRequest(data),
  );
}

export function registerDevCallable(name: string, handler: DevCallableHandler): void {
  handlers.set(name, handler);
}

export async function callDevAdminFunction<T = unknown>(
  name: string,
  sessionToken: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  assertDevLayer();
  registerDefaultHandlers();
  const handler = handlers.get(name);
  if (!handler) {
    throw new Error(`No dev callable registered for ${name}.`);
  }
  return await handler(data, sessionToken) as T;
}

export function getDevCalendarEvents(): Record<string, unknown> {
  if (!DEV_AUTH_LAYER_ENABLED) return {};
  return readCalendarStore().events;
}

export function setDevGameServerFixture(serverId: GameServerId, scenario: GameServerFixture): void {
  assertDevLayer();
  gameServers.fixture(serverId, scenario);
}
