import "./firebase-admin-emulator";
import { onValueCreated } from "firebase-functions/v2/database";
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
import { processFriendRefreshJob } from "./friend-refresh";
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
  runRefreshDmuProgress,
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
import {
  calculateMeowketProfitForAdmin,
  searchMeowketItemsForAdmin,
} from "./meowket-board";
import { runSendBirthdayWishes } from "./birthday-notifications";
import {
  deleteGameServerAccessForAdmin,
  getGameServerSettingsForAdmin,
  getGameServerStatusForSession,
  listGameServerAuditLogForSession,
  listGameServerAuditLogForAdmin,
  listGameServerAccessForAdmin,
  listGameServersForSession,
  parsePort,
  requireGameServerAccess,
  runAutoStopIdleGameServers,
  startGameServerForSession,
  stopGameServerForSession,
  updateGameServerSettingsForAdmin,
  upsertGameServerAccessForAdmin,
} from "./game-servers";

const DEFAULT_DATABASE_URL =
  "https://fat-cat-cartel-default-rtdb.asia-southeast1.firebasedatabase.app";

admin.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_URL ?? DEFAULT_DATABASE_URL,
});

const fflogsClientId = defineString("FFLOGS_CLIENT_ID");
const fflogsClientSecret = defineSecret("FFLOGS_CLIENT_SECRET");
const tomestoneBearerToken = defineSecret("TOMESTONE_BEARER_TOKEN");
const dmuProggers = defineString("DMU_PROGGERS", { default: "" });
const discordPublicKey = defineString("DISCORD_PUBLIC_KEY");
const discordClientId = defineString("DISCORD_CLIENT_ID");
const discordClientSecret = defineSecret("DISCORD_CLIENT_SECRET");
const discordRedirectUri = defineString("DISCORD_REDIRECT_URI");
const discordGuildId = defineString("DISCORD_GUILD_ID");
const discordAdminRoleIds = defineString("DISCORD_ADMIN_ROLE_IDS");
const discordMemberRoleId = defineString("DISCORD_MEMBER_ROLE_ID");
const discordMemberRoleIds = defineString("DISCORD_MEMBER_ROLE_IDS");
const discordHousecatRoleId = defineString("DISCORD_HOUSECAT_ROLE_ID");
const discordBotToken = defineSecret("DISCORD_BOT_TOKEN");
const discordEventChannelId = defineString("DISCORD_EVENT_CHANNEL_ID");
const discordDonChannelId = defineString("DISCORD_DON_CHANNEL_ID");
const discordGeneralChannelId = defineString("DISCORD_GENERAL_CHANNEL_ID");
const raidHelperApiKey = defineSecret("RAID_HELPER_API_KEY");
const raidHelperTemplateId = defineString("RAID_HELPER_TEMPLATE_ID");
const adminAppOrigin = defineString("ADMIN_APP_ORIGIN");
const awsRegion = defineString("AWS_REGION", { default: "ap-southeast-2" });
const palworldInstanceId = defineString("PALWORLD_INSTANCE_ID");
const palworldGamePort = defineString("PALWORLD_GAME_PORT", { default: "8211" });
const palworldQueryPort = defineString("PALWORLD_QUERY_PORT", { default: "27015" });
const palworldCloudWatchNamespace = defineString("PALWORLD_CLOUDWATCH_NAMESPACE", {
  default: "CWAgent",
});
const awsAccessKeyId = defineSecret("AWS_ACCESS_KEY_ID");
const awsSecretAccessKey = defineSecret("AWS_SECRET_ACCESS_KEY");
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

function adminAuthConfigWithSingleMemberRole() {
  return {
    ...adminAuthConfig(),
    memberRoleIds: [
      discordMemberRoleIds.value(),
      discordMemberRoleId.value(),
    ]
      .filter(Boolean)
      .join(","),
  };
}

function adminAuthConfigWithHousecat() {
  return {
    ...adminAuthConfig(),
    housecatRoleId: discordHousecatRoleId.value(),
  };
}

function adminAuthConfigWithSingleMemberRoleAndHousecat() {
  return {
    ...adminAuthConfigWithSingleMemberRole(),
    housecatRoleId: discordHousecatRoleId.value(),
  };
}

