/**
 * One-time migration: converts /members from fflogsId-keyed entries to lodestoneId-keyed entries.
 *
 * Run via:
 *   npx ts-node --project tsconfig.json src/migrate-to-lodestone-keys.ts
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key, OR
 *   - Run inside a Firebase emulator with admin credentials configured.
 *
 * What it does:
 *   1. Reads all of /members
 *   2. For each entry that has a lodestoneId field (old schema: keyed by fflogsId), creates a new
 *      entry at /members/{lodestoneId} with fflogsId stored as a field, preserving name/server/avatarUrl.
 *   3. Deletes the old /members/{fflogsId} entries.
 *   4. For entries without lodestoneId (never Lodestone-linked), writes them under a
 *      fflogs-{fflogsId} key so data is not lost, and logs them for manual follow-up.
 *   5. Copies /fcCollection/members entries to /members/{lodestoneId} for any members not
 *      already present (handles the case where a member was in collection but not in FFLogs).
 *   6. Clears /fcCollection/members entirely (now redundant).
 *
 * Safe to run multiple times — uses lodestoneId as the idempotency key.
 */

import * as admin from "firebase-admin";

const databaseURL = process.env.FIREBASE_DATABASE_URL;
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!databaseURL) {
  console.error("[migrate] Set FIREBASE_DATABASE_URL=https://<project>.<region>.firebasedatabase.app");
  process.exit(1);
}
if (!serviceAccountPath) {
  console.error("[migrate] Set GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account.json>");
  console.error("  Download from: Firebase console > Project Settings > Service accounts > Generate new private key");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL,
});

interface OldMemberNode {
  name: string;
  server?: string;
  lodestoneId?: string | null;
  avatarUrl?: string | null;
}

interface NewMemberNode {
  name: string;
  server?: string;
  fflogsId?: string | null;
  avatarUrl?: string | null;
}

async function migrate(): Promise<void> {
  const db = admin.database();

  console.log("[migrate] Reading /members...");
  const membersSnap = await db.ref("members").get();
  const members = (membersSnap.val() ?? {}) as Record<string, OldMemberNode | NewMemberNode>;

  const updates: Record<string, unknown> = {};
  const orphaned: string[] = [];

  for (const [key, member] of Object.entries(members)) {
    const isOldSchema = "lodestoneId" in member && member.lodestoneId != null;
    const isNewSchema = "fflogsId" in member;

    if (isNewSchema) {
      console.log(`[migrate] ${key} already migrated — skip`);
      continue;
    }

    if (isOldSchema) {
      const old = member as OldMemberNode;
      const lodestoneId = old.lodestoneId!;
      updates[`members/${lodestoneId}/name`] = old.name;
      if (old.server) updates[`members/${lodestoneId}/server`] = old.server;
      updates[`members/${lodestoneId}/fflogsId`] = key;
      if (old.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = old.avatarUrl;
      updates[`members/${key}`] = null;
      console.log(`[migrate] ${old.name}: ${key} -> ${lodestoneId}`);
    } else {
      const old = member as OldMemberNode;
      const placeholder = `fflogs-${key}`;
      updates[`members/${placeholder}/name`] = old.name;
      if (old.server) updates[`members/${placeholder}/server`] = old.server;
      updates[`members/${placeholder}/fflogsId`] = key;
      if (old.avatarUrl) updates[`members/${placeholder}/avatarUrl`] = old.avatarUrl;
      updates[`members/${key}`] = null;
      orphaned.push(`${old.name} (fflogsId=${key}) — no Lodestone link, placed at members/${placeholder}`);
    }
  }

  // Copy fcCollection/members entries not already in /members
  console.log("[migrate] Reading /fcCollection/members...");
  const fcMembersSnap = await db.ref("fcCollection/members").get();
  const fcMembers = (fcMembersSnap.val() ?? {}) as Record<string, { name: string; lodestoneId: string }>;

  const newMembersAfterMigration = new Set<string>();
  for (const key of Object.keys(members)) {
    if ("fflogsId" in members[key]) newMembersAfterMigration.add(key);
  }
  for (const [, entry] of Object.entries(updates)) {
    if (entry === null) continue;
  }
  for (const [pushId, fc] of Object.entries(fcMembers)) {
    if (!fc.lodestoneId) {
      console.log(`[migrate] fcCollection/members/${pushId} (${fc.name}) has no lodestoneId — skip`);
      continue;
    }
    if (!updates[`members/${fc.lodestoneId}/name`] && !members[fc.lodestoneId]) {
      updates[`members/${fc.lodestoneId}/name`] = fc.name;
      console.log(`[migrate] Added ${fc.name} from fcCollection/members`);
    }
  }

  // Clear fcCollection/members — it is now redundant
  updates["fcCollection/members"] = null;

  if (Object.keys(updates).length === 0) {
    console.log("[migrate] Nothing to do.");
    return;
  }

  console.log(`[migrate] Applying ${Object.keys(updates).length} updates...`);
  await db.ref("/").update(updates);
  console.log("[migrate] Done.");

  if (orphaned.length > 0) {
    console.warn("[migrate] Members without Lodestone links (manual follow-up needed):");
    for (const msg of orphaned) console.warn(" -", msg);
    console.warn("Run Lodestone sync from the admin panel to resolve these.");
  }
}

migrate().catch((err) => {
  console.error("[migrate] Fatal:", err);
  process.exit(1);
});
