import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { runRefreshFFLogs } from "./refresh-fflogs";
import { runRefreshFCCollection } from "./refresh-fc-collection";
import { runScrapeLodestone } from "./scrape-lodestone";
import { handleDiscordInteraction } from "./discord/interactions";

admin.initializeApp();

const fflogsClientId = defineSecret("FFLOGS_CLIENT_ID");
const fflogsClientSecret = defineSecret("FFLOGS_CLIENT_SECRET");
const discordPublicKey = defineSecret("DISCORD_PUBLIC_KEY");

// Runs every 3 hours: fetches guild rankings from FFLogs and writes to /raidStats.
export const refreshFFLogs = onSchedule(
  { schedule: "0 */3 * * *", secrets: [fflogsClientId, fflogsClientSecret], timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
  },
);

export const triggerFFLogsRefresh = onCall(
  { secrets: [fflogsClientId, fflogsClientSecret], timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
    return { ok: true };
  },
);

export const importLodestoneMembers = onCall(
  { timeoutSeconds: 300, region: "us-central1" },
  async () => {
    const result = await runScrapeLodestone();
    return result;
  },
);

// Runs every 3 hours: fetches ffxivcollect data and writes to /fcCollection.
export const refreshFCCollection = onSchedule(
  { schedule: "0 */3 * * *", timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFCCollection();
  },
);

export const triggerFCCollectionRefresh = onCall(
  { timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFCCollection();
    return { ok: true };
  },
);

export const discordInteractions = onRequest(
  { secrets: [discordPublicKey], timeoutSeconds: 15, region: "us-central1" },
  async (req, res) => {
    await handleDiscordInteraction(req, res, discordPublicKey.value());
  },
);
