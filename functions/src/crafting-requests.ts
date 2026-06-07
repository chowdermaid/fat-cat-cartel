import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import type { VerifiedAdminSession } from "./admin-auth";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const CRAFTING_BOARD_FALLBACK_URL = "https://fat-cat-cartel.web.app/craftingboard";
const MATERIAL_STATUSES = new Set([
  "requester_has_all_materials",
  "requester_has_some_materials",
  "crafter_to_provide_materials",
]);
const MATERIAL_NOTE_MAX_LENGTH = 100;
const ROOT_UPDATE_ATTEMPTS = 3;
const COMPLETED_RECENT_MS = 30 * 24 * 60 * 60 * 1000;
const SERVER_INCREMENT_ONE = { ".sv": { increment: 1 } };

function serverIncrement(value: number) {
  return { ".sv": { increment: value } };
}

type CraftingIngredient = {
  itemId: number;
  name: string;
  icon?: unknown;
  amount: number;
};

type CraftingPrecraftSnapshot = {
  itemId: number;
  itemName: string;
  itemIcon?: unknown;
  quantity: number;
  recipeId: number;
  crafter: string;
  recipeLevel: number | null;
  depth?: number;
};

type CraftingEligibleCrafter = {
  lodestoneId: string;
  characterName: string;
  fcRank: string | null;
  avatarUrl: string | null;
  job: string;
  level: number;
};

type CraftingSelectedItem = {
  itemId: number;
  itemName: string;
  itemIcon?: unknown;
  quantity: number;
  selectedRecipeId: number;
  recipeSnapshot: {
    recipeId: number;
    itemId: number;
    itemName: string;
    itemIcon?: unknown;
    amountResult: number;
    crafter: string;
    recipeLevel: number | null;
    ingredients: CraftingIngredient[];
    crystals: CraftingIngredient[];
    clusters: CraftingIngredient[];
    precrafts: CraftingPrecraftSnapshot[];
    eligibleCrafters: CraftingEligibleCrafter[];
    snapshottedAt: number;
    source: "xivapi";
  };
};

