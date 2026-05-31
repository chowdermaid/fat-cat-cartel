import * as admin from "firebase-admin";

const RAID_HELPER_API_BASE = "https://raid-helper.xyz/api/v4";
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const ALLOWED_RAID_HELPER_PING_ROLE_IDS = new Set<string>([
  "1339834783064264715",
  "1375069801244004462",
  "1339828715164532846",
  "1339834667561648198",
  "1339833818055446621",
  "1339835677457514567",
  "1374967120235855946",
]);

type RaidHelperEvent = {
  id?: string;
  serverId?: string;
  leaderId?: string;
  leaderName?: string;
  channelId?: string;
  channelName?: string;
  templateId?: string;
  title?: string;
  description?: string;
  startTime?: number;
  endTime?: number;
  closingTime?: number;
  date?: string;
  time?: string;
  lastUpdated?: number;
};

type NormalizedCalendarEvent = {
  title: string;
  description: string | null;
  startAt: number;
  endAt: number | null;
  location: string | null;
  source: "raidHelper";
  sourceUrl: string | null;
  plannerMessageId: string;
  raidHelperEventId: string;
  leaderId: string | null;
  leaderName: string | null;
  templateId: string | null;
  rawDate: string | null;
  rawTime: string | null;
  lastSyncedAt: number;
  updatedAt: number;
  status: "scheduled";
};

type RaidHelperCreateResponse = {
  status?: string;
  event?: RaidHelperEvent;
};

type RaidHelperEventsResponse = {
  pages?: number;
  currentPage?: number;
  eventCountOverall?: number;
  eventCountTransmitted?: number;
  postedEvents?: RaidHelperEvent[];
};

type ParseFailure = {
  messageId: string;
  reason: string;
  sampledAt: number;
};

export type DiscordPlannerSyncConfig = {
  apiKey: string;
  guildId: string;
  channelId?: string;
};

export type RaidHelperCreateConfig = DiscordPlannerSyncConfig & {
  templateId: string;
  fallbackLeaderId?: string;
  discordBotToken?: string;
};

export type CreateRaidHelperEventRequest = {
  title?: unknown;
  description?: unknown;
  startAt?: unknown;
  roleIds?: unknown;
};

export type DiscordPlannerSyncResult = {
  ok: true;
  importedCount: number;
  skippedCount: number;
  failures: ParseFailure[];
};

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[\u200e\u200f\u2066-\u2069]/g, "").trim()
    : "";
}

function unixTimestampToMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value > 1_000_000_000_000 ? Math.floor(value) : Math.floor(value * 1000);
}

function messageUrl(guildId: string, channelId: string, messageId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}

function failure(event: RaidHelperEvent, reason: string, sampledAt: number): ParseFailure {
  return {
    messageId: cleanText(event.id) || "unknown",
    reason,
    sampledAt,
  };
}

function createStatusIsOk(status: unknown): boolean {
  if (typeof status !== "string" || !status.trim()) return true;
  const normalized = status.toLowerCase();
  return normalized.includes("success") || normalized.includes("created");
}

