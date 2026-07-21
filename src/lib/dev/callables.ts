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

type GameServerAccessEntry = {
  discordUserId: string;
  displayName: string;
  enabled: boolean;
  notes: string | null;
  addedBy: string;
  addedAt: number;
  updatedAt: number;
};

type GameServerAuditLogEntry = {
  id: string;
  serverId: "palworld";
  action: "start" | "stop" | "auto-stop" | "settings";
  result: "requested" | "noop" | "blocked" | "failed";
  statusBefore: "running" | "stopped" | "disabled" | "unknown";
  statusAfter?: "running" | "stopped" | "disabled" | "unknown";
  message: string;
  requestedByDiscordUserId: string;
  requestedByDisplayName?: string;
  isAdmin: boolean;
  instanceId?: string;
  createdAt: number;
};

type GameServerSettings = {
  serverId: "palworld";
  enabled: boolean;
  disabledMessage: string | null;
  updatedAt: number;
  updatedBy: string | null;
};

const handlers = new Map<string, DevCallableHandler>();
const CALENDAR_FEATURE = "calendar";
const GAME_SERVER_ACCESS_FEATURE = "game-server-access";
const GAME_SERVER_STATUS_FEATURE = "game-server-status";
const GAME_SERVER_AUDIT_FEATURE = "game-server-audit";
const GAME_SERVER_SETTINGS_FEATURE = "game-server-settings";

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

function readGameServerAccessStore(): Record<string, GameServerAccessEntry> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(
    devStorageKey(GAME_SERVER_ACCESS_FEATURE),
  );
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, GameServerAccessEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGameServerAccessStore(
  store: Record<string, GameServerAccessEntry>,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    devStorageKey(GAME_SERVER_ACCESS_FEATURE),
    JSON.stringify(store),
  );
}

function readGameServerAuditStore(): GameServerAuditLogEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(
    devStorageKey(GAME_SERVER_AUDIT_FEATURE),
  );
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as GameServerAuditLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGameServerAuditStore(entries: GameServerAuditLogEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    devStorageKey(GAME_SERVER_AUDIT_FEATURE),
    JSON.stringify(entries.slice(0, 50)),
  );
}

function appendGameServerAuditEntry(
  persona: DevPersona,
  entry: Pick<
    GameServerAuditLogEntry,
    "action" | "result" | "statusBefore" | "message"
  > & { statusAfter?: "running" | "stopped" | "disabled" | "unknown" },
): void {
  const now = Date.now();
  writeGameServerAuditStore([
    {
      id: `dev_audit_${now}_${Math.random().toString(36).slice(2, 8)}`,
      serverId: "palworld",
      ...entry,
      requestedByDiscordUserId: persona.discordUserId,
      requestedByDisplayName:
        persona.characterName || persona.discordUserId,
      isAdmin: persona.isAdmin,
      instanceId: "i-local-palworld",
      createdAt: now,
    },
    ...readGameServerAuditStore(),
  ]);
}

function readGameServerSettingsStore(): GameServerSettings {
  if (typeof window === "undefined") {
    return {
      serverId: "palworld",
      enabled: true,
      disabledMessage: null,
      updatedAt: 0,
      updatedBy: null,
    };
  }
  const raw = window.localStorage.getItem(
    devStorageKey(GAME_SERVER_SETTINGS_FEATURE),
  );
  if (!raw) {
    return {
      serverId: "palworld",
      enabled: true,
      disabledMessage: null,
      updatedAt: 0,
      updatedBy: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GameServerSettings>;
    return {
      serverId: "palworld",
      enabled: parsed.enabled !== false,
      disabledMessage:
        typeof parsed.disabledMessage === "string" && parsed.disabledMessage
          ? parsed.disabledMessage
          : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      updatedBy:
        typeof parsed.updatedBy === "string" && parsed.updatedBy
          ? parsed.updatedBy
          : null,
    };
  } catch {
    return {
      serverId: "palworld",
      enabled: true,
      disabledMessage: null,
      updatedAt: 0,
      updatedBy: null,
    };
  }
}

function writeGameServerSettingsStore(settings: GameServerSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    devStorageKey(GAME_SERVER_SETTINGS_FEATURE),
    JSON.stringify(settings),
  );
}

