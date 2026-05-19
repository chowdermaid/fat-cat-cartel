import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { runRefreshFFLogs } from "./refresh-fflogs";
import { runRefreshFCCollection } from "./refresh-fc-collection";
import { runScrapeLodestone } from "./scrape-lodestone";

admin.initializeApp();

const fflogsClientId = defineSecret("FFLOGS_CLIENT_ID");
const fflogsClientSecret = defineSecret("FFLOGS_CLIENT_SECRET");

// Runs every hour — fetches guild rankings from FFLogs → writes to /raidStats/
export const refreshFFLogs = onSchedule(
  { schedule: "0 */3 * * *", secrets: [fflogsClientId, fflogsClientSecret], timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
  },
);

// Admin-triggered manual refresh — callable from the admin panel
export const triggerFFLogsRefresh = onCall(
  { secrets: [fflogsClientId, fflogsClientSecret], timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFFLogs(fflogsClientId.value(), fflogsClientSecret.value());
    return { ok: true };
  },
);

// Admin-triggered: scrapes Lodestone FC member list → populates fcCollection/members + portrait links
export const importLodestoneMembers = onCall(
  { timeoutSeconds: 120, region: "us-central1" },
  async () => {
    const result = await runScrapeLodestone();
    return result;
  },
);

// Runs daily at 06:00 UTC — fetches ffxivcollect data → writes to /fcCollection/cache
export const refreshFCCollection = onSchedule(
  { schedule: "0 */3 * * *", timeoutSeconds: 300, region: "us-central1" },
  async () => {
    await runRefreshFCCollection();
  },
);
