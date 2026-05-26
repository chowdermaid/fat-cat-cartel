import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const FC_RANKS = new Set(["Boss", "Underpaw", "Housecat", "Stray", "Friend"]);
const FFXIV_JOBS = new Set([
  "Paladin",
  "Warrior",
  "Dark Knight",
  "Gunbreaker",
  "White Mage",
  "Scholar",
  "Astrologian",
  "Sage",
  "Monk",
  "Dragoon",
  "Ninja",
  "Samurai",
  "Reaper",
  "Viper",
  "Bard",
  "Machinist",
  "Dancer",
  "Black Mage",
  "Summoner",
  "Red Mage",
  "Pictomancer",
]);
const PROFILE_TIMEZONES = new Set([
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Asia/Manila",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Hobart",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Fiji",
  "Pacific/Guam",
  "Pacific/Port_Moresby",
]);
const FAVORITE_CONTENT_OPTIONS = new Set([
  "Savage Raids",
  "Ultimate Raids",
  "Extremes",
  "Alliance Raids",
  "Dungeons",
  "Deep Dungeons",
  "Variant/Criterion",
  "Field Operations",
  "Treasure Maps",
  "Crafting/Gathering",
  "Fishing",
  "Housing",
  "Gold Saucer",
  "Glamour",
  "Mount Farming",
  "Minion Collecting",
  "Relic Farming",
  "Achievement Hunting",
  "Blue Mage",
  "PvP",
  "Roleplay",
  "AFKing",
  "Social Events",
]);
const SCORE_KEYS = ["hideAndSeek", "trivia", "eorzoaGuessr"] as const;

interface UpdateMemberProfileRequest {
  lodestoneId?: unknown;
  profile?: unknown;
  fcRank?: unknown;
}

interface EasterParticipantRequest {
  id?: unknown;
  name?: unknown;
  scores?: unknown;
}

function parseLodestoneId(value: unknown): string {
  const lodestoneId = String(value ?? "").trim();
  if (!/^\d{4,12}$/.test(lodestoneId)) {
    throw new HttpsError("invalid-argument", "A valid Lodestone ID is required.");
  }
  return lodestoneId;
}

function isValidBirthday(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  const daysByMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysByMonth[month - 1];
}

type ParsedProfile = {
  bio: string | null;
  birthday: string | null;
  mainJobs: string[];
  timezone: string | null;
  favoriteMountId: number | null;
  favoriteMinionId: number | null;
  favoriteContent: string | null;
};

function parseNullableEnum(value: unknown, allowed: Set<string>, message: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", message);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!allowed.has(trimmed)) {
    throw new HttpsError("invalid-argument", message);
  }
  return trimmed;
}

function parseFavoriteId(value: unknown, message: string): number | null {
  if (value == null || value === "") return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpsError("invalid-argument", message);
  }
  return id;
}

function parseProfile(value: unknown): ParsedProfile {
  const profile = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const rawBio = typeof profile.bio === "string" ? profile.bio.trim() : "";
  if (rawBio.length > 500) {
    throw new HttpsError("invalid-argument", "Bio must be 500 characters or fewer.");
  }
  const bio = rawBio || null;

  const rawBirthday = typeof profile.birthday === "string" && profile.birthday.trim()
    ? profile.birthday.trim()
    : null;
  if (rawBirthday && !isValidBirthday(rawBirthday)) {
    throw new HttpsError("invalid-argument", "Please provide a valid birthday.");
  }
  const birthday = rawBirthday;

  const rawJobs = Array.isArray(profile.mainJobs) ? profile.mainJobs : [];
  if (rawJobs.length > 8) {
    throw new HttpsError("invalid-argument", "Choose up to 8 main jobs.");
  }
  const mainJobs = rawJobs.map((job) => {
    if (typeof job !== "string") {
      throw new HttpsError("invalid-argument", "Main jobs must be valid FFXIV jobs.");
    }
    const trimmed = job.trim();
    if (!FFXIV_JOBS.has(trimmed)) {
      throw new HttpsError("invalid-argument", "Main jobs must be valid FFXIV jobs.");
    }
    return trimmed;
  });

  return {
    bio,
    birthday,
    mainJobs,
    timezone: parseNullableEnum(profile.timezone, PROFILE_TIMEZONES, "Please choose a valid timezone."),
    favoriteMountId: parseFavoriteId(profile.favoriteMountId, "Please choose a valid favorite mount."),
    favoriteMinionId: parseFavoriteId(profile.favoriteMinionId, "Please choose a valid favorite minion."),
    favoriteContent: parseNullableEnum(profile.favoriteContent, FAVORITE_CONTENT_OPTIONS, "Please choose a valid favorite content type."),
  };
}