function discordOAuthConfig() {
  return {
    ...adminAuthConfigWithSingleMemberRole(),
    clientId: discordClientId.value(),
    clientSecret: discordClientSecret.value(),
    redirectUri: discordRedirectUri.value(),
    appOrigin: adminAppOrigin.value(),
  };
}

function discordOAuthStartConfig() {
  return {
    clientId: discordClientId.value(),
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

function birthdayNotificationConfig() {
  return {
    botToken: discordBotToken.value(),
    channelId: discordGeneralChannelId.value(),
  };
}

function gameServerAwsConfig() {
  return {
    region: awsRegion.value(),
    instanceId: palworldInstanceId.value(),
    accessKeyId: awsAccessKeyId.value(),
    secretAccessKey: awsSecretAccessKey.value(),
    gamePort: parsePort(palworldGamePort.value(), 8211),
    queryPort: parsePort(palworldQueryPort.value(), 27015),
    cloudWatchNamespace: palworldCloudWatchNamespace.value() || "CWAgent",
  };
}

// Runs daily: fetches historical parse rankings from FFLogs and writes parse data to /raidStats.
export const refreshFFLogs = onSchedule(
  {
    schedule: "0 11 * * *",
    secrets: [fflogsClientSecret],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
  },
);

export const triggerFFLogsRefresh = onCall(
  {
    secrets: [fflogsClientSecret, discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [fflogsClientSecret, tomestoneBearerToken, discordBotToken],
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

export const triggerTomestoneRaidStatsRefresh = onCall(
  {
    secrets: [tomestoneBearerToken, discordBotToken],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    await runRefreshTomestoneRaidStats(tomestoneBearerToken.value());
    return { ok: true };
  },
);

export const triggerDmuProgressRefresh = onCall(
  {
    secrets: [tomestoneBearerToken, discordBotToken],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    const sourceStatus = await runRefreshDmuProgress(
      tomestoneBearerToken.value(),
      dmuProggers.value(),
    );
    return { ok: true, sourceStatus };
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
    secrets: [discordBotToken],
    timeoutSeconds: 300,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    const result = await runScrapeLodestone();
    return result;
  },
);

export const refreshFriendSignup = onValueCreated(
  {
    ref: "/friendRefreshQueue/{jobId}",
    instance: "fat-cat-cartel-default-rtdb",
    secrets: [fflogsClientSecret, tomestoneBearerToken],
    timeoutSeconds: 300,
    region: "asia-southeast1",
  },
  async (event) => {
    const job = event.data.val();
    if (!job || typeof job !== "object") {
      await event.data.ref.update({
        status: "error",
        finishedAt: Date.now(),
        error: "Invalid friend refresh job.",
      });
      return;
    }

    const status = (job as { status?: unknown }).status;
    if (status === "running" || status === "done" || status === "error") {
      return;
    }
    if (status !== "queued") {
      await event.data.ref.update({
        status: "error",
        finishedAt: Date.now(),
        error: "Invalid friend refresh job status.",
      });
      return;
    }

    await processFriendRefreshJob(event.params.jobId, job, {
      fflogsClientId: fflogsClientId.value(),
      fflogsClientSecret: fflogsClientSecret.value(),
      tomestoneBearerToken: tomestoneBearerToken.value(),
    });
  },
);

export const sendBirthdayWishes = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Australia/Sydney",
    secrets: [discordBotToken],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async () => {
    await runSendBirthdayWishes(birthdayNotificationConfig());
  },
);

export const dailyMaintenance = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Australia/Sydney",
    secrets: [tomestoneBearerToken, raidHelperApiKey],
    timeoutSeconds: 540,
    region: "us-central1",
  },
  async () => {
    const jobs = [
      {
        name: "refreshTomestoneRaidStats",
        run: () => runRefreshTomestoneRaidStats(tomestoneBearerToken.value()),
      },
      { name: "refreshFCCollection", run: () => runRefreshFCCollection() },
      {
        name: "syncDiscordPlannerEvents",
        run: () => runSyncDiscordPlannerEvents(discordPlannerConfig()),
      },
    ];
    const results = await Promise.allSettled(jobs.map((job) => job.run()));

    results.forEach((result, index) => {
      const name = jobs[index].name;
      if (result.status === "fulfilled") {
        console.log(`[dailyMaintenance] ${name} completed`);
      } else {
        console.error(`[dailyMaintenance] ${name} failed`, result.reason);
      }
    });
  },
);

export const triggerDiscordPlannerSync = onCall(
  {
    cors: true,
    secrets: [discordBotToken, raidHelperApiKey],
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
    secrets: [discordBotToken, raidHelperApiKey],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken, raidHelperApiKey],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (req, res) => {
    await startDiscordOAuth(discordOAuthStartConfig(), req, res);
  },
);

export const discordAdminOAuthCallback = onRequest(
  {
    secrets: [discordClientSecret, discordBotToken],
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
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) =>
    getAdminSessionForToken(
      request.data,
      adminAuthConfigWithSingleMemberRoleAndHousecat(),
    ),
);

export const searchMeowketItems = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    return searchMeowketItemsForAdmin(request.data);
  },
);

