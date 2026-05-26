import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

const FC_RANKS = new Set(["Boss", "Underpaw", "Housecat", "Stray", "Friend"]);
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

function parseProfile(value: unknown): { bio: string | null; birthday: string | null; mainJobs: string[] } {
  const profile = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const bio = typeof profile.bio === "string" && profile.bio.trim()
    ? profile.bio.trim().slice(0, 500)
    : null;
  const birthday = typeof profile.birthday === "string" && /^\d{2}-\d{2}$/.test(profile.birthday)
    ? profile.birthday
    : null;
  const mainJobs = Array.isArray(profile.mainJobs)
    ? profile.mainJobs
      .filter((job): job is string => typeof job === "string" && job.trim().length > 0)
      .map((job) => job.trim())
      .slice(0, 8)
    : [];
  return { bio, birthday, mainJobs };
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
  await admin.database().ref("/").update({
    [`memberProfiles/${lodestoneId}`]: profile,
    [`members/${lodestoneId}/fcRank`]: fcRank,
    membersLastUpdated: Date.now(),
  });
  return { ok: true };
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
