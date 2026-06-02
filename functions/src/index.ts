import "./firebase-admin-emulator";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { runRefreshFFLogs } from "./refresh-fflogs";
import { runRefreshFCCollection } from "./refresh-fc-collection";
import { runScrapeLodestone } from "./scrape-lodestone";
import { handleDiscordInteraction } from "./discord/interactions";
import { deleteTrackedMember, upsertTrackedMember } from "./delete-member";
import {
  acceptCraftingRequestForMember,
  closeCraftingRequestForMember,
  completeCraftingRequestForMember,
  createCraftingRequestForMember,
  reopenCraftingRequestForMember,
} from "./crafting-requests";
import { processQueuedFriendRefreshJobs } from "./friend-refresh";
import { refreshMemberSourceForAdmin } from "./member-source-refresh";
import {
  approveCalendarEventRequest as approveEventRequest,
  createRaidHelperEventForAdmin,
  denyCalendarEventRequest as denyEventRequest,
  listCalendarEventRequests as listEventRequests,
  runSyncDiscordPlannerEvents,
  submitCalendarEventRequest as submitEventRequest,
} from "./sync-discord-planner-events";
import {
  fetchTomestoneProgressionGraph,
  runRefreshTomestoneRaidStats,
} from "./refresh-tomestone-raid-stats";
import {
  finishDiscordAdminOAuth,
  getAdminSession as getAdminSessionForToken,
  hasAnyRole,
  logoutAdminSession as logoutAdminSessionForToken,
  parseRoleIds,
  requireAdminSession,
  requireMemberSession,
  startDiscordAdminOAuth as startDiscordOAuth,
} from "./admin-auth";
import {
  deleteEasterParticipantAdmin as deleteEasterParticipant,
  updateOwnMemberProfile as updateOwnProfile,
  updateMemberProfileAdmin as updateMemberProfile,
  upsertEasterParticipantAdmin as upsertEasterParticipant,
} from "./admin-mutations";

const DEFAULT_DATABASE_URL =
  "https://fat-cat-cartel-default-rtdb.asia-southeast1.firebasedatabase.app";

admin.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

const fflogsClientId = defineSecret("FFLOGS_CLIENT_ID");
const fflogsClientSecret = defineSecret("FFLOGS_CLIENT_SECRET");
const tomestoneBearerToken = defineSecret("TOMESTONE_BEARER_TOKEN");
const discordPublicKey = defineSecret("DISCORD_PUBLIC_KEY");
const discordClientId = defineSecret("DISCORD_CLIENT_ID");
const discordClientSecret = defineSecret("DISCORD_CLIENT_SECRET");
const discordRedirectUri = defineSecret("DISCORD_REDIRECT_URI");
const discordGuildId = defineSecret("DISCORD_GUILD_ID");
const discordAdminRoleIds = defineSecret("DISCORD_ADMIN_ROLE_IDS");
const discordMemberRoleIds = defineSecret("DISCORD_MEMBER_ROLE_IDS");
const discordHousecatRoleId = defineSecret("DISCORD_HOUSECAT_ROLE_ID");
const discordBotToken = defineSecret("DISCORD_BOT_TOKEN");
const discordEventChannelId = defineSecret("DISCORD_EVENT_CHANNEL_ID");
const discordDonChannelId = defineSecret("DISCORD_DON_CHANNEL_ID");
const raidHelperApiKey = defineSecret("RAID_HELPER_API_KEY");
const raidHelperTemplateId = defineSecret("RAID_HELPER_TEMPLATE_ID");
const adminAppOrigin = defineString("ADMIN_APP_ORIGIN");
const raidHelperFallbackLeaderId = defineString(
  "RAID_HELPER_FALLBACK_LEADER_ID",
  {
    default: "",
  },
);

function adminAuthConfig() {
  return {
    guildId: discordGuildId.value(),
    adminRoleIds: discordAdminRoleIds.value(),
    memberRoleIds: discordMemberRoleIds.value(),
    botToken: discordBotToken.value(),
  };
}

function adminAuthConfigWithHousecat() {
  return {
    ...adminAuthConfig(),
    housecatRoleId: discordHousecatRoleId.value(),
  };
}