function assertGameServerAccess(persona: DevPersona): void {
  assertAuthenticated(persona);
  if (persona.isAdmin) return;
  const entry = readGameServerAccessStore()[persona.discordUserId];
  if (!entry?.enabled) {
    throw new Error("Game server whitelist required.");
  }
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

function readDevGameServerStatus(): "running" | "stopped" {
  if (typeof window === "undefined") return "stopped";
  const raw = window.localStorage.getItem(
    devStorageKey(GAME_SERVER_STATUS_FEATURE),
  );
  return raw === "running" ? "running" : "stopped";
}

function writeDevGameServerStatus(status: "running" | "stopped"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    devStorageKey(GAME_SERVER_STATUS_FEATURE),
    status,
  );
}

function devMonthlyCost() {
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonthKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    monthlyCost: {
      monthKey,
      estimatedComputeAud: 4.25,
      runningHours: 28.3,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: Date.now(),
    },
    previousMonthCost: {
      monthKey: previousMonthKey,
      estimatedComputeAud: 12.75,
      runningHours: 85,
      hourlyRateAud: 0.15,
      instanceType: "t3a.large",
      updatedAt: Date.now() - 24 * 60 * 60 * 1000,
    },
  };
}

function devPalworldStatus(serverId = "palworld") {
  const settings = readGameServerSettingsStore();
  if (!settings.enabled) {
    return {
      ok: true,
      serverId,
      status: "disabled",
      checkedAt: Date.now(),
      host: null,
      connectAddress: null,
      message: settings.disabledMessage || "Palworld is disabled by admins.",
      enabled: false,
      disabledMessage: settings.disabledMessage,
      instanceId: null,
      instanceType: null,
      launchTime: null,
      playerCount: null,
      maxPlayers: null,
      players: [],
      memoryUsedPercent: null,
      diskUsedPercent: null,
      idleSince: null,
      autoStopEligibleAt: null,
      telemetryCheckedAt: null,
      telemetryMessage: "Telemetry is disabled while Palworld is off.",
      monthlyCost: null,
      previousMonthCost: null,
    };
  }
  const status = readDevGameServerStatus();
  const host = status === "running" ? "127.0.0.1" : null;
  const costs = devMonthlyCost();
  const players =
    status === "running"
      ? [
          {
            name: "Chow",
            accountName: "chow",
            playerId: "626327D9000000000000000000000000",
            userId: "steam_76561198069906492",
            ping: 19.6,
            level: 8,
          },
        ]
      : [];
  return {
    ok: true,
    serverId,
    status,
    checkedAt: Date.now(),
    host,
    connectAddress: host ? `${host}:8211` : null,
    message:
      status === "running"
        ? "Ready to join."
        : "Offline.",
    enabled: true,
    disabledMessage: null,
    instanceId: "i-local-palworld",
    instanceType: "t3a.large",
    launchTime: status === "running" ? new Date().toISOString() : null,
    playerCount: status === "running" ? players.length : null,
    maxPlayers: null,
    players,
    memoryUsedPercent: status === "running" ? 41.8 : null,
    diskUsedPercent: status === "running" ? 63.2 : null,
    idleSince: status === "running" ? Date.now() - 12 * 60 * 1000 : null,
    autoStopEligibleAt: status === "running" ? Date.now() + 18 * 60 * 1000 : null,
    telemetryCheckedAt: Date.now(),
    telemetryMessage: null,
    monthlyCost: costs.monthlyCost,
    previousMonthCost: costs.previousMonthCost,
  };
}

