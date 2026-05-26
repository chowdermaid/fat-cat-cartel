import * as admin from "firebase-admin";
import { fetchLodestoneCharacter } from "../scrape-lodestone";
import { FFXIV_JOBS } from "./commands";

const BIO_MAX_LENGTH = 500;
const LINK_PATH = "discordLinks";
const LINK_BY_LODESTONE_PATH = "discordLinksByLodestone";
const SIGNUP_ISSUES_PATH = "discordSignupIssues";

type MemberProfile = {
  bio?: string | null;
  birthday?: string | null;
  mainJobs?: string[];
};

type TrackedMember = {
  name?: string | null;
  server?: string | null;
  fcRank?: string | null;
  avatarUrl?: string | null;
  tomestoneProfile?: unknown;
};

type SignupIssueReason =
  | "lodestone_claimed"
  | "discord_already_linked"
  | "existing_record_conflict"
  | "lodestone_fetch_failed"
  | "admin_excluded";

export type CommandResult = {
  ok: boolean;
  message: string;
};

export async function linkDiscordUser(
  discordUserId: string,
  lodestoneIdInput: string,
): Promise<CommandResult> {
  const lodestoneId = lodestoneIdInput.trim();

  if (!isValidLodestoneId(lodestoneId)) {
    return fail("Please provide a valid Lodestone ID.");
  }

  const db = admin.database();
  const memberSnapshot = await db.ref(`members/${lodestoneId}`).get();

  if (!memberSnapshot.exists()) {
    return fail("That Lodestone ID is not in the FC member list.");
  }

  const conflict = await findLinkConflict(discordUserId, lodestoneId);
  if (conflict) {
    await writeSignupIssue(discordUserId, lodestoneId, conflict.reason);
    return fail(conflict.message);
  }

  await writeDiscordLink(discordUserId, lodestoneId);

  const member = memberSnapshot.val() as { name?: string };
  return success(
    `Linked your Discord account to ${member.name ?? `Lodestone ${lodestoneId}`}.`,
  );
}

export async function signupFriend(
  discordUserId: string,
  lodestoneIdInput: string,
): Promise<CommandResult> {
  const lodestoneId = lodestoneIdInput.trim();

  if (!isValidLodestoneId(lodestoneId)) {
    return fail("Please provide a valid Lodestone ID.");
  }

  const db = admin.database();
  const [existingLinkSnapshot, existingMemberSnapshot] = await Promise.all([
    db.ref(`${LINK_PATH}/${discordUserId}`).get(),
    db.ref(`members/${lodestoneId}`).get(),
  ]);
  const exclusionSnapshot = await db
    .ref(`memberExclusions/${lodestoneId}`)
    .get();
  if (exclusionSnapshot.exists()) {
    await writeSignupIssue(discordUserId, lodestoneId, "admin_excluded");
    return fail(
      "That Lodestone ID is not available for self-signup. Please ask an admin for help.",
    );
  }

  const existingLink = existingLinkSnapshot.val() as {
    lodestoneId?: unknown;
  } | null;
  if (
    existingLink?.lodestoneId === lodestoneId &&
    existingMemberSnapshot.exists()
  ) {
    await writeDiscordLink(discordUserId, lodestoneId);
    return success(
      "You are already linked to that Lodestone ID. Your Friend tracking is set up.",
    );
  }

  const conflict = await findLinkConflict(discordUserId, lodestoneId);
  if (conflict) {
    await writeSignupIssue(discordUserId, lodestoneId, conflict.reason);
    return fail(conflict.message);
  }

  let character: Awaited<ReturnType<typeof fetchLodestoneCharacter>>;
  try {
    character = await fetchLodestoneCharacter(lodestoneId);
  } catch (error) {
    console.warn(
      `[discord] Lodestone signup fetch failed for ${lodestoneId}:`,
      error,
    );
    await writeSignupIssue(
      discordUserId,
      lodestoneId,
      "lodestone_fetch_failed",
    );
    return fail(
      "I could not load that Lodestone character. Please check the ID and ask an admin if it keeps happening.",
    );
  }

  if (!character || !character.name) {
    await writeSignupIssue(
      discordUserId,
      lodestoneId,
      "lodestone_fetch_failed",
    );
    return fail(
      "I could not find a character for that Lodestone ID. Please check the ID and try again.",
    );
  }

  const updates: Record<string, unknown> = {};

  if (!existingMemberSnapshot.exists()) {
    updates[`members/${lodestoneId}`] = {
      name: character.name,
      server: character.server,
      fcRank: "Friend",
      avatarUrl: character.avatarUrl,
    };
  }

  const now = Date.now();
  updates.membersLastUpdated = now;
  updates[`${LINK_PATH}/${discordUserId}`] = { lodestoneId, linkedAt: now };
  updates[`${LINK_BY_LODESTONE_PATH}/${lodestoneId}`] = discordUserId;
  const refreshJobKey = db.ref("friendRefreshQueue").push().key;
  if (!refreshJobKey) {
    throw new Error("Could not allocate friend refresh job.");
  }
  updates[`friendRefreshQueue/${refreshJobKey}`] = {
    lodestoneId,
    discordUserId,
    status: "queued",
    createdAt: now,
  };
  await db.ref("/").update(updates);

  const existingMember = existingMemberSnapshot.val() as TrackedMember | null;
  const displayName = existingMember?.name ?? character.name;
  const trackedAs = existingMember?.fcRank ? existingMember.fcRank : "Friend";

  return success(
    [
      `${displayName} is now linked and tracked as ${trackedAs}.`,
      "Collection and raid data are loading now.",
      "For achievements and titles, visit https://ffxivcollect.com/ and manually refresh your character.",
      "Your Lodestone achievement privacy must be set to everyone/public for achievements and titles to load.",
    ].join("\n"),
  );
}