export const calculateMeowketProfit = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    return calculateMeowketProfitForAdmin(request.data);
  },
);

export const logoutAdminSession = onCall(
  { cors: true, timeoutSeconds: 30, region: "us-central1" },
  async (request) => logoutAdminSessionForToken(request.data),
);

export const getGameServers = onCall(
  {
    cors: true,
    secrets: [discordBotToken, awsAccessKeyId, awsSecretAccessKey],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    const accessSession = await requireGameServerAccess(session);
    return listGameServersForSession(accessSession, gameServerAwsConfig());
  },
);

export const getGameServerStatus = onCall(
  {
    cors: true,
    secrets: [discordBotToken, awsAccessKeyId, awsSecretAccessKey],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    const accessSession = await requireGameServerAccess(session);
    return getGameServerStatusForSession(
      request.data,
      accessSession,
      gameServerAwsConfig(),
    );
  },
);

export const startGameServer = onCall(
  {
    cors: true,
    secrets: [discordBotToken, awsAccessKeyId, awsSecretAccessKey],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    const accessSession = await requireGameServerAccess(session);
    return startGameServerForSession(
      request.data,
      accessSession,
      gameServerAwsConfig(),
    );
  },
);

export const stopGameServer = onCall(
  {
    cors: true,
    secrets: [discordBotToken, awsAccessKeyId, awsSecretAccessKey],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    const accessSession = await requireGameServerAccess(session);
    return stopGameServerForSession(
      request.data,
      accessSession,
      gameServerAwsConfig(),
    );
  },
);

export const listGameServerEvents = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireMemberSession(
      request.data,
      adminAuthConfigWithSingleMemberRole(),
    );
    const accessSession = await requireGameServerAccess(session);
    return listGameServerAuditLogForSession(request.data, accessSession);
  },
);

export const autoStopIdleGameServers = onSchedule(
  {
    schedule: "*/10 * * * *",
    secrets: [awsAccessKeyId, awsSecretAccessKey],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async () => {
    await runAutoStopIdleGameServers(gameServerAwsConfig());
  },
);

export const getGameServerSettings = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return getGameServerSettingsForAdmin();
  },
);

export const updateGameServerSettings = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireAdminSession(request.data, adminAuthConfig());
    return updateGameServerSettingsForAdmin(request.data, session);
  },
);

export const listGameServerAccess = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return listGameServerAccessForAdmin();
  },
);

export const upsertGameServerAccess = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    const session = await requireAdminSession(request.data, adminAuthConfig());
    return upsertGameServerAccessForAdmin(request.data, session);
  },
);

export const deleteGameServerAccess = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return deleteGameServerAccessForAdmin(request.data);
  },
);

export const listGameServerAuditLog = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
    timeoutSeconds: 30,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return listGameServerAuditLogForAdmin(request.data);
  },
);

export const updateMemberProfileAdmin = onCall(
  {
    cors: true,
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
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
    secrets: [discordBotToken],
    timeoutSeconds: 60,
    region: "us-central1",
  },
  async (request) => {
    await requireAdminSession(request.data, adminAuthConfig());
    return deleteEasterParticipant(request.data);
  },
);

export const discordInteractions = onRequest(
  {
    secrets: [discordBotToken],
    timeoutSeconds: 120,
    region: "us-central1",
  },
  async (req, res) => {
    await handleDiscordInteraction(req, res, discordPublicKey.value(), {
      adminRoleIds: discordAdminRoleIds.value(),
      botToken: discordBotToken.value(),
    });
  },
);