function discordOAuthConfig() {
  return {
    ...adminAuthConfig(),
    clientId: discordClientId.value(),
    clientSecret: discordClientSecret.value(),
    redirectUri: discordRedirectUri.value(),
    appOrigin: adminAppOrigin.value(),
  };
}

function discordPlannerConfig() {
  return {
    apiKey: raidHelperApiKey.value(),
    guildId: discordGuildId.value(),
    channelId: discordEventChannelId.value(),
  };
}

function raidHelperCreateConfig() {
  return {
    ...discordPlannerConfig(),
    templateId: raidHelperTemplateId.value(),
    fallbackLeaderId: raidHelperFallbackLeaderId.value(),
    discordBotToken: discordBotToken.value(),
  };
}

function eventRequestNotificationConfig() {
  return {
    discordBotToken: discordBotToken.value(),
    donChannelId: discordDonChannelId.value(),
  };
}

function craftingRequestDiscordConfig() {
  return {
    botToken: discordBotToken.value(),
    channelId: discordDonChannelId.value(),
    guildId: discordGuildId.value(),
    appOrigin: adminAppOrigin.value(),
  };
}

function craftingRequestDiscordUpdateConfig() {
  return {
    botToken: discordBotToken.value(),
    appOrigin: adminAppOrigin.value(),
  };
}

// Runs daily: fetches historical parse rankings from FFLogs and writes parse data to /raidStats.
export const refreshFFLogs = onSchedule(
  {
    schedule: "0 11 * * *",
    secrets: [fflogsClientId, fflogsClientSecret],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
  },
);

export const triggerFFLogsRefresh = onCall(
  {
    secrets: [
      fflogsClientId,
      fflogsClientSecret,
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
    return { ok: true };
  },
);

export const deleteMember = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 120,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return deleteTrackedMember(request.data);
  },
);

export const upsertMember = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return upsertTrackedMember(request.data);
  },
);

export const refreshMemberSource = onCall(
  {
    cors: true,
    secrets: [
      fflogsClientId,
      fflogsClientSecret,
      tomestoneBearerToken,
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 180,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return refreshMemberSourceForAdmin(request.data, {
      fflogsClientId: fflogsClientId.value(),
      fflogsClientSecret: fflogsClientSecret.value(),
      tomestoneBearerToken: tomestoneBearerToken.value(),
    });
  },
);

// Runs hourly: fetches tracked character raid activity from Tomestone and writes to /raidStats.
export const refreshTomestoneRaidStats = onSchedule(
  {
    schedule: "0 * * * *",
    secrets: [tomestoneBearerToken],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async () => {
    await runRefreshTomestoneRaidStats(tomestoneBearerToken.value());
  },
);

export const triggerTomestoneRaidStatsRefresh = onCall(
  {
    secrets: [
      tomestoneBearerToken,
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    await runRefreshTomestoneRaidStats(tomestoneBearerToken.value());
    return { ok: true };
  },
);

export const getTomestoneProgressionGraph = onCall(
  {
    secrets: [tomestoneBearerToken],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    try {
      return await fetchTomestoneProgressionGraph(
        tomestoneBearerToken.value(),
        request.data,
      );
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "unavailable",
        error instanceof Error
          ? error.message
          : "Failed to fetch Tomestone progression graph.",
      );
    }
  },
);

export const importLodestoneMembers = onCall(
  {
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    const result = await runScrapeLodestone();
    return result;
  },
);

export const refreshFriendSignup = onSchedule(
  {
    schedule: "*/5 * * * *",
    secrets: [fflogsClientId, fflogsClientSecret, tomestoneBearerToken],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async () => {
    await processQueuedFriendRefreshJobs({
      fflogsClientId: fflogsClientId.value(),
      fflogsClientSecret: fflogsClientSecret.value(),
      tomestoneBearerToken: tomestoneBearerToken.value(),
    });
  },
);

// Runs every 3 hours: fetches ffxivcollect data and writes to /fcCollection.
export const refreshFCCollection = onSchedule(
  { schedule: "0 */3 * * *", timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFCCollection();
  },
);

export const syncDiscordPlannerEvents = onSchedule(
  {
    schedule: "0 * * * *",
    secrets: [discordGuildId, discordEventChannelId, raidHelperApiKey],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async () => {
    await runSyncDiscordPlannerEvents(discordPlannerConfig());
  },
);

export const triggerDiscordPlannerSync = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
      discordEventChannelId,
      raidHelperApiKey,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return runSyncDiscordPlannerEvents(discordPlannerConfig());
  },
);

export const createRaidHelperEvent = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
      discordEventChannelId,
      raidHelperApiKey,
      raidHelperTemplateId,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireAdminSession(request.data, adminAuthConfig());
    return createRaidHelperEventForAdmin(
      request.data,
      session.discordUserId,
      raidHelperCreateConfig(),
    );
  },
);

