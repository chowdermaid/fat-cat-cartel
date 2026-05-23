import * as admin from "firebase-admin";

export interface LodestoneEntry {
  lodestoneId: string;
  name: string;
  server: string | null;
  avatarUrl: string | null;
}

interface SyncResult {
  total: number;
  written: number;
  failed: number;
}

function srcFromImgTag(tag: string | undefined): string | null {
  return tag?.match(/src="([^"]+)"/)?.[1] ?? null;
}

function parseCharacterPage(lodestoneId: string, html: string): LodestoneEntry | null {
  const nameMatch = html.match(/<p class="frame__chara__name">([\s\S]*?)<\/p>/);
  const name = nameMatch?.[1]?.replace(/<[^>]+>/g, "").trim();
  const worldMatch = html.match(/<p class="frame__chara__world">([\s\S]*?)<\/p>/);
  const world = worldMatch?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const server = world ? world.split("[")[0].trim() || null : null;

  const faceTag = html.match(/<img[^>]*class="[^"]*frame__chara__face[^"]*"[^>]*>/)?.[0];
  const avatarUrl = srcFromImgTag(faceTag)
    ?? html.match(/src="(https:\/\/img\d*\.finalfantasyxiv\.com\/[^"]+)"/)?.[1]
    ?? null;

  if (!name && !avatarUrl) return null;
  return { lodestoneId, name: name ?? "", server, avatarUrl };
}

export async function fetchLodestoneCharacter(lodestoneId: string): Promise<LodestoneEntry | null> {
  const url = `https://na.finalfantasyxiv.com/lodestone/character/${lodestoneId}/`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FCCBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Lodestone responded with ${res.status}`);
  return parseCharacterPage(lodestoneId, await res.text());
}

export async function runScrapeLodestone(): Promise<SyncResult> {
  const db = admin.database();
  const membersSnap = await db.ref("members").get();
  const members = (membersSnap.val() ?? {}) as Record<string, unknown>;
  const lodestoneIds = Object.keys(members);

  const updates: Record<string, unknown> = {};
  let written = 0;
  let failed = 0;

  for (const lodestoneId of lodestoneIds) {
    try {
      const entry = await fetchLodestoneCharacter(lodestoneId);
      if (!entry) {
        failed++;
        continue;
      }
      if (entry.name) updates[`members/${lodestoneId}/name`] = entry.name;
      if (entry.server) updates[`members/${lodestoneId}/server`] = entry.server;
      if (entry.avatarUrl) updates[`members/${lodestoneId}/avatarUrl`] = entry.avatarUrl;
      written++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (err) {
      failed++;
      console.warn(`[lodestone] Failed to sync ${lodestoneId}:`, err);
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.ref("/").update(updates);
  }

  console.log(`[lodestone] Synced ${written}/${lodestoneIds.length} tracked members`);

  return { total: lodestoneIds.length, written, failed };
}