type CraftingRequestRecord = {
  id: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  materialStatus: string;
  materialNote?: string | null;
  requester: {
    lodestoneId: string;
    discordUserId: string;
    characterName: string;
    fcRank: string | null;
    avatarUrl: string | null;
  };
  acceptedBy?: {
    lodestoneId: string;
    discordUserId: string;
    characterName: string;
    fcRank: string | null;
    avatarUrl: string | null;
    acceptedAt: number;
  } | null;
  completedBy?: {
    lodestoneId: string;
    discordUserId: string;
    characterName: string;
    fcRank: string | null;
    avatarUrl: string | null;
    completedAt: number;
  } | null;
  items: CraftingSelectedItem[];
  commission?: {
    offered: boolean;
    gil: number | null;
  } | null;
  discordMessage: CraftingDiscordMessageMetadata | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

type CraftingDiscordMessageMetadata = {
  channelId: string;
  messageId: string;
  url: string | null;
};

type DiscordMessageResponse = {
  id?: string;
  channel_id?: string;
};

export type CraftingDiscordConfig = {
  botToken: string;
  channelId: string;
  guildId: string;
  appOrigin?: string;
};

export type CraftingDiscordUpdateConfig = {
  botToken: string;
  appOrigin?: string;
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableValue(value: unknown): unknown | null {
  return value === undefined ? null : value;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function craftingBoardUrl(appOrigin?: string): string {
  const origin = cleanText(appOrigin).replace(/\/+$/, "");
  return origin ? `${origin}/craftingboard` : CRAFTING_BOARD_FALLBACK_URL;
}

function discordMessageUrl(
  guildId: string,
  channelId: string,
  messageId: string,
): string | null {
  const guild = cleanText(guildId);
  if (!guild || !channelId || !messageId) return null;
  return `https://discord.com/channels/${guild}/${channelId}/${messageId}`;
}

function materialStatusLabel(status: string): string {
  switch (status) {
    case "requester_has_all_materials":
      return "I have all the materials";
    case "requester_has_some_materials":
      return "I have some of the materials";
    case "crafter_to_provide_materials":
      return "Crafter to provide materials";
    default:
      return status;
  }
}

function commissionText(request: CraftingRequestRecord): string | null {
  if (request.commission?.offered !== true) return null;
  return typeof request.commission.gil === "number" && request.commission.gil > 0
    ? `${request.commission.gil.toLocaleString("en-US")} gil`
    : "Offered";
}

function itemListText(items: CraftingSelectedItem[]): string {
  return truncateText(
    (arrayValue(items) as CraftingSelectedItem[])
      .map((item) => `x${item.quantity} [${item.itemName}](https://ffxivteamcraft.com/db/en/item/${item.itemId})`)
      .join("\n"),
    1000,
  );
}

function requestStatusLabel(request: CraftingRequestRecord): string {
  if (request.status === "completed") return "Completed";
  if (request.status === "in_progress" && request.acceptedBy) {
    return `Accepted by <@${request.acceptedBy.discordUserId}> (${request.acceptedBy.characterName})`;
  }
  if (request.status === "cancelled") return "Cancelled";
  return "Open";
}

function discordCraftingRequestPayload(
  request: CraftingRequestRecord,
  appOrigin?: string,
) {
  const boardUrl = craftingBoardUrl(appOrigin);
  const commission = commissionText(request);
  const title = request.status === "completed"
    ? "Completed crafting request"
    : request.status === "in_progress"
      ? "Crafting request in progress"
      : "New crafting request";
  const mentionedUsers = [
    request.requester.discordUserId,
    request.acceptedBy?.discordUserId,
  ].flatMap((userId) => {
    const cleanUserId = cleanText(userId);
    return cleanUserId ? [cleanUserId] : [];
  });

  return {
    content: `Crafting request ${requestStatusLabel(request)}\nRequested by <@${request.requester.discordUserId}>\n<${boardUrl}>`,
    allowed_mentions: {
      parse: [],
      users: Array.from(new Set(mentionedUsers)),
    },
    embeds: [
      {
        title,
        url: boardUrl,
        fields: [
          {
            name: "Status",
            value: requestStatusLabel(request),
            inline: true,
          },
          {
            name: "Requester",
            value: `<@${request.requester.discordUserId}> (${request.requester.characterName})`,
            inline: true,
          },
          {
            name: "Materials",
            value: materialStatusLabel(request.materialStatus),
            inline: true,
          },
          ...(request.materialNote
            ? [{
                name: "Materials note",
                value: request.materialNote,
              }]
            : []),
          ...(commission
            ? [{
                name: "Commission",
                value: commission,
                inline: true,
              }]
            : []),
          {
            name: "Items",
            value: itemListText(request.items) || "No items",
          },
        ],
      },
    ],
  };
}

async function sendDiscordCraftingRequestMessage(
  request: CraftingRequestRecord,
  config: CraftingDiscordConfig,
): Promise<CraftingDiscordMessageMetadata> {
  const channelId = cleanText(config.channelId);
  const botToken = cleanText(config.botToken);
  if (!channelId || !botToken) {
    throw new Error("Discord crafting request notification is missing required configuration.");
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(discordCraftingRequestPayload(request, config.appOrigin)),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord crafting request notification failed: ${response.status} ${body.slice(0, 200)}`,
    );
  }

  const message = (await response.json()) as DiscordMessageResponse;
  const messageId = cleanText(message.id);
  const returnedChannelId = cleanText(message.channel_id) || channelId;
  if (!messageId) {
    throw new Error("Discord did not return a crafting request message ID.");
  }
  return {
    channelId: returnedChannelId,
    messageId,
    url: discordMessageUrl(config.guildId, returnedChannelId, messageId),
  };
}

async function updateDiscordCraftingRequestMessage(
  request: CraftingRequestRecord,
  config: CraftingDiscordUpdateConfig,
): Promise<void> {
  const token = cleanText(config.botToken);
  const channelId = cleanText(request.discordMessage?.channelId);
  const messageId = cleanText(request.discordMessage?.messageId);
  if (!token || !channelId || !messageId) {
    console.warn(`Crafting request ${request.id} has no Discord message to update.`);
    return;
  }

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(discordCraftingRequestPayload(request, config.appOrigin)),
    },
  );

  if (response.status === 404) {
    console.warn(`Crafting request ${request.id} Discord message is missing or deleted.`);
    return;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Discord crafting request update failed: ${response.status} ${body.slice(0, 200)}`,
    );
  }
}

async function deleteDiscordCraftingRequestMessage(
  message: CraftingDiscordMessageMetadata,
  botToken: string,
): Promise<void> {
  const token = cleanText(botToken);
  if (!token || !message.channelId || !message.messageId) return;
  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${message.channelId}/messages/${message.messageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  );
  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");
    console.warn(
      `Could not delete orphan crafting Discord message: ${response.status} ${body.slice(0, 200)}`,
    );
  }
}

function parseRequestId(value: unknown): string {
  const requestId = cleanText(value);
  if (!/^[A-Za-z0-9_-]{8,120}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "A valid request ID is required.");
  }
  return requestId;
}