function parseRank(value: unknown): string | null {
  if (value == null || value === "") return null;
  const rank = String(value).trim();
  if (!FC_RANKS.has(rank)) {
    throw new HttpsError("invalid-argument", "A valid FC rank is required.");
  }
  return rank;
}

function parseParticipantId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const id = String(value).trim();
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) {
    throw new HttpsError("invalid-argument", "A valid participant ID is required.");
  }
  return id;
}

function parseScores(value: unknown): Record<(typeof SCORE_KEYS)[number], number> {
  const scores = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const parsed = {
    hideAndSeek: 0,
    trivia: 0,
    eorzoaGuessr: 0,
  };
  for (const key of SCORE_KEYS) {
    const score = Number(scores[key] ?? 0);
    if (!Number.isFinite(score) || score < 0) {
      throw new HttpsError("invalid-argument", "Scores must be non-negative numbers.");
    }
    parsed[key] = Math.floor(score);
  }
  return parsed;
}

export async function updateMemberProfileAdmin(data: UpdateMemberProfileRequest): Promise<{ ok: true }> {
  const lodestoneId = parseLodestoneId(data.lodestoneId);
  const profile = parseProfile(data.profile);
  const fcRank = parseRank(data.fcRank);
  await validateFavoriteOwnership(lodestoneId, profile);
  await admin.database().ref("/").update({
    [`memberProfiles/${lodestoneId}`]: profile,
    [`members/${lodestoneId}/fcRank`]: fcRank,
    membersLastUpdated: Date.now(),
  });
  return { ok: true };
}

export async function updateOwnMemberProfile(data: UpdateMemberProfileRequest, lodestoneId: string): Promise<{ ok: true }> {
  const profile = parseProfile(data.profile);
  await validateFavoriteOwnership(lodestoneId, profile);
  await admin.database().ref(`memberProfiles/${lodestoneId}`).set(profile);
  return { ok: true };
}

async function validateFavoriteOwnership(lodestoneId: string, profile: ParsedProfile): Promise<void> {
  if (!profile.favoriteMountId && !profile.favoriteMinionId) return;
  const snapshot = await admin.database().ref(`fcCollection/memberData/${lodestoneId}/owned`).get();
  const owned = snapshot.val() as { mounts?: unknown; minions?: unknown } | null;
  const mounts = Array.isArray(owned?.mounts) ? owned.mounts.map(Number) : [];
  const minions = Array.isArray(owned?.minions) ? owned.minions.map(Number) : [];

  if (profile.favoriteMountId && !mounts.includes(profile.favoriteMountId)) {
    throw new HttpsError("failed-precondition", "Favorite mount must be owned by this member.");
  }
  if (profile.favoriteMinionId && !minions.includes(profile.favoriteMinionId)) {
    throw new HttpsError("failed-precondition", "Favorite minion must be owned by this member.");
  }
}

export async function upsertEasterParticipantAdmin(data: EasterParticipantRequest): Promise<{ ok: true; id: string }> {
  const name = typeof data.name === "string" ? data.name.trim().slice(0, 80) : "";
  if (!name) {
    throw new HttpsError("invalid-argument", "Participant name is required.");
  }
  const scores = parseScores(data.scores);
  const total = SCORE_KEYS.reduce((sum, key) => sum + scores[key], 0);
  const participantId = parseParticipantId(data.id);
  const ref = participantId
    ? admin.database().ref(`events/easter2026/participants/${participantId}`)
    : admin.database().ref("events/easter2026/participants").push();
  await ref.set({ name, scores, total });
  return { ok: true, id: ref.key ?? participantId ?? "" };
}

export async function deleteEasterParticipantAdmin(data: EasterParticipantRequest): Promise<{ ok: true }> {
  const participantId = parseParticipantId(data.id);
  if (!participantId) {
    throw new HttpsError("invalid-argument", "A valid participant ID is required.");
  }
  await admin.database().ref(`events/easter2026/participants/${participantId}`).remove();
  return { ok: true };
}
