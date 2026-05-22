import * as admin from "firebase-admin";

const FC_LODESTONE_ID = "9235616198341716868";

interface LodestoneEntry {
  lodestoneId: string;
  name: string;
  avatarUrl: string | null;
}

function parseMemberPage(html: string): LodestoneEntry[] {
  const results: LodestoneEntry[] = [];
  const seen = new Set<string>();

  const segments = html.split('href="/lodestone/character/');
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];

    const idMatch = seg.match(/^(\d+)\//);
    if (!idMatch) continue;
    const lodestoneId = idMatch[1];
    if (seen.has(lodestoneId)) continue;
    seen.add(lodestoneId);

    const block = seg.slice(0, 2000);

    const nameMatch = block.match(/class="entry__name"[^>]*>([\s\S]*?)<\//);
    const name = nameMatch?.[1]?.replace(/<[^>]+>/g, "").trim();
    if (!name) continue;

    const imgMatch = block.match(/src="(https:\/\/img\d*\.finalfantasyxiv\.com\/[^"]+)"/);
    const avatarUrl = imgMatch?.[1] ?? null;

    results.push({ lodestoneId, name, avatarUrl });
  }

  return results;
}

async function fetchMemberPage(page: number): Promise<string> {
  const url = `https://na.finalfantasyxiv.com/lodestone/freecompany/${FC_LODESTONE_ID}/member/?page=${page}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FCCBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Lodestone responded with ${res.status}`);
  return res.text();
}

export async function runScrapeLodestone(): Promise<{
  total: number;
  written: number;
}> {
  const db = admin.database();

  const allMembers: LodestoneEntry[] = [];
  for (let page = 1; page <= 20; page++) {
    const html = await fetchMemberPage(page);
    const entries = parseMemberPage(html);
    if (entries.length === 0) break;
    allMembers.push(...entries);
    if (!html.includes("btn__pager__next--on")) break;
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`[lodestone] Scraped ${allMembers.length} FC members`);

  const updates: Record<string, unknown> = {};
  for (const m of allMembers) {
    updates[`members/${m.lodestoneId}/name`] = m.name;
    if (m.avatarUrl) updates[`members/${m.lodestoneId}/avatarUrl`] = m.avatarUrl;
  }
  if (Object.keys(updates).length > 0) {
    await db.ref("/").update(updates);
  }

  return { total: allMembers.length, written: allMembers.length };
}