function positiveInt(value: unknown, message: string): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new HttpsError("invalid-argument", message);
  }
  return numberValue;
}

function nullableLevel(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return positiveInt(value, "Recipe level must be a positive integer.");
}

function parseCommission(value: unknown): CraftingRequestRecord["commission"] {
  if (value === null || value === undefined) return null;
  const input = objectValue(value, "Commission is invalid.");
  const offered = input.offered === true;
  if (!offered) return { offered: false, gil: null };
  if (input.gil === null || input.gil === undefined || input.gil === "") {
    return { offered: true, gil: null };
  }
  const gil = Number(input.gil);
  if (!Number.isInteger(gil) || gil < 1) {
    throw new HttpsError("invalid-argument", "Commission gil must be a positive integer.");
  }
  return { offered: true, gil: Math.min(gil, 999_999_999) };
}

function parseMaterialNote(value: unknown, materialStatus: string): string | null {
  if (materialStatus !== "requester_has_some_materials") return null;
  const note = cleanText(value).slice(0, MATERIAL_NOTE_MAX_LENGTH);
  return note || null;
}

function parseIngredient(value: unknown): CraftingIngredient {
  const input = objectValue(value, "Ingredient is invalid.");
  return {
    itemId: positiveInt(input.itemId, "Ingredient item ID is required."),
    name: cleanText(input.name).slice(0, 120),
    icon: nullableValue(input.icon),
    amount: positiveInt(input.amount, "Ingredient amount is required."),
  };
}

function parsePrecraft(value: unknown): CraftingPrecraftSnapshot | null {
  const input = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (!input) return null;
  const itemName = cleanText(input.itemName).slice(0, 120);
  const quantity = Number(input.quantity);
  const recipeId = Number(input.recipeId);
  const itemId = Number(input.itemId);
  if (!itemName || !Number.isInteger(quantity) || quantity < 1) return null;
  if (!Number.isInteger(recipeId) || recipeId < 1) return null;
  if (!Number.isInteger(itemId) || itemId < 1) return null;
  return {
    itemId,
    itemName,
    itemIcon: nullableValue(input.itemIcon),
    quantity,
    recipeId,
    crafter: cleanText(input.crafter).slice(0, 80) || "Crafter",
    recipeLevel: typeof input.recipeLevel === "number" ? input.recipeLevel : null,
    ...(typeof input.depth === "number" ? { depth: input.depth } : {}),
  };
}