export const submitCalendarEventRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordHousecatRoleId,
      discordBotToken,
      discordDonChannelId,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithHousecat(),
    );
    if (
      !hasAnyRole(session.roleIds, parseRoleIds(discordHousecatRoleId.value()))
    ) {
      throw new HttpsError(
        "permission-denied",
        "Housecat Discord role required.",
      );
    }
    return submitEventRequest(
      request.data,
      {
        discordUserId: session.discordUserId,
        lodestoneId: session.lodestoneId,
        characterName: session.characterName,
        fcRank: session.fcRank,
        avatarUrl: session.avatarUrl ?? null,
      },
      eventRequestNotificationConfig(),
    );
  },
);

export const listCalendarEventRequests = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return listEventRequests();
  },
);

export const approveCalendarEventRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
      discordEventChannelId,
      raidHelperApiKey,
      raidHelperTemplateId,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return approveEventRequest(request.data, raidHelperCreateConfig());
  },
);

export const denyCalendarEventRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return denyEventRequest(request.data, {
      discordBotToken: discordBotToken.value(),
    });
  },
);

export const triggerFCCollectionRefresh = onCall(
  {
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    await runRefreshFCCollection();
    return { ok: true };
  },
);

export const startDiscordAdminOAuth = onRequest(
  {
    secrets: [
      discordClientId,
      discordClientSecret,
      discordRedirectUri,
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (req, res) => {
    await startDiscordOAuth(discordOAuthConfig(), req, res);
  },
);

export const discordAdminOAuthCallback = onRequest(
  {
    secrets: [
      discordClientId,
      discordClientSecret,
      discordRedirectUri,
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (req, res) => {
    await finishDiscordAdminOAuth(discordOAuthConfig(), req, res);
  },
);

export const getAdminSession = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordHousecatRoleId,
      discordBotToken,
    ],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) =>
    getAdminSessionForToken(request.data, adminAuthConfigWithHousecat()),
);

export const logoutAdminSession = onCall(
  { cors: true, timeoutSeconds: 30, region: "us-central1" },
  async (request) => logoutAdminSessionForToken(request.data),
);

export const updateMemberProfileAdmin = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return updateMemberProfile(request.data);
  },
);

export const updateOwnMemberProfile = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return updateOwnProfile(request.data, session.lodestoneId);
  },
);

export const createCraftingRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
      discordDonChannelId,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return createCraftingRequestForMember(
      request.data,
      session,
      craftingRequestDiscordConfig(),
    );
  },
);

export const acceptCraftingRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return acceptCraftingRequestForMember(
      request.data,
      session,
      craftingRequestDiscordUpdateConfig(),
    );
  },
);

export const completeCraftingRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return completeCraftingRequestForMember(
      request.data,
      session,
      craftingRequestDiscordUpdateConfig(),
    );
  },
);

export const closeCraftingRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return closeCraftingRequestForMember(
      request.data,
      session,
      craftingRequestDiscordUpdateConfig(),
    );
  },
);

export const reopenCraftingRequest = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(request.data, adminAuthConfig());
    return reopenCraftingRequestForMember(
      request.data,
      session,
      craftingRequestDiscordUpdateConfig(),
    );
  },
);

export const upsertEasterParticipantAdmin = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return upsertEasterParticipant(request.data);
  },
);

export const deleteEasterParticipantAdmin = onCall(
  {
    cors: true,
    secrets: [
      discordGuildId,
      discordAdminRoleIds,
      discordMemberRoleIds,
      discordBotToken,
    ],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return deleteEasterParticipant(request.data);
  },
);

export const discordInteractions = onRequest(
  { secrets: [discordPublicKey], timeoutSeconds: 15, region: "us-central1" },
  async (req, res) => {
    await handleDiscordInteraction(req, res, discordPublicKey.value());
  },
);
