import * as admin from "firebase-admin";
import { getFFLogsToken } from "./fflogs-auth";
import {
  GUILD_ID,
  DIFFICULTY,
  queryFFLogs,
  GUILD_MEMBERS_QUERY,
  GUILD_REPORTS_QUERY,
  buildCharacterZonesQuery,
} from "./fflogs-queries";
import { ZONES } from "./zones";

// ─── Raw API types ────────────────────────────────────────────────────────────

interface RawMember {
  id: number;
  name: string;
  server: { slug: string };
}

interface RawEncounterAllStars {
  partition: number;
  points: number;
  rank: number;
  regionRank: number;
  serverRank: number;
  rankPercent: number;
  total: number;
}

interface RawEncounterRanking {
  encounter: { id: number; name: string };
  rankPercent: number | null;
  bestAmount: number;
  spec: string | null;
  allStars: RawEncounterAllStars | null;
}

interface RawZoneAllStars {
  partition: number;
  spec: string;
  points: number;
  rank: number;
  regionRank: number;
  serverRank: number;
  rankPercent: number;
}

interface RawZoneRankings {
  rankings: RawEncounterRanking[];
  allStars: RawZoneAllStars[];
}

interface RawFight {
  name: string;
  kill: boolean;
  startTime: number;
  difficulty: number;
  encounterID: number;
}

interface RawReport {
  code: string;
  startTime: number;
  zone: { name: string };
  fights: RawFight[];
}

// ─── RTDB output types ────────────────────────────────────────────────────────

interface ParseData {
  percentile: number;
  rdps: number;
  job: string;
}

interface AllStars {
  points: number;
  worldRank: number;
  regionRank: number;
  serverRank: number;
  rankPercent: number;
  spec: string;
}

interface MemberData {
  name: string;
  server: string;
  lodestoneId: string | null;
  avatarUrl: string | null;
  savage: Partial<Record<string, ParseData>>;
  normal: Partial<Record<string, ParseData>>;
  allStars: AllStars | null;
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

interface RecentKillData {
  encounterName: string;
  encounterKey: string | null;
  difficulty: "Savage" | "Normal" | "Ultimate";
  date: number;
  reportCode: string;
}

interface FirstKillEntry {
  encounterName: string;
  date: number;
  reportCode: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function percentileBucket(p: number): keyof ParseBuckets {
  if (p >= 100) return "gold";
  if (p >= 99)  return "pink";
  if (p >= 95)  return "orange";
  if (p >= 75)  return "purple";
  if (p >= 50)  return "blue";
  if (p >= 25)  return "green";
  return "grey";
}

function emptyBuckets(): ParseBuckets {
  return { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 };
}

function toParseData(r: RawEncounterRanking): ParseData | null {
  if (!r.rankPercent || !r.spec || r.bestAmount === 0) return null;
  return { percentile: r.rankPercent, rdps: r.bestAmount, job: r.spec };
}

async function batchRun<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>, concurrency = 5, delayMs = 0): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(batch.map((item, j) => fn(item, i + j)))));
    if (delayMs > 0 && i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

// ─── XIVAPI portrait helpers ──────────────────────────────────────────────────

interface PortraitResult { lodestoneId: string | null; avatarUrl: string | null }

async function fetchAvatarById(lodestoneId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://xivapi.com/character/${lodestoneId}?columns=Character.Avatar`);
    if (!res.ok) return null;
    const data = await res.json() as { Character?: { Avatar?: string } };
    return data.Character?.Avatar ?? null;
  } catch { return null; }
}

async function autoMatchPortrait(name: string, server: string): Promise<PortraitResult> {
  try {
    const serverName = server.charAt(0).toUpperCase() + server.slice(1).toLowerCase();
    const res = await fetch(
      `https://xivapi.com/character/search?name=${encodeURIComponent(name)}&server=${serverName}`,
    );
    if (!res.ok) return { lodestoneId: null, avatarUrl: null };
    const data = await res.json() as { Results?: Array<{ ID: number; Name: string; Avatar: string }> };
    const match = data.Results?.find((r) => r.Name.toLowerCase() === name.toLowerCase());
    if (!match) return { lodestoneId: null, avatarUrl: null };
    return { lodestoneId: String(match.ID), avatarUrl: match.Avatar ?? null };
  } catch { return { lodestoneId: null, avatarUrl: null }; }
}