async function raidHelperJson<T>(
  url: string,
  apiKey: string,
  headers: Record<string, string> = {},
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: apiKey,
      ...headers,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Raid Helper request failed: ${response.status} ${body.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

async function sendDiscordRoleMentions(
  channelId: string,
  botToken: string,
  roleIds: string[],
): Promise<void> {
  if (roleIds.length === 0) return;
  if (!botToken) {
    throw new Error("Discord bot token is required to ping selected roles.");
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      content: roleIds.map((roleId) => `<@&${roleId}>`).join(" "),
      allowed_mentions: {
        parse: [],
        roles: roleIds,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord role ping failed: ${response.status} ${body.slice(0, 200)}`);
  }
}

function normalizeRaidHelperEvent(
  event: RaidHelperEvent,
  config: DiscordPlannerSyncConfig,
  now: number,
): { eventId: string; event: NormalizedCalendarEvent } | null {
  const messageId = cleanText(event.id);
  const channelId = cleanText(event.channelId) || cleanText(config.channelId);
  const title = cleanText(event.title).slice(0, 120);
  const startAt = unixTimestampToMs(event.startTime);
  const endAt = unixTimestampToMs(event.endTime);
  const lastUpdated = unixTimestampToMs(event.lastUpdated);

  if (!messageId || !title || !startAt) return null;

  return {
    eventId: `discordPlanner_${messageId}`,
    event: {
      title,
      description: cleanText(event.description).slice(0, 1200) || null,
      startAt,
      endAt: endAt && endAt > startAt ? endAt : null,
      location: cleanText(event.channelName).slice(0, 120) || null,
      source: "raidHelper",
      sourceUrl: channelId ? messageUrl(config.guildId, channelId, messageId) : null,
      plannerMessageId: messageId,
      raidHelperEventId: messageId,
      leaderId: cleanText(event.leaderId) || null,
      leaderName: cleanText(event.leaderName).slice(0, 120) || null,
      templateId: cleanText(event.templateId) || null,
      rawDate: cleanText(event.date) || null,
      rawTime: cleanText(event.time) || null,
      lastSyncedAt: now,
      updatedAt: lastUpdated ?? now,
      status: "scheduled",
    },
  };
}

async function fetchRaidHelperEvents(config: DiscordPlannerSyncConfig): Promise<RaidHelperEvent[]> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const startTime = nowSeconds - Math.floor(RETENTION_MS / 1000);
  const endTime = nowSeconds + Math.floor(RETENTION_MS / 1000);
  const events: RaidHelperEvent[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${RAID_HELPER_API_BASE}/servers/${config.guildId}/events`;
    const response = await raidHelperJson<RaidHelperEventsResponse>(url, config.apiKey, {
      Page: String(page),
      IncludeSignUps: "false",
      StartTimeFilter: String(startTime),
      EndTimeFilter: String(endTime),
      ...(config.channelId ? { ChannelFilter: config.channelId } : {}),
    });
    events.push(...(Array.isArray(response.postedEvents) ? response.postedEvents : []));
    totalPages = Math.max(1, Math.min(10, Number(response.pages) || 1));
    page += 1;
  } while (page <= totalPages);

  return events;
}

export async function runSyncDiscordPlannerEvents(
  config: DiscordPlannerSyncConfig,
): Promise<DiscordPlannerSyncResult> {
  if (!config.apiKey || !config.guildId) {
    throw new Error("Raid Helper calendar sync is missing required configuration.");
  }

  const db = admin.database();
  const now = Date.now();
  const syncRef = db.ref("calendarSync/discordPlanner");
  await syncRef.update({
    lastStartedAt: now,
    lastError: null,
  });

  try {
    const events = await fetchRaidHelperEvents(config);
    const updates: Record<string, unknown> = {};
    const failures: ParseFailure[] = [];
    let importedCount = 0;

    for (const event of events) {
      const normalized = normalizeRaidHelperEvent(event, config, now);
      if (!cleanText(event.id)) {
        failures.push(failure(event, "Raid Helper event did not include an ID.", now));
        continue;
      }
      if (!normalized) {
        failures.push(failure(event, "Raid Helper event did not include a title and start time.", now));
        continue;
      }

      updates[`calendarEvents/${normalized.eventId}`] = normalized.event;
      importedCount += 1;
    }

    const cutoff = now - RETENTION_MS;
    const existingSnapshot = await db.ref("calendarEvents").get();
    const existing = existingSnapshot.val() as Record<string, { startAt?: unknown }> | null;
    for (const [eventId, event] of Object.entries(existing ?? {})) {
      if (!eventId.startsWith("discordPlanner_")) continue;
      const startAt = typeof event.startAt === "number" ? event.startAt : null;
      if (startAt !== null && startAt < cutoff) {
        updates[`calendarEvents/${eventId}`] = null;
      }
    }

    updates["calendarSync/discordPlanner"] = {
      lastStartedAt: now,
      lastSucceededAt: Date.now(),
      importedCount,
      skippedCount: failures.length,
      lastError: null,
      recentFailures: failures.slice(0, 10),
    };
    await db.ref("/").update(updates);

    return {
      ok: true,
      importedCount,
      skippedCount: failures.length,
      failures,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Raid Helper calendar sync error.";
    await syncRef.update({
      lastError: message,
      lastFailedAt: Date.now(),
    });
    throw error;
  }
}

function parseCreateRequest(data: CreateRaidHelperEventRequest): {
  title: string;
  description: string;
  startAt: number;
  roleIds: string[];
} {
  const title = cleanText(data.title).slice(0, 120);
  const description = cleanText(data.description).slice(0, 1200);
  const startAt = typeof data.startAt === "number" ? data.startAt : Number(data.startAt);
  if (!title) throw new Error("Event title is required.");
  if (!Number.isFinite(startAt) || startAt <= Date.now() - 60_000) {
    throw new Error("Event start time must be in the future.");
  }
  const roleIds = Array.isArray(data.roleIds)
    ? data.roleIds.map((roleId) => cleanText(roleId)).filter(Boolean)
    : [];
  const invalidRoleId = roleIds.find((roleId) => !ALLOWED_RAID_HELPER_PING_ROLE_IDS.has(roleId));
  if (invalidRoleId) {
    throw new Error("Selected role ping is not allowed.");
  }
  return { title, description, startAt: Math.floor(startAt), roleIds };
}

export async function createRaidHelperEventForAdmin(
  data: CreateRaidHelperEventRequest,
  requestedLeaderId: string,
  config: RaidHelperCreateConfig,
): Promise<{ ok: true; eventId: string; event: NormalizedCalendarEvent; roleIds: string[] }> {
  if (!config.apiKey || !config.guildId || !config.channelId || !config.templateId) {
    throw new Error("Raid Helper event creation is missing required configuration.");
  }
  const parsed = parseCreateRequest(data);
  const startSeconds = Math.floor(parsed.startAt / 1000);
  const url = `${RAID_HELPER_API_BASE}/servers/${config.guildId}/channels/${config.channelId}/event`;
  const fallbackLeaderId = cleanText(config.fallbackLeaderId);
  const leaderIds = Array.from(new Set([
    cleanText(requestedLeaderId),
    fallbackLeaderId,
  ].filter(Boolean)));
  let response: RaidHelperCreateResponse | null = null;
  let lastError: Error | null = null;
  for (const leaderId of leaderIds) {
    try {
      response = await raidHelperJson<RaidHelperCreateResponse>(
        url,
        config.apiKey,
        { "Content-Type": "application/json; charset=utf-8" },
        {
          method: "POST",
          body: JSON.stringify({
            leaderId,
            templateId: config.templateId,
            date: startSeconds,
            time: startSeconds,
            title: parsed.title,
            description: parsed.description,
          }),
        },
      );
      lastError = null;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Raid Helper event creation failed.";
      lastError = error instanceof Error ? error : new Error(message);
      if (!message.includes("invalid leaderId") || !fallbackLeaderId || leaderId === fallbackLeaderId) {
        throw lastError;
      }
    }
  }
  if (!response) {
    throw lastError ?? new Error("Raid Helper event creation failed.");
  }
  if (!createStatusIsOk(response.status)) {
    throw new Error(`Raid Helper event creation failed: ${response.status}`);
  }
  if (!response.event) {
    throw new Error("Raid Helper did not return a created event.");
  }
  const now = Date.now();
  const normalized = normalizeRaidHelperEvent(response.event, config, now);
  if (!normalized) {
    throw new Error("Raid Helper returned an event without an ID, title, or start time.");
  }
  await sendDiscordRoleMentions(config.channelId, cleanText(config.discordBotToken), parsed.roleIds);
  await admin.database().ref(`calendarEvents/${normalized.eventId}`).set(normalized.event);
  return {
    ok: true,
    eventId: normalized.eventId,
    event: normalized.event,
    roleIds: parsed.roleIds,
  };
}