function registerDefaultHandlers(): void {
  if (handlers.size > 0) return;

  handlers.set("listGameServerAccess", () => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return {
      ok: true,
      entries: Object.values(readGameServerAccessStore()).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    };
  });

  handlers.set("listGameServerAccessCandidates", () => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    const store = readGameServerAccessStore();
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
    const discordUserId = parseDevDiscordId(data.discordUserId);
    const displayName = parseDevDisplayName(data.displayName);
    const notes = cleanText(data.notes).slice(0, 500) || null;
    const enabled = data.enabled === undefined ? true : data.enabled === true;
    const store = readGameServerAccessStore();
    const existing = store[discordUserId];
    const now = Date.now();
    const entry: GameServerAccessEntry = {
      discordUserId,
      displayName,
      enabled,
      notes,
      addedBy: existing?.addedBy || persona.discordUserId,
      addedAt: existing?.addedAt || now,
      updatedAt: now,
    };
    writeGameServerAccessStore({ ...store, [discordUserId]: entry });
    return { ok: true, entry };
  });

  handlers.set("deleteGameServerAccess", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    const discordUserId = parseDevDiscordId(data.discordUserId);
    const store = readGameServerAccessStore();
    const next = { ...store };
    delete next[discordUserId];
    writeGameServerAccessStore(next);
    return { ok: true };
  });

  handlers.set("listGameServerAuditLog", () => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return {
      ok: true,
      entries: readGameServerAuditStore().slice(0, 25),
    };
  });

  handlers.set("listGameServerEvents", () => {
    const persona = getSelectedDevPersona();
    assertGameServerAccess(persona);
    return {
      ok: true,
      entries: readGameServerAuditStore().slice(0, 5),
    };
  });

  handlers.set("getGameServerSettings", () => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    return {
      ok: true,
      settings: readGameServerSettingsStore(),
    };
  });

  handlers.set("updateGameServerSettings", (data) => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    if (!persona.isAdmin) throw new Error("Boss or Underpaw Discord role required.");
    const serverId = cleanText(data.serverId);
    if (serverId !== "palworld") {
      throw new Error("A valid game server is required.");
    }
    const settings: GameServerSettings = {
      serverId: "palworld",
      enabled: data.enabled === true,
      disabledMessage: cleanText(data.disabledMessage).slice(0, 240) || null,
      updatedAt: Date.now(),
      updatedBy: persona.discordUserId,
    };
    writeGameServerSettingsStore(settings);
    appendGameServerAuditEntry(persona, {
      action: "settings",
      result: "requested",
      statusBefore: "unknown",
      statusAfter: settings.enabled ? "unknown" : "disabled",
      message: settings.enabled
        ? "Local dev Palworld mock enabled."
        : "Local dev Palworld mock disabled.",
    });
    return { ok: true, settings };
  });

  handlers.set("getGameServers", () => {
    const persona = getSelectedDevPersona();
    assertGameServerAccess(persona);
    const status = readDevGameServerStatus();
    const settings = readGameServerSettingsStore();
    return {
      ok: true,
      servers: [
        {
          id: "palworld",
          name: "Palworld",
          description: "Dedicated Palworld server hosted on AWS EC2.",
          provider: "aws-ec2",
          region: "ap-southeast-2",
          route: "/gameserver/palworld",
          ports: [
            { label: "Server", protocol: "UDP", port: 8211 },
            { label: "Query", protocol: "UDP", port: 27015 },
          ],
          status: settings.enabled ? status : "disabled",
          host: settings.enabled && status === "running" ? "127.0.0.1" : null,
          connectAddress:
            settings.enabled && status === "running" ? "127.0.0.1:8211" : null,
          enabled: settings.enabled,
          disabledMessage: settings.disabledMessage,
          controlsAvailable:
            settings.enabled && (status === "running" || status === "stopped"),
          phase: "live",
        },
      ],
    };
  });

  handlers.set("getGameServerAccessStatus", () => {
    const persona = getSelectedDevPersona();
    assertAuthenticated(persona);
    const entry = readGameServerAccessStore()[persona.discordUserId];
    return {
      ok: true,
      canUseGameServers: persona.isAdmin || entry?.enabled === true,
      isAdmin: persona.isAdmin,
    };
  });

  handlers.set("getGameServerStatus", (data) => {
    const persona = getSelectedDevPersona();
    assertGameServerAccess(persona);
    const serverId = cleanText(data.serverId);
    if (serverId !== "palworld") {
      throw new Error("A valid game server is required.");
    }
    return devPalworldStatus(serverId);
  });

  handlers.set("startGameServer", (data) => {
    const persona = getSelectedDevPersona();
    assertGameServerAccess(persona);
    const serverId = cleanText(data.serverId);
    if (serverId !== "palworld") {
      throw new Error("A valid game server is required.");
    }
    if (!readGameServerSettingsStore().enabled) {
      throw new Error(
        readGameServerSettingsStore().disabledMessage ||
          "Palworld is disabled by admins.",
      );
    }
    const previousStatus = readDevGameServerStatus();
    if (previousStatus === "running") {
      appendGameServerAuditEntry(persona, {
        action: "start",
        result: "noop",
        statusBefore: previousStatus,
        statusAfter: previousStatus,
        message: "Local dev Palworld mock is already running.",
      });
      return {
        ok: true,
        serverId,
        status: "running",
        checkedAt: Date.now(),
        host: "127.0.0.1",
        connectAddress: "127.0.0.1:8211",
        enabled: true,
        disabledMessage: null,
        instanceId: "i-local-palworld",
        instanceType: "t3a.large",
        launchTime: new Date().toISOString(),
        playerCount: 0,
        maxPlayers: null,
        players: [],
        memoryUsedPercent: 41.8,
        diskUsedPercent: 63.2,
        idleSince: Date.now(),
        autoStopEligibleAt: Date.now() + 30 * 60 * 1000,
        telemetryCheckedAt: Date.now(),
        telemetryMessage: null,
        message: "Local dev Palworld mock is already running.",
      };
    }
    writeDevGameServerStatus("running");
    appendGameServerAuditEntry(persona, {
      action: "start",
      result: "requested",
      statusBefore: previousStatus,
      statusAfter: "running",
      message: "Local dev Palworld mock started.",
    });
    return {
      ok: true,
      serverId,
      status: "running",
      checkedAt: Date.now(),
      host: "127.0.0.1",
      connectAddress: "127.0.0.1:8211",
      enabled: true,
      disabledMessage: null,
      instanceId: "i-local-palworld",
      instanceType: "t3a.large",
      launchTime: new Date().toISOString(),
      playerCount: 0,
      maxPlayers: null,
      players: [],
      memoryUsedPercent: 41.8,
      diskUsedPercent: 63.2,
      idleSince: Date.now(),
      autoStopEligibleAt: Date.now() + 30 * 60 * 1000,
      telemetryCheckedAt: Date.now(),
      telemetryMessage: null,
      message: "Local dev Palworld mock started.",
    };
  });

  handlers.set("stopGameServer", (data) => {
    const persona = getSelectedDevPersona();
    assertGameServerAccess(persona);
    const serverId = cleanText(data.serverId);
    if (serverId !== "palworld") {
      throw new Error("A valid game server is required.");
    }
    if (!readGameServerSettingsStore().enabled) {
      throw new Error(
        readGameServerSettingsStore().disabledMessage ||
          "Palworld is disabled by admins.",
      );
    }
    const previousStatus = readDevGameServerStatus();
    if (previousStatus === "stopped") {
      appendGameServerAuditEntry(persona, {
        action: "stop",
        result: "noop",
        statusBefore: previousStatus,
        statusAfter: previousStatus,
        message: "Local dev Palworld mock is already stopped.",
      });
      return {
        ok: true,
        serverId,
        status: "stopped",
        checkedAt: Date.now(),
        host: null,
        connectAddress: null,
        enabled: true,
        disabledMessage: null,
        instanceId: "i-local-palworld",
        instanceType: "t3a.large",
        launchTime: null,
        playerCount: null,
        maxPlayers: null,
        players: [],
        memoryUsedPercent: null,
        diskUsedPercent: null,
        idleSince: null,
        autoStopEligibleAt: null,
        telemetryCheckedAt: Date.now(),
        telemetryMessage: "Telemetry is available while Palworld is running.",
        message: "Local dev Palworld mock is already stopped.",
      };
    }
    writeDevGameServerStatus("stopped");
    appendGameServerAuditEntry(persona, {
      action: "stop",
      result: "requested",
      statusBefore: previousStatus,
      statusAfter: "stopped",
      message: "Local dev Palworld mock stopped.",
    });
    return {
      ok: true,
      serverId,
      status: "stopped",
      checkedAt: Date.now(),
      host: null,
      connectAddress: null,
      enabled: true,
      disabledMessage: null,
      instanceId: "i-local-palworld",
      instanceType: "t3a.large",
      launchTime: null,
      playerCount: null,
      maxPlayers: null,
      players: [],
      memoryUsedPercent: null,
      diskUsedPercent: null,
      idleSince: null,
      autoStopEligibleAt: null,
      telemetryCheckedAt: Date.now(),
      telemetryMessage: "Telemetry is available while Palworld is running.",
      message: "Local dev Palworld mock stopped.",
    };
  });

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
      capabilities: persona.capabilities,
      expiresAt: Number.MAX_SAFE_INTEGER,
    };
  });

  handlers.set("triggerDmuProgressRefresh", () => {
    const persona = getSelectedDevPersona();
    assertCapability(persona, "admin:*");
    return {
      ok: true,
      sourceStatus: {
        source: "tomestone",
        checkedAt: Date.now(),
        trackedMembers: 0,
        eligibleMembers: 0,
        playersWithProgress: 0,
        requestsThisRefresh: 0,
        failedMembers: 0,
        pageCapReached: false,
        failures: [],
      },
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
