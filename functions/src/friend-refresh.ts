import * as admin from "firebase-admin";
import {
  refreshMemberSource,
} from "./member-source-refresh";
import type { MemberSyncSource } from "./member-sync-status";

interface FriendRefreshJob {
  lodestoneId?: unknown;
  discordUserId?: unknown;
}

async function runSource(
  source: MemberSyncSource,
  lodestoneId: string,
  secrets: {
    fflogsClientId: string;
    fflogsClientSecret: string;
    tomestoneBearerToken: string;
  },
): Promise<{ source: string; ok: boolean; message?: string }> {
  try {
    const result = await refreshMemberSource(lodestoneId, source, secrets);
    return { source, ok: true, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[friend-refresh] ${source} failed: ${message}`);
    return { source, ok: false, message };
  }
}

export async function processFriendRefreshJob(
  jobId: string,
  job: FriendRefreshJob,
  secrets: {
    fflogsClientId: string;
    fflogsClientSecret: string;
    tomestoneBearerToken: string;
  },
): Promise<void> {
  const lodestoneId = String(job.lodestoneId ?? "").trim();
  if (!/^\d{4,12}$/.test(lodestoneId)) {
    await admin.database().ref(`friendRefreshQueue/${jobId}`).update({
      status: "error",
      finishedAt: Date.now(),
      error: "Invalid Lodestone ID.",
    });
    return;
  }

  const db = admin.database();
  const now = Date.now();
  await db.ref(`friendRefreshQueue/${jobId}`).update({
    status: "running",
    startedAt: now,
  });

  const results = await Promise.all([
    runSource("lodestone", lodestoneId, secrets),
    runSource("collection", lodestoneId, secrets),
    runSource("tomestone", lodestoneId, secrets),
    runSource("fflogs", lodestoneId, secrets),
  ]);

  const failures = results.filter((result) => !result.ok);
  await db.ref(`friendRefreshQueue/${jobId}`).update({
    status: failures.length > 0 ? "error" : "done",
    finishedAt: Date.now(),
    results,
  });
}

export async function processQueuedFriendRefreshJobs(
  secrets: {
    fflogsClientId: string;
    fflogsClientSecret: string;
    tomestoneBearerToken: string;
  },
): Promise<void> {
  const queueSnap = await admin.database()
    .ref("friendRefreshQueue")
    .orderByChild("status")
    .equalTo("queued")
    .limitToFirst(5)
    .get();
  const jobs = (queueSnap.val() ?? {}) as Record<string, FriendRefreshJob>;

  for (const [jobId, job] of Object.entries(jobs)) {
    await processFriendRefreshJob(jobId, job, secrets);
  }
}
