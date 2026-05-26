import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { runRefreshFCCollectionMember } from "./refresh-fc-collection";
import { runRefreshFFLogsMember } from "./refresh-fflogs";
import { runRefreshTomestoneRaidStatsMember } from "./refresh-tomestone-raid-stats";
import { fetchLodestoneCharacter } from "./scrape-lodestone";
import {
  memberSyncError,
  memberSyncSuccess,
  type MemberSyncSource,
} from "./member-sync-status";

export interface MemberSourceSecrets {
  fflogsClientId: string;
  fflogsClientSecret: string;
  tomestoneBearerToken: string;
}

export interface MemberSourceResult {
  ok: true;
  lodestoneId: string;
  source: MemberSyncSource;
  status: "success";
  message: string;
  details?: Record<string, unknown>;
}

interface RefreshMemberSourceRequest {
  lodestoneId?: unknown;
  source?: unknown;
}

const SOURCES = new Set<MemberSyncSource>(["lodestone", "collection", "tomestone", "fflogs"]);

function parseRequest(data: RefreshMemberSourceRequest): { lodestoneId: string; source: MemberSyncSource } {
  const lodestoneId = String(data.lodestoneId ?? "").trim();
  if (!/^\d{4,12}$/.test(lodestoneId)) {
    throw new HttpsError("invalid-argument", "A valid Lodestone ID is required.");
  }

  const source = String(data.source ?? "").trim() as MemberSyncSource;
  if (!SOURCES.has(source)) {
    throw new HttpsError("invalid-argument", "A valid source is required.");
  }

  return { lodestoneId, source };
}

async function refreshLodestoneMember(lodestoneId: string): Promise<Record<string, unknown>> {
  const character = await fetchLodestoneCharacter(lodestoneId);
  if (!character) throw new Error("Lodestone character was not found.");

  const now = Date.now();
  const updates: Record<string, unknown> = {
    membersLastUpdated: now,
  };
  if (character.name) updates[`members/${lodestoneId}/name`] = character.name;
  if (character.server) updates[`members/${lodestoneId}/server`] = character.server;
  if (character.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = character.avatarUrl;
  if (Object.keys(character.jobLevels).length > 0) {
    updates[`members/${lodestoneId}/jobLevels`] = character.jobLevels;
    updates[`members/${lodestoneId}/jobLevelsLastFetched`] = now;
  }

  await admin.database().ref("/").update(updates);
  return {
    name: character.name,
    server: character.server,
    jobLevels: Object.keys(character.jobLevels).length,
  };
}

async function runSource(
  source: MemberSyncSource,
  lodestoneId: string,
  secrets: MemberSourceSecrets,
): Promise<Record<string, unknown> | undefined> {
  if (source === "lodestone") return refreshLodestoneMember(lodestoneId);
  if (source === "collection") {
    await runRefreshFCCollectionMember(lodestoneId);
    return undefined;
  }
  if (source === "tomestone") {
    await runRefreshTomestoneRaidStatsMember(secrets.tomestoneBearerToken, lodestoneId);
    return undefined;
  }

  await runRefreshFFLogsMember(secrets.fflogsClientId, secrets.fflogsClientSecret, lodestoneId);
  return undefined;
}

async function assertRefreshableMember(lodestoneId: string): Promise<void> {
  const db = admin.database();
  const [memberSnap, exclusionSnap] = await Promise.all([
    db.ref(`members/${lodestoneId}`).get(),
    db.ref(`memberExclusions/${lodestoneId}`).get(),
  ]);

  if (!memberSnap.exists()) {
    throw new HttpsError("not-found", `No tracked member found for ${lodestoneId}.`);
  }
  if (exclusionSnap.exists()) {
    throw new HttpsError("failed-precondition", `Member ${lodestoneId} is excluded from automatic tracking.`);
  }
}

export async function refreshMemberSourceForAdmin(
  data: RefreshMemberSourceRequest,
  secrets: MemberSourceSecrets,
): Promise<MemberSourceResult> {
  const { lodestoneId, source } = parseRequest(data);
  return refreshMemberSource(lodestoneId, source, secrets);
}

export async function refreshMemberSource(
  lodestoneId: string,
  source: MemberSyncSource,
  secrets: MemberSourceSecrets,
): Promise<MemberSourceResult> {
  const now = Date.now();
  const statusPath = `memberSyncStatus/${lodestoneId}/${source}`;
  const db = admin.database();
  await assertRefreshableMember(lodestoneId);

  try {
    const details = await runSource(source, lodestoneId, secrets);
    const finishedAt = Date.now();
    const message = `${source} refreshed.`;
    await db.ref(statusPath).set(memberSyncSuccess(source, now, finishedAt, message, details));

    return {
      ok: true,
      lodestoneId,
      source,
      status: "success",
      message,
      ...(details ? { details } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error.";
    await db.ref(statusPath).set(memberSyncError(now, message));

    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unavailable", message);
  }
}