async function resolvePortrait(
  member: { name: string; server: string },
  override: string | null,
  existing: { lodestoneId?: string | null; avatarUrl?: string | null } | null,
): Promise<PortraitResult> {
  if (override) {
    const avatarUrl = existing?.lodestoneId === override && existing?.avatarUrl
      ? existing.avatarUrl
      : await fetchAvatarById(override);
    return { lodestoneId: override, avatarUrl };
  }
  if (existing?.lodestoneId) {
    // Retry fetching avatar if it was null on a previous refresh (XIVAPI caches lazily)
    const avatarUrl = existing.avatarUrl ?? await fetchAvatarById(existing.lodestoneId);
    return { lodestoneId: existing.lodestoneId, avatarUrl };
  }
  return autoMatchPortrait(member.name, member.server);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runRefreshFFLogs(clientId: string, clientSecret: string): Promise<void> {
  const token = await getFFLogsToken(clientId, clientSecret);
  const db = admin.database();

  // 1. Guild members
  const membersPayload = (await queryFFLogs(token, GUILD_MEMBERS_QUERY, { guildID: GUILD_ID })) as {
    guildData: { guild: { members: { data: RawMember[] } } };
  };
  const rawMembers = membersPayload.guildData.guild.members.data;
  console.log(`[fflogs] ${rawMembers.length} guild members`);

  // 2. Build combined query — fetches all zones per member in one API call
  const CHARACTER_QUERY = buildCharacterZonesQuery(ZONES);

  const zoneMembers: Record<number, Record<string, MemberData>> = {};
  const zoneHistograms: Record<number, Record<string, { savage: ParseBuckets; normal: ParseBuckets }>> = {};

  for (const zone of ZONES) {
    zoneMembers[zone.id] = {};
    zoneHistograms[zone.id] = {};
    for (const enc of zone.encounters) {
      zoneHistograms[zone.id][enc.key] = { savage: emptyBuckets(), normal: emptyBuckets() };
    }
  }

  const memberRankings = await batchRun(rawMembers, async (member, i) => {
    console.log(`[fflogs] fetching ${member.name} (${(i ?? 0) + 1}/${rawMembers.length})`);
    try {
      const data = (await queryFFLogs(token, CHARACTER_QUERY, { charID: member.id })) as {
        characterData: { character: Record<string, RawZoneRankings | null> | null };
      };
      return { member, char: data.characterData.character };
    } catch (err) {
      console.warn(`[fflogs] Failed rankings for ${member.name}:`, err);
      return { member, char: null };
    }
  }, 1);

  // 3. Build per-zone member data and histograms
  for (const { member, char } of memberRankings) {
    for (const zone of ZONES) {
      const memberData: MemberData = {
        name: member.name,
        server: member.server.slug,
        lodestoneId: null,
        avatarUrl: null,
        savage: {},
        normal: {},
        allStars: null,
      };

      if (char) {
        const fflogsId = zone.fflogsZoneId ?? zone.id;
        if (zone.contentType === "savage") {
          const savageRankings = char[`z${zone.id}_s`];
          const normalRankings = char[`z${zone.id}_n`];

          for (const r of savageRankings?.rankings ?? []) {
            const enc = zone.encounters.find((e) => e.id === r.encounter.id);
            if (!enc) continue;
            const pd = toParseData(r);
            if (pd) {
              memberData.savage[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].savage[percentileBucket(pd.percentile)]++;
            }
          }

          for (const r of normalRankings?.rankings ?? []) {
            const enc = zone.encounters.find((e) => e.id === r.encounter.id);
            if (!enc) continue;
            const pd = toParseData(r);
            if (pd) {
              memberData.normal[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].normal[percentileBucket(pd.percentile)]++;
            }
          }

          // All-stars from savage partition 1, best spec by points
          const asEntries = (savageRankings?.allStars ?? []).filter((a) => a.partition === 1);
          if (asEntries.length > 0) {
            const best = asEntries.sort((a, b) => b.points - a.points)[0];
            memberData.allStars = {
              points: best.points,
              worldRank: best.rank,
              regionRank: best.regionRank,
              serverRank: best.serverRank,
              rankPercent: best.rankPercent,
              spec: best.spec,
            };
          }
        } else {
          // Trials, alliance, ultimates
          const rankings = char[`z${fflogsId}`];
          const rankingsList = rankings?.rankings ?? [];
          for (const r of rankingsList) {
            const enc = zone.encounters.find((e) => e.id === r.encounter.id);
            if (!enc) {
              console.log(`[fflogs-dbg] Unknown encID ${r.encounter.id} (${r.encounter.name}) in zone ${zone.id} for ${member.name}`);
              continue;
            }
            const pd = toParseData(r);
            if (pd) {
              memberData.normal[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].normal[percentileBucket(pd.percentile)]++;
            }
          }
          const asEntries = (rankings?.allStars ?? []).filter((a) => a.partition === 1);
          if (asEntries.length > 0) {
            const best = asEntries.sort((a, b) => b.points - a.points)[0];
            memberData.allStars = {
              points: best.points,
              worldRank: best.rank,
              regionRank: best.regionRank,
              serverRank: best.serverRank,
              rankPercent: best.rankPercent,
              spec: best.spec,
            };
          }
        }
      }

      zoneMembers[zone.id][String(member.id)] = memberData;
    }
  }

  // 4. Portrait resolution — reads from portraitCache, writes back after resolution
  const [overridesSnap, portraitCacheSnap] = await Promise.all([
    db.ref("portraitOverrides").get(),
    db.ref("portraitCache").get(),
  ]);
  const overrides = (overridesSnap.val() ?? {}) as Record<string, { lodestoneId?: string }>;
  const portraitCache = (portraitCacheSnap.val() ?? {}) as Record<
    string, { lodestoneId?: string | null; avatarUrl?: string | null }
  >;

  const portraits: Record<string, PortraitResult> = {};
  await batchRun(rawMembers, async (member) => {
    const id = String(member.id);
    const override = overrides[id]?.lodestoneId ?? null;
    const existing = portraitCache[id] ?? null;
    portraits[id] = await resolvePortrait(
      { name: member.name, server: member.server.slug },
      override,
      existing,
    );
  }, 3);

  // Inject portraits into all per-zone member records
  for (const zone of ZONES) {
    for (const fflogsId of Object.keys(zoneMembers[zone.id])) {
      const p = portraits[fflogsId];
      if (p) {
        zoneMembers[zone.id][fflogsId].lodestoneId = p.lodestoneId;
        zoneMembers[zone.id][fflogsId].avatarUrl = p.avatarUrl;
      }
    }
  }

  // 5. Recent kills + first kills — one report query per zone, batched at concurrency 5
  const recentKills: Record<number, RecentKillData | null> = {};
  const firstKills: Record<number, Record<string, FirstKillEntry>> = {};
  await batchRun(ZONES, async (zone) => {
    firstKills[zone.id] = {};
    try {
      const payload = (await queryFFLogs(token, GUILD_REPORTS_QUERY, {
        guildID: GUILD_ID,
        zoneID: zone.fflogsZoneId ?? zone.id,
      })) as { reportData: { reports: { data: RawReport[] } } };

      let recentFound = false;
      for (const report of payload.reportData.reports.data) {
        for (const fight of report.fights ?? []) {
          if (!fight.kill) continue;
          const enc = zone.encounters.find((e) => e.id === fight.encounterID);
          const killDate = report.startTime + fight.startTime;

          if (!recentFound) {
            recentKills[zone.id] = {
              encounterName: fight.name,
              encounterKey: enc?.key ?? null,
              difficulty: zone.contentType === "ultimate" ? "Ultimate" : fight.difficulty === DIFFICULTY.savage ? "Savage" : "Normal",
              date: killDate,
              reportCode: report.code,
            };
            recentFound = true;
          }

          if (enc) {
            const existing = firstKills[zone.id][enc.key];
            if (!existing || killDate < existing.date) {
              firstKills[zone.id][enc.key] = {
                encounterName: fight.name,
                date: killDate,
                reportCode: report.code,
              };
            }
          }
        }
      }
      if (!recentFound) recentKills[zone.id] = null;
    } catch {
      recentKills[zone.id] = null;
    }
  }, 5);

  // 6. Write everything atomically via multi-path update
  const now = Date.now();
  const updates: Record<string, unknown> = {
    "raidStats/lastUpdated": now,
    "portraitCache": portraits,
    "guildMembers": Object.fromEntries(
      rawMembers.map((m) => [String(m.id), { name: m.name, server: m.server.slug }]),
    ),
  };

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    updates[`${prefix}/meta`] = {
      id: zone.id,
      name: zone.name,
      shortName: zone.shortName,
      contentType: zone.contentType,
      encounters: zone.encounters.map((e) => ({ id: e.id, key: e.key, label: e.label, name: e.name })),
    };
    updates[`${prefix}/lastUpdated`] = now;
    updates[`${prefix}/members`] = zoneMembers[zone.id];
    updates[`${prefix}/parseHistogram`] = zoneHistograms[zone.id];
    updates[`${prefix}/recentKill`] = recentKills[zone.id] ?? null;
    updates[`${prefix}/firstKills`] = Object.keys(firstKills[zone.id] ?? {}).length > 0 ? firstKills[zone.id] : null;
  }

  await db.ref("/").update(updates);
  console.log(`[fflogs] Wrote ${ZONES.length} zones for ${rawMembers.length} members`);
}
