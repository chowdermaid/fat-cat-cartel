import * as admin from "firebase-admin";
import { memberSyncError, memberSyncSuccess } from "./member-sync-status";

export interface LodestoneEntry {
  lodestoneId: string;
  name: string;
  server: string | null;
  avatarUrl: string | null;
  jobLevels: Record<string, number | null>;
}

interface SyncResult {
  total: number;
  written: number;
  failed: number;
}

function srcFromImgTag(tag: string | undefined): string | null {
  return tag?.match(/src="([^"]+)"/)?.[1] ?? null;
}

const JOB_ALIASES: Record<string, string> = {
  Gladiator: "Paladin",
  Paladin: "Paladin",
  Marauder: "Warrior",
  Warrior: "Warrior",
  "Dark Knight": "Dark Knight",
  Gunbreaker: "Gunbreaker",
  Conjurer: "White Mage",
  "White Mage": "White Mage",
  Scholar: "Scholar",
  Astrologian: "Astrologian",
  Sage: "Sage",
  Pugilist: "Monk",
  Monk: "Monk",
  Lancer: "Dragoon",
  Dragoon: "Dragoon",
  Rogue: "Ninja",
  Ninja: "Ninja",
  Samurai: "Samurai",
  Reaper: "Reaper",
  Viper: "Viper",
  Archer: "Bard",
  Bard: "Bard",
  Machinist: "Machinist",
  Dancer: "Dancer",
  Thaumaturge: "Black Mage",
  "Black Mage": "Black Mage",
  Arcanist: "Summoner",
  Summoner: "Summoner",
  "Red Mage": "Red Mage",
  "Blue Mage": "Blue Mage",
  Beastmaster: "Beastmaster",
  Pictomancer: "Pictomancer",
  Carpenter: "Carpenter",
  Blacksmith: "Blacksmith",
  Armorer: "Armorer",
  Goldsmith: "Goldsmith",
  Leatherworker: "Leatherworker",
  Weaver: "Weaver",
  Alchemist: "Alchemist",
  Culinarian: "Culinarian",
  Miner: "Miner",
  Botanist: "Botanist",
  Fisher: "Fisher",
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function textFromHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function parseJobLevels(html: string): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  const jobRows = html.matchAll(
    /<li\b[^>]*>[\s\S]*?<div class="character__job__level">(?<level>[\s\S]*?)<\/div>[\s\S]*?<div class="character__job__name[^>]*>(?<name>[\s\S]*?)<\/div>[\s\S]*?<\/li>/g,
  );

  for (const match of jobRows) {
    const rawName = textFromHtml(match.groups?.name ?? "");
    const canonicalName = JOB_ALIASES[rawName];
    if (!canonicalName) continue;

    const rawLevel = textFromHtml(match.groups?.level ?? "");
    if (rawLevel === "-") {
      result[canonicalName] = null;
      continue;
    }

    const level = Number(rawLevel);
    if (Number.isInteger(level) && level >= 0 && level <= 100) {
      result[canonicalName] = level;
    }
  }

  return result;
}

function parseCharacterPage(
  lodestoneId: string,
  profileHtml: string,
  classJobHtml: string,
): LodestoneEntry | null {
  const nameMatch = profileHtml.match(/<p class="frame__chara__name">([\s\S]*?)<\/p>/);
  const name = nameMatch?.[1]?.replace(/<[^>]+>/g, "").trim();
  const worldMatch = profileHtml.match(/<p class="frame__chara__world">([\s\S]*?)<\/p>/);
  const world = worldMatch?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const server = world ? world.split("[")[0].trim() || null : null;

  const faceTag = profileHtml.match(/<img[^>]*class="[^"]*frame__chara__face[^"]*"[^>]*>/)?.[0];
  const avatarUrl = srcFromImgTag(faceTag)
    ?? profileHtml.match(/src="(https:\/\/img\d*\.finalfantasyxiv\.com\/[^"]+)"/)?.[1]
    ?? null;

  if (!name && !avatarUrl) return null;
  return { lodestoneId, name: name ?? "", server, avatarUrl, jobLevels: parseJobLevels(classJobHtml) };
}

export async function fetchLodestoneCharacter(lodestoneId: string): Promise<LodestoneEntry | null> {
  const baseUrl = `https://na.finalfantasyxiv.com/lodestone/character/${lodestoneId}/`;
  const headers = { "User-Agent": "Mozilla/5.0 (compatible; FCCBot/1.0)" };
  const res = await fetch(baseUrl, {
    headers,
  });
  if (!res.ok) throw new Error(`Lodestone responded with ${res.status}`);
  const profileHtml = await res.text();

  const classJobRes = await fetch(`${baseUrl}class_job/`, {
    headers,
  });
  const classJobHtml = classJobRes.ok ? await classJobRes.text() : profileHtml;

  return parseCharacterPage(lodestoneId, profileHtml, classJobHtml);
}

export async function runScrapeLodestone(): Promise<SyncResult> {
  const db = admin.database();
  const [membersSnap, exclusionsSnap] = await Promise.all([
    db.ref("members").get(),
    db.ref("memberExclusions").get(),
  ]);
  const members = (membersSnap.val() ?? {}) as Record<string, unknown>;
  const exclusions = (exclusionsSnap.val() ?? {}) as Record<string, unknown>;
  const lodestoneIds = Object.keys(members);

  const updates: Record<string, unknown> = {};
  let written = 0;
  let failed = 0;

  for (const lodestoneId of lodestoneIds) {
    if (exclusions[lodestoneId]) continue;
    const attemptAt = Date.now();
    try {
      const entry = await fetchLodestoneCharacter(lodestoneId);
      if (!entry) {
        failed++;
        updates[`memberSyncStatus/${lodestoneId}/lodestone`] = memberSyncError(
          attemptAt,
          "Lodestone character was not found.",
        );
        continue;
      }
      if (entry.name) updates[`members/${lodestoneId}/name`] = entry.name;
      if (entry.server) updates[`members/${lodestoneId}/server`] = entry.server;
      if (entry.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = entry.avatarUrl;
      if (Object.keys(entry.jobLevels).length > 0) {
        updates[`members/${lodestoneId}/jobLevels`] = entry.jobLevels;
        updates[`members/${lodestoneId}/jobLevelsLastFetched`] = Date.now();
      } else {
        console.warn(`[lodestone] No job levels parsed for ${lodestoneId}`);
      }
      updates[`memberSyncStatus/${lodestoneId}/lodestone`] = memberSyncSuccess(
        "lodestone",
        attemptAt,
        Date.now(),
        "lodestone refreshed.",
        {
          name: entry.name,
          server: entry.server,
          jobLevels: Object.keys(entry.jobLevels).length,
        },
      );
      written++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Unknown Lodestone error.";
      updates[`memberSyncStatus/${lodestoneId}/lodestone`] = memberSyncError(attemptAt, message);
      console.warn(`[lodestone] Failed to sync ${lodestoneId}:`, err);
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.membersLastUpdated = Date.now();
    await db.ref("/").update(updates);
  }

  console.log(`[lodestone] Synced ${written}/${lodestoneIds.length} tracked members`);

  return { total: lodestoneIds.length, written, failed };
}
