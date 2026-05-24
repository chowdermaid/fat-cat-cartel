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

// ─── DB output types ──────────────────────────────────────────────────────────

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

interface ParseEntry {
  savage: Partial<Record<string, ParseData>>;
  normal: Partial<Record<string, ParseData>>;
  allStars: AllStars | null;
}

interface MemberNode {
  name: string;
  server: string;
  fflogsId: string | null;
  avatarUrl?: string | null;
  fcRank?: string | null;
}

type RankingTarget =
  | (RawMember & { source: "guild"; lodestoneIdHint?: string | null })
  | {
      source: "friend";
      name: string;
      server: { slug: string };
      lodestoneIdHint: string;
      fflogsIdHint?: string | null;
    };

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

function toParseData(r: RawEncounterRanking): ParseData | null {
  if (!r.rankPercent || !r.spec || r.bestAmount === 0) return null;
  return { percentile: r.rankPercent, rdps: r.bestAmount, job: r.spec };
}

async function batchRun<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
  delayMs = 0,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    results.push(
      ...(await Promise.all(batch.map((item, j) => fn(item, i + j)))),
    );
    if (delayMs > 0 && i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runRefreshFFLogs(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const token = await getFFLogsToken(clientId, clientSecret);
  const db = admin.database();
  const fflogsStats = { rateLimitRetries: 0 };

  // 1. Guild members (lodestoneID now included in query)
  const membersPayload = (await queryFFLogs(token, GUILD_MEMBERS_QUERY, {
    guildID: GUILD_ID,
  }, 2, fflogsStats)) as {
    guildData: { guild: { members: { data: RawMember[] } } };
  };
  const rawMembers = membersPayload.guildData.guild.members.data;
  console.log(`[fflogs] ${rawMembers.length} guild members`);

  const existingMembersSnap = await db.ref("members").get();
  const existingMembers = (existingMembersSnap.val() ?? {}) as Record<string, MemberNode>;

  const lodestoneByFflogsId = new Map<string, string>();
  for (const [lodestoneId, m] of Object.entries(existingMembers)) {
    if (m.fflogsId) lodestoneByFflogsId.set(m.fflogsId, lodestoneId);
  }

  const rankingTargets: RankingTarget[] = rawMembers.map((member) => ({
    ...member,
    source: "guild",
  }));
  const seenFflogsIds = new Set(rawMembers.map((member) => String(member.id)));
  let friendLookupAttempts = 0;
  let friendLookupSuccesses = 0;

  for (const [lodestoneId, member] of Object.entries(existingMembers)) {
    if (member.fcRank !== "Friend") continue;
    if (member.fflogsId && seenFflogsIds.has(member.fflogsId)) continue;

    rankingTargets.push({
      name: member.name,
      server: { slug: member.server ?? "" },
      source: "friend",
      lodestoneIdHint: lodestoneId,
      fflogsIdHint: member.fflogsId,
    });
    friendLookupAttempts++;
  }

  console.log(
    `[fflogs] ${rankingTargets.length} ranking targets including ${friendLookupAttempts} friend Lodestone lookups`,
  );

  // 2. Build combined query
  const CHARACTER_BY_ID_QUERY = buildCharacterZonesQuery(ZONES, "id");
  const CHARACTER_BY_LODESTONE_QUERY = buildCharacterZonesQuery(ZONES, "lodestoneID");

  const zoneParses: Record<number, Record<string, ParseEntry>> = {};
  const zoneHistograms: Record<
    number,
    Record<string, { savage: ParseBuckets; normal: ParseBuckets }>
  > = {};

  for (const zone of ZONES) {
    zoneParses[zone.id] = {};
    zoneHistograms[zone.id] = {};
    for (const enc of zone.encounters) {
      zoneHistograms[zone.id][enc.key] = {
        savage: emptyBuckets(),
        normal: emptyBuckets(),
      };
    }
  }

  const memberRankings = await batchRun(
    rankingTargets,
    async (member, i) => {
      console.log(
        `[fflogs] fetching ${member.name} (${(i ?? 0) + 1}/${rankingTargets.length})`,
      );
      try {
        const data = (await queryFFLogs(
          token,
          member.source === "friend"
            ? CHARACTER_BY_LODESTONE_QUERY
            : CHARACTER_BY_ID_QUERY,
          member.source === "friend"
            ? { lodestoneID: Number(member.lodestoneIdHint) }
            : { charID: member.id },
          2,
          fflogsStats,
        )) as {
          characterData: {
            character:
              | ({
                  id?: number | null;
                  name?: string | null;
                  lodestoneID?: string | number | null;
                  server?: { slug?: string | null } | null;
                } & Record<
                  string,
                  RawZoneRankings | null
                >)
              | null;
          };
        };
        const char = data.characterData.character;
        const lodestoneID = char?.lodestoneID != null ? String(char.lodestoneID) : null;
        if (member.source === "friend" && char) friendLookupSuccesses++;
        return { member, char, lodestoneID };
      } catch (err) {
        console.warn(`[fflogs] Failed rankings for ${member.name}:`, err);
        return { member, char: null, lodestoneID: null };
      }
    },
    1,
  );
  console.log(
    `[fflogs] Friend Lodestone lookups succeeded ${friendLookupSuccesses}/${friendLookupAttempts}`,
  );

  // 3. Resolve effective lodestoneId per member (FFLogs API value preferred, DB fallback)
  const effectiveLodestoneId = new Map<string, string | null>();
  for (const { member, lodestoneID } of memberRankings) {
    const fflogsId =
      member.source === "friend" ? (member.fflogsIdHint ?? null) : String(member.id);
    const dbMatch = fflogsId ? (lodestoneByFflogsId.get(fflogsId) ?? null) : null;
    const resolved =
      member.source === "friend"
        ? (member.lodestoneIdHint ?? lodestoneID ?? dbMatch)
        : (lodestoneID ?? dbMatch);
    const key =
      member.source === "friend" ? (fflogsId ?? member.lodestoneIdHint) : String(member.id);
    effectiveLodestoneId.set(key, resolved);
  }

  // 4. Build per-zone parse entries and histograms, keyed by lodestoneId
  for (const { member, char } of memberRankings) {
    const memberKey =
      member.source === "friend"
        ? (member.fflogsIdHint ?? member.lodestoneIdHint)
        : String(member.id);
    const lodestoneId = effectiveLodestoneId.get(memberKey);
    if (!lodestoneId) continue;

    for (const zone of ZONES) {
      const entry: ParseEntry = { savage: {}, normal: {}, allStars: null };

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
              entry.savage[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].savage[
                percentileBucket(pd.percentile)
              ]++;
            }
          }

          for (const r of normalRankings?.rankings ?? []) {
            const enc = zone.encounters.find((e) => e.id === r.encounter.id);
            if (!enc) continue;
            const pd = toParseData(r);
            if (pd) {
              entry.normal[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].normal[
                percentileBucket(pd.percentile)
              ]++;
            }
          }

          const asEntries = (savageRankings?.allStars ?? []).filter(
            (a) => a.partition === 1,
          );
          if (asEntries.length > 0) {
            const best = asEntries.sort((a, b) => b.points - a.points)[0];
            entry.allStars = {
              points: best.points,
              worldRank: best.rank,
              regionRank: best.regionRank,
              serverRank: best.serverRank,
              rankPercent: best.rankPercent,
              spec: best.spec,
            };
          }
        } else {
          const rankings = char[`z${fflogsId}`];
          const rankingsList = rankings?.rankings ?? [];
          for (const r of rankingsList) {
            const enc = zone.encounters.find((e) => e.id === r.encounter.id);
            if (!enc) {
              console.log(
                `[fflogs-dbg] Unknown encID ${r.encounter.id} (${r.encounter.name}) in zone ${zone.id} for ${member.name}`,
              );
              continue;
            }
            const pd = toParseData(r);
            if (pd) {
              entry.normal[enc.key] = pd;
              zoneHistograms[zone.id][enc.key].normal[
                percentileBucket(pd.percentile)
              ]++;
            }
          }
          const asEntries = (rankings?.allStars ?? []).filter(
            (a) => a.partition === 1,
          );
          if (asEntries.length > 0) {
            const best = asEntries.sort((a, b) => b.points - a.points)[0];
            entry.allStars = {
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

      zoneParses[zone.id][lodestoneId] = entry;
    }
  }

  // 5. Build members node keyed by lodestoneId (avatarUrl managed exclusively by scrape-lodestone)
  const membersNode: Record<string, MemberNode> = {};
  for (const { member, lodestoneID } of memberRankings) {
    if (member.source !== "guild") continue;
    const fflogsId = String(member.id);
    const lodestoneId = lodestoneID ?? lodestoneByFflogsId.get(fflogsId) ?? null;
    if (!lodestoneId) continue;
    membersNode[lodestoneId] = {
      name: member.name,
      server: member.server.slug,
      fflogsId,
      avatarUrl: existingMembers[lodestoneId]?.avatarUrl ?? null,
    };
  }

  // 6. Recent kills + first kills
  const recentKills: Record<number, RecentKillData | null> = {};
  const firstKills: Record<number, Record<string, FirstKillEntry>> = {};
  await batchRun(
    ZONES,
    async (zone) => {
      firstKills[zone.id] = {};
      try {
        const payload = (await queryFFLogs(token, GUILD_REPORTS_QUERY, {
          guildID: GUILD_ID,
          zoneID: zone.fflogsZoneId ?? zone.id,
        }, 2, fflogsStats)) as { reportData: { reports: { data: RawReport[] } } };

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
                difficulty:
                  zone.contentType === "ultimate"
                    ? "Ultimate"
                    : fight.difficulty === DIFFICULTY.savage
                      ? "Savage"
                      : "Normal",
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
    },
    5,
  );

  // 7. Atomic multi-path update
  const now = Date.now();
  const updates: Record<string, unknown> = {
    "raidStats/lastUpdated": now,
  };

  // Per-field member writes keyed by lodestoneId; never clobber avatarUrl set by the Lodestone scraper.
  const activeFflogsIds = new Set(rawMembers.map((m) => String(m.id)));
  for (const [lodestoneId, m] of Object.entries(existingMembers)) {
    if (m.fcRank === "Friend") continue;
    if (m.fflogsId && !activeFflogsIds.has(m.fflogsId)) {
      updates[`members/${lodestoneId}`] = null;
    }
  }
  for (const [lodestoneId, node] of Object.entries(membersNode)) {
    updates[`members/${lodestoneId}/name`] = node.name;
    updates[`members/${lodestoneId}/server`] = node.server;
    updates[`members/${lodestoneId}/fflogsId`] = node.fflogsId;
  }
  for (const { member, char } of memberRankings) {
    if (member.source !== "friend" || !char?.id) continue;
    updates[`members/${member.lodestoneIdHint}/fflogsId`] = String(char.id);
    if (char.name) updates[`members/${member.lodestoneIdHint}/name`] = char.name;
    if (char.server?.slug) {
      updates[`members/${member.lodestoneIdHint}/server`] = char.server.slug;
    }
  }

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    updates[`${prefix}/meta`] = {
      id: zone.id,
      name: zone.name,
      shortName: zone.shortName,
      contentType: zone.contentType,
      encounters: zone.encounters.map((e) => ({
        id: e.id,
        key: e.key,
        label: e.label,
        name: e.name,
      })),
    };
    updates[`${prefix}/lastUpdated`] = now;
    updates[`${prefix}/parses`] = zoneParses[zone.id];
    updates[`${prefix}/histogram`] = zoneHistograms[zone.id];
    updates[`${prefix}/recentKill`] = recentKills[zone.id] ?? null;
    updates[`${prefix}/firstKills`] =
      Object.keys(firstKills[zone.id] ?? {}).length > 0
        ? firstKills[zone.id]
        : null;
  }

  await db.ref("/").update(updates);
  console.log(
    `[fflogs] Wrote ${ZONES.length} zones for ${rawMembers.length} guild members; 429 retries: ${fflogsStats.rateLimitRetries}`,
  );
}