function parseItem(value: unknown): CraftingSelectedItem {
  const input = objectValue(value, "Crafting item is invalid.");
  const snapshot = objectValue(input.recipeSnapshot, "Recipe snapshot is required.");
  const itemId = positiveInt(input.itemId, "Item ID is required.");
  const itemName = cleanText(input.itemName).slice(0, 120);
  const quantity = positiveInt(input.quantity, "Quantity must be at least 1.");
  const recipeId = positiveInt(snapshot.recipeId, "Recipe ID is required.");
  const selectedRecipeId = positiveInt(input.selectedRecipeId, "Selected recipe ID is required.");
  if (!itemName) throw new HttpsError("invalid-argument", "Item name is required.");
  if (recipeId !== selectedRecipeId) {
    throw new HttpsError("invalid-argument", "Selected recipe does not match snapshot.");
  }

  const recipeLevel = nullableLevel(snapshot.recipeLevel);
  return {
    itemId,
    itemName,
    itemIcon: nullableValue(input.itemIcon),
    quantity,
    selectedRecipeId,
    recipeSnapshot: {
      recipeId,
      itemId: positiveInt(snapshot.itemId, "Snapshot item ID is required."),
      itemName: cleanText(snapshot.itemName).slice(0, 120) || itemName,
      itemIcon: nullableValue(snapshot.itemIcon),
      amountResult: positiveInt(snapshot.amountResult, "Recipe result amount is required."),
      crafter: cleanText(snapshot.crafter).slice(0, 80) || "Crafter",
      recipeLevel,
      ingredients: arrayValue(snapshot.ingredients).map(parseIngredient),
      crystals: arrayValue(snapshot.crystals).map(parseIngredient),
      clusters: arrayValue(snapshot.clusters).map(parseIngredient),
      precrafts: arrayValue(snapshot.precrafts).slice(0, 80).flatMap((precraft) => {
        const parsed = parsePrecraft(precraft);
        return parsed ? [parsed] : [];
      }),
      eligibleCrafters: [],
      snapshottedAt: typeof snapshot.snapshottedAt === "number" ? snapshot.snapshottedAt : Date.now(),
      source: "xivapi",
    },
  };
}