export async function viewFriendStatus(
  discordUserId: string,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  const db = admin.database();
  const [memberSnapshot, collectionSnapshot] = await Promise.all([
    db.ref(`members/${linked.lodestoneId}`).get(),
    db.ref(`fcCollection/memberData/${linked.lodestoneId}`).get(),
  ]);

  const member = (memberSnapshot.val() ?? {}) as TrackedMember;
  const name = member.name ?? `Lodestone ${linked.lodestoneId}`;

  return success(
    [
      `Tracking status for ${name}${member.server ? ` @ ${member.server}` : ""}`,
      `Lodestone ID: ${linked.lodestoneId}`,
      `Rank: ${member.fcRank ?? "Not set"}`,
      `Collection cache: ${collectionSnapshot.exists() ? "Loaded" : "Waiting for refresh"}`,
      `Raid stats: ${member.tomestoneProfile ? "Tomestone loaded" : "Waiting for raid stats refresh"}`,
    ].join("\n"),
  );
}

export async function updateBio(
  discordUserId: string,
  textInput: string,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  const bio = textInput.trim();
  if (bio.length < 1) {
    return fail("Bio cannot be empty.");
  }

  if (bio.length > BIO_MAX_LENGTH) {
    return fail(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
  }

  await admin
    .database()
    .ref(`memberProfiles/${linked.lodestoneId}`)
    .update({ bio });
  return success("Updated your profile bio.");
}

export async function updateBirthday(
  discordUserId: string,
  month: number,
  day: number,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  if (!isValidBirthday(month, day)) {
    return fail("Please provide a valid birthday.");
  }

  const birthday = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  await admin
    .database()
    .ref(`memberProfiles/${linked.lodestoneId}`)
    .update({ birthday });

  return success(`Updated your birthday to ${birthday}.`);
}

export async function addJob(
  discordUserId: string,
  job: string,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  const canonicalJob = normalizeJob(job);
  if (!canonicalJob) {
    return fail("That job is not recognized.");
  }

  const profileRef = admin
    .database()
    .ref(`memberProfiles/${linked.lodestoneId}`);
  const profile = ((await profileRef.get()).val() ?? {}) as MemberProfile;
  const currentJobs = Array.isArray(profile.mainJobs) ? profile.mainJobs : [];

  if (currentJobs.includes(canonicalJob)) {
    return success(`${canonicalJob} is already on your main jobs.`);
  }

  await profileRef.update({ mainJobs: [...currentJobs, canonicalJob] });
  return success(`Added ${canonicalJob} to your main jobs.`);
}

export async function removeJob(
  discordUserId: string,
  job: string,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  const canonicalJob = normalizeJob(job);
  if (!canonicalJob) {
    return fail("That job is not recognized.");
  }

  const profileRef = admin
    .database()
    .ref(`memberProfiles/${linked.lodestoneId}`);
  const profile = ((await profileRef.get()).val() ?? {}) as MemberProfile;
  const currentJobs = Array.isArray(profile.mainJobs) ? profile.mainJobs : [];
  const nextJobs = currentJobs.filter(
    (existingJob) => existingJob !== canonicalJob,
  );

  if (nextJobs.length === currentJobs.length) {
    return success(`${canonicalJob} was not on your main jobs.`);
  }

  await profileRef.update({ mainJobs: nextJobs });
  return success(`Removed ${canonicalJob} from your main jobs.`);
}

export async function viewProfile(
  discordUserId: string,
): Promise<CommandResult> {
  const linked = await getLinkedLodestoneId(discordUserId);
  if (!linked.ok) return linked;

  const db = admin.database();
  const [memberSnapshot, profileSnapshot] = await Promise.all([
    db.ref(`members/${linked.lodestoneId}`).get(),
    db.ref(`memberProfiles/${linked.lodestoneId}`).get(),
  ]);

  const member = (memberSnapshot.val() ?? {}) as {
    name?: string;
    server?: string;
  };
  const profile = (profileSnapshot.val() ?? {}) as MemberProfile;
  const jobs =
    Array.isArray(profile.mainJobs) && profile.mainJobs.length > 0
      ? profile.mainJobs.join(", ")
      : "Not set";

  return success(
    [
      `Profile for ${member.name ?? linked.lodestoneId}${member.server ? ` @ ${member.server}` : ""}`,
      `Bio: ${profile.bio || "Not set"}`,
      `Birthday: ${profile.birthday || "Not set"}`,
      `Main jobs: ${jobs}`,
    ].join("\n"),
  );
}

function normalizeJob(job: string): string | null {
  const normalized = job.trim().toLowerCase();
  return (
    FFXIV_JOBS.find((candidate) => candidate.toLowerCase() === normalized) ??
    null
  );
}

function isValidBirthday(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;

  const daysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysByMonth[month - 1];
}

async function getLinkedLodestoneId(
  discordUserId: string,
): Promise<{ ok: true; lodestoneId: string } | { ok: false; message: string }> {
  const snapshot = await admin
    .database()
    .ref(`${LINK_PATH}/${discordUserId}`)
    .get();
  const link = snapshot.val() as { lodestoneId?: unknown } | null;

  if (!link || typeof link.lodestoneId !== "string") {
    return {
      ok: false,
      message: "No lodestone ID linked.",
    };
  }

  return { ok: true, lodestoneId: link.lodestoneId };
}

function isValidLodestoneId(lodestoneId: string): boolean {
  return /^\d{4,12}$/.test(lodestoneId);
}

async function findLinkConflict(
  discordUserId: string,
  lodestoneId: string,
): Promise<{ reason: SignupIssueReason; message: string } | null> {
  const db = admin.database();
  const [discordLinkSnapshot, lodestoneLinkSnapshot] = await Promise.all([
    db.ref(`${LINK_PATH}/${discordUserId}`).get(),
    db.ref(`${LINK_BY_LODESTONE_PATH}/${lodestoneId}`).get(),
  ]);

  const existingDiscordLink = discordLinkSnapshot.val() as {
    lodestoneId?: unknown;
  } | null;
  if (existingDiscordLink?.lodestoneId === lodestoneId) {
    return null;
  }

  if (typeof existingDiscordLink?.lodestoneId === "string") {
    return {
      reason: "discord_already_linked",
      message:
        "Your Discord account is already linked to another Lodestone ID. Please ask an admin to change it.",
    };
  }

  const reverseLinkedUser = lodestoneLinkSnapshot.val();
  if (
    typeof reverseLinkedUser === "string" &&
    reverseLinkedUser !== discordUserId
  ) {
    return {
      reason: "lodestone_claimed",
      message:
        "That Lodestone ID is already linked to another Discord user. Please ask an admin for help.",
    };
  }

  const legacyLinkSnapshot = await db
    .ref(LINK_PATH)
    .orderByChild("lodestoneId")
    .equalTo(lodestoneId)
    .get();
  const legacyLinks = (legacyLinkSnapshot.val() ?? {}) as Record<
    string,
    unknown
  >;
  const legacyUserIds = Object.keys(legacyLinks).filter(
    (userId) => userId !== discordUserId,
  );

  if (legacyUserIds.length > 0) {
    return {
      reason: "lodestone_claimed",
      message:
        "That Lodestone ID is already linked to another Discord user. Please ask an admin for help.",
    };
  }

  return null;
}

async function writeDiscordLink(
  discordUserId: string,
  lodestoneId: string,
): Promise<void> {
  const now = Date.now();
  await admin
    .database()
    .ref("/")
    .update({
      [`${LINK_PATH}/${discordUserId}`]: { lodestoneId, linkedAt: now },
      [`${LINK_BY_LODESTONE_PATH}/${lodestoneId}`]: discordUserId,
    });
}

async function writeSignupIssue(
  discordUserId: string,
  lodestoneId: string,
  reason: SignupIssueReason,
): Promise<void> {
  await admin.database().ref(SIGNUP_ISSUES_PATH).push({
    discordUserId,
    lodestoneId,
    reason,
    status: "open",
    createdAt: Date.now(),
  });
}

function success(message: string): CommandResult {
  return { ok: true, message };
}

function fail(message: string): CommandResult {
  return { ok: false, message };
}
