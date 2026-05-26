import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { ZONES } from "./zones";

interface DeleteMemberRequest {
  lodestoneId?: unknown;
  name?: unknown;
}

interface UpsertMemberRequest {
  lodestoneId?: unknown;
  name?: unknown;
}

interface ParseData {
  percentile: number;
  rdps: number;
  job: string;
}

interface ParseEntry {
  savage?: Partial<Record<string, ParseData>>;
  normal?: Partial<Record<string, ParseData>>;
  allStars?: unknown;
}

interface ParseBuckets {
  grey: number;
  green: number;
  blue: number;
  purple: number;
  orange: number;
  pink: number;
  gold: number;
}

interface TomestoneActivity {
  lodestoneId?: string;
}

function percentileBucket(p: number): keyof ParseBuckets {
  if (p >= 100) return "gold";
  if (p >= 99) return "pink";
  if (p >= 95) return "orange";
  if (p >= 75) return "purple";
  if (p >= 50) return "blue";
  if (p >= 25) return "green";
  return "grey";
}

function emptyBuckets(): ParseBuckets {
  return { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 };
}

function recomputeHistogram(
  zone: (typeof ZONES)[number],
  parses: Record<string, ParseEntry>,
): Record<string, { savage: ParseBuckets; normal: ParseBuckets }> {
  const histogram: Record<string, { savage: ParseBuckets; normal: ParseBuckets }> = {};
  for (const encounter of zone.encounters) {
    histogram[encounter.key] = { savage: emptyBuckets(), normal: emptyBuckets() };
  }

  for (const member of Object.values(parses)) {
    for (const [key, parse] of Object.entries(member.savage ?? {})) {
      if (parse && histogram[key]) histogram[key].savage[percentileBucket(parse.percentile)]++;
    }
    for (const [key, parse] of Object.entries(member.normal ?? {})) {
      if (parse && histogram[key]) histogram[key].normal[percentileBucket(parse.percentile)]++;
    }
  }

  return histogram;
}

function parseDeleteMemberRequest(data: DeleteMemberRequest): { lodestoneId: string; name: string | null } {
  const lodestoneId = String(data.lodestoneId ?? "").trim();
  if (!/^\d{4,12}$/.test(lodestoneId)) {
    throw new HttpsError("invalid-argument", "A valid Lodestone ID is required.");
  }

  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : null;
  return { lodestoneId, name };
}

export async function deleteTrackedMember(data: DeleteMemberRequest): Promise<{ ok: true }> {
  const { lodestoneId, name } = parseDeleteMemberRequest(data);
  const db = admin.database();
  const now = Date.now();
  const memberSnap = await db.ref(`members/${lodestoneId}`).get();
  const member = memberSnap.val() as { name?: string } | null;
  const displayName = name ?? member?.name ?? lodestoneId;

  const updates: Record<string, unknown> = {
    [`members/${lodestoneId}`]: null,
    [`memberExclusions/${lodestoneId}`]: {
      name: displayName,
      deletedAt: now,
      deletedBy: "admin",
      reason: "admin_delete",
    },
    [`fcCollection/memberData/${lodestoneId}`]: null,
    [`memberActivity/${lodestoneId}`]: null,
    [`memberProgressionGraphs/${lodestoneId}`]: null,
    membersLastUpdated: now,
    "raidStats/lastUpdated": now,
  };

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    const [parsesSnap, recentSnap] = await Promise.all([
      db.ref(`${prefix}/parses`).get(),
      db.ref(`${prefix}/recentActivity`).get(),
    ]);
    const parses = (parsesSnap.val() ?? {}) as Record<string, ParseEntry>;
    delete parses[lodestoneId];
    const recent = ((recentSnap.val() ?? []) as TomestoneActivity[]).filter(
      (activity) => activity.lodestoneId !== lodestoneId,
    );

    updates[`${prefix}/parses/${lodestoneId}`] = null;
    updates[`${prefix}/members/${lodestoneId}`] = null;
    updates[`${prefix}/histogram`] = recomputeHistogram(zone, parses);
    updates[`${prefix}/recentActivity`] = recent;
    updates[`${prefix}/lastUpdated`] = now;
  }

  await db.ref("/").update(updates);
  return { ok: true };
}

export async function upsertTrackedMember(data: UpsertMemberRequest): Promise<{ ok: true }> {
  const { lodestoneId, name } = parseDeleteMemberRequest(data);
  if (!name) {
    throw new HttpsError("invalid-argument", "Character name is required.");
  }

  const now = Date.now();
  await admin.database().ref("/").update({
    [`members/${lodestoneId}/name`]: name,
    [`members/${lodestoneId}/avatarUrl`]: null,
    [`memberExclusions/${lodestoneId}`]: null,
    membersLastUpdated: now,
  });
  return { ok: true };
}