function objectValue(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpsError("invalid-argument", message);
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseRequest(data: unknown): {
  materialStatus: string;
  materialNote: string | null;
  items: CraftingSelectedItem[];
  commission: CraftingRequestRecord["commission"];
} {
  const input = objectValue(data, "Crafting request is invalid.");
  if ("gil" in input || "tip" in input || "estimatedMaterialCost" in input) {
    throw new HttpsError("invalid-argument", "Gil, tip, and estimated cost are not supported.");
  }
  const materialStatus = cleanText(input.materialStatus);
  if (!MATERIAL_STATUSES.has(materialStatus)) {
    throw new HttpsError("invalid-argument", "Material status is required.");
  }
  const items = arrayValue(input.items).map(parseItem);
  if (items.length === 0) {
    throw new HttpsError("invalid-argument", "Add at least one craftable item.");
  }
  return {
    materialStatus,
    materialNote: parseMaterialNote(input.materialNote, materialStatus),
    items,
    commission: parseCommission(input.commission),
  };
}

async function addEligibleCrafters(items: CraftingSelectedItem[]): Promise<CraftingSelectedItem[]> {
  const membersSnap = await admin.database().ref("members").get();
  const members = membersSnap.val() as Record<
    string,
    { name?: unknown; fcRank?: unknown; avatarUrl?: unknown; jobLevels?: Record<string, unknown> }
  > | null;

  return items.map((item) => {
    const crafter = item.recipeSnapshot.crafter;
    const recipeLevel = item.recipeSnapshot.recipeLevel ?? 0;
    const eligibleCrafters = Object.entries(members ?? {}).flatMap(([lodestoneId, member]) => {
      const level = Number(member.jobLevels?.[crafter] ?? 0);
      const characterName = cleanText(member.name);
      if (!characterName || member.fcRank === "Friend" || level < recipeLevel) return [];
      return [{
        lodestoneId,
        characterName,
        fcRank: cleanText(member.fcRank) || null,
        avatarUrl: cleanText(member.avatarUrl) || null,
        job: crafter,
        level,
      }];
    });
    return {
      ...item,
      recipeSnapshot: {
        ...item.recipeSnapshot,
        eligibleCrafters,
      },
    };
  });
}

function memberFromSession(session: VerifiedAdminSession) {
  return {
    lodestoneId: session.lodestoneId,
    discordUserId: session.discordUserId,
    characterName: session.characterName,
    fcRank: session.fcRank,
    avatarUrl: session.avatarUrl ?? null,
  };
}

function sameLodestoneId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function sameDiscordUserId(left: unknown, right: unknown): boolean {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function isCraftingRequester(
  request: CraftingRequestRecord,
  session: VerifiedAdminSession,
): boolean {
  return (
    sameLodestoneId(request.requester.lodestoneId, session.lodestoneId) ||
    sameDiscordUserId(request.requester.discordUserId, session.discordUserId)
  );
}

function isCraftingAcceptedCrafter(
  request: CraftingRequestRecord,
  session: VerifiedAdminSession,
): boolean {
  return (
    sameLodestoneId(request.acceptedBy?.lodestoneId, session.lodestoneId) ||
    sameDiscordUserId(request.acceptedBy?.discordUserId, session.discordUserId)
  );
}

function isCraftingAdmin(session: VerifiedAdminSession): boolean {
  const rank = String(session.fcRank ?? "").trim().toLowerCase();
  return session.isAdmin === true || rank === "boss" || rank === "underpaw";
}

function dashboardRecordFromRequest(request: CraftingRequestRecord) {
  const items = arrayValue(request.items) as CraftingSelectedItem[];
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

async function updateRootWithRetry(
  updates: Record<string, unknown>,
): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= ROOT_UPDATE_ATTEMPTS; attempt += 1) {
    try {
      await admin.database().ref("/").update(updates);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Crafting request database update attempt ${attempt} failed`, error);
    }
  }
  throw lastError;
}

async function oldCompletedRecentRemovals(now: number): Promise<Record<string, null>> {
  const cutoff = now - COMPLETED_RECENT_MS;
  const snap = await admin.database().ref("craftingRequestIndexes/completedRecent").get();
  const records = snap.val() as Record<string, { completedAt?: unknown; status?: unknown }> | null;
  return Object.fromEntries(
    Object.entries(records ?? {}).flatMap(([requestId, record]) => {
      const completedAt = Number(record?.completedAt ?? 0);
      return record?.status === "completed" &&
        Number.isFinite(completedAt) &&
        completedAt < cutoff
        ? [[`craftingRequestIndexes/completedRecent/${requestId}`, null]]
        : [];
    }),
  );
}

async function readCraftingRequestRecord(
  requestId: string,
): Promise<CraftingRequestRecord | null> {
  const snap = await admin.database().ref(`craftingRequests/${requestId}`).get();
  return snap.val() as CraftingRequestRecord | null;
}

export async function createCraftingRequestForMember(
  data: unknown,
  session: VerifiedAdminSession,
  discordConfig: CraftingDiscordConfig,
): Promise<{ ok: true; requestId: string }> {
  const parsed = parseRequest(data);
  const now = Date.now();
  const ref = admin.database().ref("craftingRequests").push();
  const requestId = ref.key ?? `crafting_${now}`;
  const items = await addEligibleCrafters(parsed.items);
  const request: CraftingRequestRecord = {
    id: requestId,
    status: "open",
    materialStatus: parsed.materialStatus,
    materialNote: parsed.materialNote,
    requester: {
      ...memberFromSession(session),
    },
    items,
    commission: parsed.commission,
    discordMessage: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  const discordMessage = await sendDiscordCraftingRequestMessage(request, discordConfig);
  const requestWithMessage: CraftingRequestRecord = {
    ...request,
    discordMessage,
  };

  try {
    await updateRootWithRetry({
      [`craftingRequests/${requestId}`]: requestWithMessage,
      [`craftingRequestIndexes/open/${requestId}`]: dashboardRecordFromRequest(requestWithMessage),
    });
  } catch (error) {
    await deleteDiscordCraftingRequestMessage(discordMessage, discordConfig.botToken);
    throw error;
  }
  return { ok: true, requestId };
}

export async function acceptCraftingRequestForMember(
  data: unknown,
  session: VerifiedAdminSession,
  discordConfig: CraftingDiscordUpdateConfig,
): Promise<{ ok: true; requestId: string }> {
  const requestId = parseRequestId((objectValue(data, "Request is invalid.")).requestId);
  const now = Date.now();
  const acceptedBy = {
    ...memberFromSession(session),
    acceptedAt: now,
  };
  const currentRequest = await readCraftingRequestRecord(requestId);

  if (
    !currentRequest ||
    currentRequest.status !== "open" ||
    currentRequest.acceptedBy
  ) {
    const repairRequest = currentRequest;
    if (
      repairRequest &&
      isCraftingRequester(repairRequest, session) &&
      !isCraftingAdmin(session)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Requesters can close their own request instead.",
      );
    }
    const staleIndexUpdates: Record<string, unknown> = repairRequest
      ? {
          [`craftingRequestIndexes/open/${requestId}`]:
            repairRequest.status === "open"
              ? dashboardRecordFromRequest(repairRequest)
              : null,
        }
      : {};
    if (repairRequest?.status === "in_progress") {
      staleIndexUpdates[`craftingRequestIndexes/inProgress/${requestId}`] =
        dashboardRecordFromRequest(repairRequest);
    }
    if (repairRequest?.status === "completed") {
      staleIndexUpdates[`craftingRequestIndexes/completedRecent/${requestId}`] =
        dashboardRecordFromRequest(repairRequest);
    }
    if (repairRequest?.status === "cancelled") {
      staleIndexUpdates[`craftingRequestIndexes/cancelled/${requestId}`] =
        dashboardRecordFromRequest(repairRequest);
    }
    if (Object.keys(staleIndexUpdates).length > 0) {
      await updateRootWithRetry(staleIndexUpdates).catch((error) => {
        console.warn("Could not repair stale open crafting request index", error);
      });
    }
    throw new HttpsError("failed-precondition", "Request is no longer open.");
  }
  if (isCraftingRequester(currentRequest, session) && !isCraftingAdmin(session)) {
    throw new HttpsError(
      "failed-precondition",
      "Requesters can close their own request instead.",
    );
  }

  const nextRequest: CraftingRequestRecord = {
    ...currentRequest,
    status: "in_progress",
    acceptedBy,
    updatedAt: now,
  };

  await updateRootWithRetry({
    [`craftingRequests/${requestId}`]: nextRequest,
    [`craftingRequestIndexes/open/${requestId}`]: null,
    [`craftingRequestIndexes/inProgress/${requestId}`]: dashboardRecordFromRequest(nextRequest),
  });
  try {
    await updateDiscordCraftingRequestMessage(nextRequest, discordConfig);
  } catch (error) {
    console.warn("Could not update accepted crafting request Discord message", error);
  }
  return { ok: true, requestId };
}

export async function completeCraftingRequestForMember(
  data: unknown,
  session: VerifiedAdminSession,
  discordConfig: CraftingDiscordUpdateConfig,
): Promise<{ ok: true; requestId: string }> {
  const requestId = parseRequestId((objectValue(data, "Request is invalid.")).requestId);
  const now = Date.now();
  const currentRequest = await readCraftingRequestRecord(requestId);
  const isRequester = currentRequest
    ? isCraftingRequester(currentRequest, session)
    : false;
  const isAcceptedCrafter = currentRequest
    ? isCraftingAcceptedCrafter(currentRequest, session)
    : false;
  if (
    !currentRequest ||
    currentRequest.status !== "in_progress" ||
    (!isRequester && !isAcceptedCrafter && !isCraftingAdmin(session))
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Request cannot be completed by this session.",
    );
  }
  const nextRequest: CraftingRequestRecord = {
    ...currentRequest,
    status: "completed",
    completedAt: now,
    completedBy: { ...memberFromSession(session), completedAt: now },
    updatedAt: now,
  };

  const staleCompletedRemovals = await oldCompletedRecentRemovals(now);
  await updateRootWithRetry({
    ...staleCompletedRemovals,
    [`craftingRequests/${requestId}`]: nextRequest,
    [`craftingRequestIndexes/open/${requestId}`]: null,
    [`craftingRequestIndexes/inProgress/${requestId}`]: null,
    [`craftingRequestIndexes/completedRecent/${requestId}`]: dashboardRecordFromRequest(nextRequest),
    "craftingRequestStats/completedTotal": SERVER_INCREMENT_ONE,
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/fulfilledRequests`]:
      SERVER_INCREMENT_ONE,
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/fulfilledItems`]:
      serverIncrement(arrayValue(currentRequest.items).length),
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/updatedAt`]: now,
  });
  try {
    await updateDiscordCraftingRequestMessage(nextRequest, discordConfig);
  } catch (error) {
    console.warn("Could not update completed crafting request Discord message", error);
  }
  return { ok: true, requestId };
}

