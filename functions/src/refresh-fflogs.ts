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
import { memberSyncError, memberSyncSuccess } from "./member-sync-status";

// ─── Raw API types ────────────────────────────────────────────────────────────

interface RawMember {
  id: number;
  name: string;
  server: { slug: string };
}

type CharacterRankings = {
  id?: number | null;
  name?: string | null;
  lodestoneID?: string | number | null;
  server?: { slug?: string | null } | null;
} & Record<string, RawZoneRankings | null | string | number | { slug?: string | null } | undefined>;

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

function emptyHistogramForZone(zone: (typeof ZONES)[number]): Record<string, { savage: ParseBuckets; normal: ParseBuckets }> {
  const histogram: Record<string, { savage: ParseBuckets; normal: ParseBuckets }> = {};
  for (const enc of zone.encounters) {
    histogram[enc.key] = { savage: emptyBuckets(), normal: emptyBuckets() };
  }
  return histogram;
}

function toParseData(r: RawEncounterRanking): ParseData | null {
  if (!r.rankPercent || !r.spec || r.bestAmount === 0) return null;
  return { percentile: r.rankPercent, rdps: r.bestAmount, job: r.spec };
}

function buildCharacterParseEntries(
  char: CharacterRankings | null,
  memberName: string,
): Record<number, ParseEntry> {
  const entries: Record<number, ParseEntry> = {};
  for (const zone of ZONES) {
    const entry: ParseEntry = { savage: {}, normal: {}, allStars: null };

    if (char) {
      const fflogsId = zone.fflogsZoneId ?? zone.id;
      if (zone.contentType === "savage") {
        const savageRankings = char[`z${zone.id}_s`] as RawZoneRankings | null | undefined;
        const normalRankings = char[`z${zone.id}_n`] as RawZoneRankings | null | undefined;

        for (const r of savageRankings?.rankings ?? []) {
          const enc = zone.encounters.find((e) => e.id === r.encounter.id);
          if (!enc) continue;
          const pd = toParseData(r);
          if (pd) entry.savage[enc.key] = pd;
        }

        for (const r of normalRankings?.rankings ?? []) {
          const enc = zone.encounters.find((e) => e.id === r.encounter.id);
          if (!enc) continue;
          const pd = toParseData(r);
          if (pd) entry.normal[enc.key] = pd;
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
        const rankings = char[`z${fflogsId}`] as RawZoneRankings | null | undefined;
        for (const r of rankings?.rankings ?? []) {
          const enc = zone.encounters.find((e) => e.id === r.encounter.id);
          if (!enc) {
            console.log(
              `[fflogs-dbg] Unknown encID ${r.encounter.id} (${r.encounter.name}) in zone ${zone.id} for ${memberName}`,
            );
            continue;
          }
          const pd = toParseData(r);
          if (pd) entry.normal[enc.key] = pd;
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

    entries[zone.id] = entry;
  }
  return entries;
}

function recomputeHistogramForZone(
  zone: (typeof ZONES)[number],
  parses: Record<string, ParseEntry>,
): Record<string, { savage: ParseBuckets; normal: ParseBuckets }> {
  const histogram = emptyHistogramForZone(zone);
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

export async function runRefreshFFLogsMember(
  clientId: string,
  clientSecret: string,
  lodestoneId: string,
): Promise<void> {
  const db = admin.database();
  const exclusionSnap = await db.ref(`memberExclusions/${lodestoneId}`).get();
  if (exclusionSnap.exists()) {
    throw new Error(`Member ${lodestoneId} is excluded from automatic tracking`);
  }

  const token = await getFFLogsToken(clientId, clientSecret);
  const fflogsStats: { rateLimitRetries: number; rateLimitUntil?: number } = {
    rateLimitRetries: 0,
  };
  const data = (await queryFFLogs(
    token,
    buildCharacterZonesQuery(ZONES, "lodestoneID"),
    { lodestoneID: Number(lodestoneId) },
    2,
    fflogsStats,
  )) as { characterData: { character: CharacterRankings | null } };
  const char = data.characterData.character;
  if (!char) {
    throw new Error(`No FFLogs character found for Lodestone ${lodestoneId}`);
  }

  const name = typeof char.name === "string" ? char.name : `Lodestone ${lodestoneId}`;
  const entries = buildCharacterParseEntries(char, name);
  const now = Date.now();
  const updates: Record<string, unknown> = {
    "raidStats/lastUpdated": now,
    membersLastUpdated: now,
  };
  if (char.id != null) updates[`members/${lodestoneId}/fflogsId`] = String(char.id);
  if (typeof char.name === "string") updates[`members/${lodestoneId}/name`] = char.name;
  if (char.server && typeof char.server === "object" && "slug" in char.server && char.server.slug) {
    updates[`members/${lodestoneId}/server`] = char.server.slug;
  }

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    const existingParses = ((await db.ref(`${prefix}/parses`).get()).val() ?? {}) as Record<string, ParseEntry>;
    const nextParses = {
      ...existingParses,
      [lodestoneId]: entries[zone.id],
    };
    updates[`${prefix}/parses/${lodestoneId}`] = entries[zone.id];
    updates[`${prefix}/histogram`] = recomputeHistogramForZone(zone, nextParses);
    updates[`${prefix}/lastUpdated`] = now;
  }

  await db.ref("/").update(updates);
  console.log(`[fflogs] refreshed member ${lodestoneId}; 429 retries: ${fflogsStats.rateLimitRetries}`);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runRefreshFFLogs(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const token = await getFFLogsToken(clientId, clientSecret);
  const db = admin.database();
  const fflogsStats: { rateLimitRetries: number; rateLimitUntil?: number } = {
    rateLimitRetries: 0,
  };

  // 1. Guild members (lodestoneID now included in query)
  const membersPayload = (await queryFFLogs(token, GUILD_MEMBERS_QUERY, {
    guildID: GUILD_ID,
  }, 2, fflogsStats)) as {
    guildData: { guild: { members: { data: RawMember[] } } };
  };
  const rawMembers = membersPayload.guildData.guild.members.data;
  console.log(`[fflogs] ${rawMembers.length} guild members`);

  const [existingMembersSnap, exclusionsSnap] = await Promise.all([
    db.ref("members").get(),
    db.ref("memberExclusions").get(),
  ]);
  const existingMembers = (existingMembersSnap.val() ?? {}) as Record<string, MemberNode>;
  const memberExclusions = (exclusionsSnap.val() ?? {}) as Record<string, unknown>;

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

  for (const zone of ZONES) {
    zoneParses[zone.id] = {};
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
          character: CharacterRankings | null;
          };
        };
        const char = data.characterData.character;
        const lodestoneID = char?.lodestoneID != null ? String(char.lodestoneID) : null;
        if (member.source === "friend" && char) friendLookupSuccesses++;
        return { member, char, lodestoneID, error: null };
      } catch (err) {
        console.warn(`[fflogs] Failed rankings for ${member.name}:`, err);
        return {
          member,
          char: null,
          lodestoneID: null,
          error: err instanceof Error ? err.message : "Unknown FFLogs error.",
        };
      }
    },
    1,
  );
  console.log(
    `[fflogs] Friend Lodestone lookups succeeded ${friendLookupSuccesses}/${friendLookupAttempts}`,
  );
  const friendLookupFailures = memberRankings
    .filter(
      (entry): entry is typeof entry & { member: Extract<RankingTarget, { source: "friend" }> } =>
        entry.member.source === "friend" && !entry.char,
    )
    .map(({ member }) => ({
      lodestoneId: member.lodestoneIdHint,
      name: member.name,
      fflogsId: member.fflogsIdHint ?? null,
    }));

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

  // 4. Build fresh successful per-zone parse entries, keyed by lodestoneId
  for (const { member, char } of memberRankings) {
    if (!char) continue;
    const memberKey =
      member.source === "friend"
        ? (member.fflogsIdHint ?? member.lodestoneIdHint)
        : String(member.id);
    const lodestoneId = effectiveLodestoneId.get(memberKey);
    if (!lodestoneId) continue;
    if (memberExclusions[lodestoneId]) continue;

    const entries = buildCharacterParseEntries(char, member.name);
    for (const zone of ZONES) {
      zoneParses[zone.id][lodestoneId] = entries[zone.id];
    }
  }

  // 5. Build members node keyed by lodestoneId (avatarUrl managed exclusively by scrape-lodestone)
  const membersNode: Record<string, MemberNode> = {};
  for (const { member, lodestoneID } of memberRankings) {
    if (member.source !== "guild") continue;
    const fflogsId = String(member.id);
    const lodestoneId = lodestoneID ?? lodestoneByFflogsId.get(fflogsId) ?? null;
    if (!lodestoneId) continue;
    if (memberExclusions[lodestoneId]) continue;
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
    "raidStats/fflogsSourceStatus": {
      checkedAt: now,
      guildMembers: rawMembers.length,
      rankingTargets: rankingTargets.length,
      friendLookupAttempts,
      friendLookupSuccesses,
      friendLookupFailures: friendLookupFailures.slice(0, 20),
      rateLimitRetries: fflogsStats.rateLimitRetries,
      ...(fflogsStats.rateLimitUntil
        ? { rateLimitUntil: fflogsStats.rateLimitUntil }
        : {}),
    },
    ...(fflogsStats.rateLimitUntil
      ? { "raidStats/fflogsRateLimitUntil": fflogsStats.rateLimitUntil }
      : {}),
    membersLastUpdated: now,
  };

  // Per-field member writes keyed by lodestoneId; never clobber avatarUrl set by the Lodestone scraper.
  const activeFflogsIds = new Set(rawMembers.map((m) => String(m.id)));
  const removedLodestoneIds = new Set<string>();
  for (const [lodestoneId, m] of Object.entries(existingMembers)) {
    if (memberExclusions[lodestoneId]) {
      removedLodestoneIds.add(lodestoneId);
      updates[`members/${lodestoneId}`] = null;
      continue;
    }
    if (m.fcRank === "Friend") continue;
    if (m.fflogsId && !activeFflogsIds.has(m.fflogsId)) {
      removedLodestoneIds.add(lodestoneId);
      updates[`members/${lodestoneId}`] = null;
    }
  }
  for (const [lodestoneId, node] of Object.entries(membersNode)) {
    updates[`members/${lodestoneId}/name`] = node.name;
    updates[`members/${lodestoneId}/server`] = node.server;
    updates[`members/${lodestoneId}/fflogsId`] = node.fflogsId;
  }
  const fflogsStatusLodestoneIds = new Set<string>();
  for (const { member, char } of memberRankings) {
    if (member.source !== "friend" || !char?.id) continue;
    if (memberExclusions[member.lodestoneIdHint]) continue;
    updates[`members/${member.lodestoneIdHint}/fflogsId`] = String(char.id);
    if (char.name) updates[`members/${member.lodestoneIdHint}/name`] = char.name;
    if (char.server?.slug) {
      updates[`members/${member.lodestoneIdHint}/server`] = char.server.slug;
    }
  }
  for (const { member, char, error } of memberRankings) {
    const memberKey =
      member.source === "friend"
        ? (member.fflogsIdHint ?? member.lodestoneIdHint)
        : String(member.id);
    const lodestoneId = effectiveLodestoneId.get(memberKey);
    if (
      !lodestoneId ||
      memberExclusions[lodestoneId] ||
      fflogsStatusLodestoneIds.has(lodestoneId)
    ) {
      continue;
    }
    fflogsStatusLodestoneIds.add(lodestoneId);
    updates[`memberSyncStatus/${lodestoneId}/fflogs`] = error
      ? memberSyncError(now, error)
      : memberSyncSuccess(
        "fflogs",
        now,
        now,
        "fflogs refreshed.",
        {
          fflogsId: char?.id != null
            ? String(char.id)
            : member.source === "friend"
              ? (member.fflogsIdHint ?? null)
              : String(member.id),
        },
      );
  }

  const existingZoneParses = new Map<number, Record<string, ParseEntry>>();
  await Promise.all(
    ZONES.map(async (zone) => {
      const snap = await db.ref(`raidStats/zones/${zone.id}/parses`).get();
      existingZoneParses.set(
        zone.id,
        (snap.val() ?? {}) as Record<string, ParseEntry>,
      );
    }),
  );

  for (const zone of ZONES) {
    const prefix = `raidStats/zones/${zone.id}`;
    const mergedParses: Record<string, ParseEntry> = {
      ...(existingZoneParses.get(zone.id) ?? {}),
    };
    for (const lodestoneId of removedLodestoneIds) {
      delete mergedParses[lodestoneId];
    }
    Object.assign(mergedParses, zoneParses[zone.id]);

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
    updates[`${prefix}/parses`] = mergedParses;
    updates[`${prefix}/histogram`] = recomputeHistogramForZone(zone, mergedParses);
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