export async function closeCraftingRequestForMember(
  data: unknown,
  session: VerifiedAdminSession,
  discordConfig: CraftingDiscordUpdateConfig,
): Promise<{ ok: true; requestId: string }> {
  const requestId = parseRequestId((objectValue(data, "Request is invalid.")).requestId);
  const now = Date.now();
  const currentRequest = await readCraftingRequestRecord(requestId);
  const isRequester = currentRequest
    ? isCraftingRequester(currentRequest, session)
    : false;
  if (
    !currentRequest ||
    currentRequest.status !== "open" ||
    (!isRequester && !isCraftingAdmin(session))
  ) {
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      console.warn("[crafting] close denied", {
        requestId,
        session: {
          lodestoneId: session.lodestoneId,
          characterName: session.characterName,
          discordUserId: session.discordUserId,
          isAdmin: session.isAdmin,
          fcRank: session.fcRank,
          isCraftingAdmin: isCraftingAdmin(session),
        },
        database: {
          emulatorHost: process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? null,
          databaseURL: admin.app().options.databaseURL ?? null,
        },
        request: currentRequest
          ? {
              status: currentRequest.status,
              requester: currentRequest.requester,
            }
          : null,
      });
    }
    throw new HttpsError(
      "failed-precondition",
      "Request cannot be closed by this session.",
    );
  }
  const nextRequest: CraftingRequestRecord = {
    ...currentRequest,
    status: "completed",
    completedAt: now,
    completedBy: { ...memberFromSession(session), completedAt: now },
    updatedAt: now,
  };

  const staleCompletedRemovals = await oldCompletedRecentRemovals(now);
  await updateRootWithRetry({
    ...staleCompletedRemovals,
    [`craftingRequests/${requestId}`]: nextRequest,
    [`craftingRequestIndexes/open/${requestId}`]: null,
    [`craftingRequestIndexes/inProgress/${requestId}`]: null,
    [`craftingRequestIndexes/completedRecent/${requestId}`]: dashboardRecordFromRequest(nextRequest),
    "craftingRequestStats/completedTotal": SERVER_INCREMENT_ONE,
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/fulfilledRequests`]:
      SERVER_INCREMENT_ONE,
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/fulfilledItems`]:
      serverIncrement(arrayValue(currentRequest.items).length),
    [`craftingRequestStats/memberTotals/${session.lodestoneId}/updatedAt`]: now,
  });
  try {
    await updateDiscordCraftingRequestMessage(nextRequest, discordConfig);
  } catch (error) {
    console.warn("Could not update closed crafting request Discord message", error);
  }
  return { ok: true, requestId };
}

export async function reopenCraftingRequestForMember(
  data: unknown,
  session: VerifiedAdminSession,
  discordConfig: CraftingDiscordUpdateConfig,
): Promise<{ ok: true; requestId: string }> {
  const requestId = parseRequestId((objectValue(data, "Request is invalid.")).requestId);
  const now = Date.now();
  const currentRequest = await readCraftingRequestRecord(requestId);
  const isRequester = currentRequest
    ? isCraftingRequester(currentRequest, session)
    : false;
  if (
    !currentRequest ||
    currentRequest.status !== "in_progress" ||
    (!isRequester && !isCraftingAdmin(session))
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Request cannot be moved back to open by this session.",
    );
  }
  const nextRequest: CraftingRequestRecord = {
    ...currentRequest,
    status: "open",
    acceptedBy: null,
    updatedAt: now,
  };

  await updateRootWithRetry({
    [`craftingRequests/${requestId}`]: nextRequest,
    [`craftingRequestIndexes/open/${requestId}`]: dashboardRecordFromRequest(nextRequest),
    [`craftingRequestIndexes/inProgress/${requestId}`]: null,
  });
  try {
    await updateDiscordCraftingRequestMessage(nextRequest, discordConfig);
  } catch (error) {
    console.warn("Could not update reopened crafting request Discord message", error);
  }
  return { ok: true, requestId };
}
