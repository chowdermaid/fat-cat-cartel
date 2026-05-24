# FFLogs Infrastructure Handoff

## Project Context

Fat Cat Cartel is a React/Firebase app for an FFXIV Free Company.

FFLogs data is fetched in Firebase Functions and written to Firebase Realtime Database. The frontend does not call FFLogs directly.

Relevant files:

- `functions/src/refresh-fflogs.ts`
- `functions/src/fflogs-queries.ts`
- `functions/src/fflogs-auth.ts`
- `functions/src/zones.ts`
- `functions/src/index.ts`
- `src/features/raid-stats/*`
- `src/features/member-profile/*`
- `src/features/admin/components/FCMembersManager.tsx`

## Current FFLogs Function Exports

In `functions/src/index.ts`:

- `refreshFFLogs`: scheduled every 3 hours.
- `triggerFFLogsRefresh`: callable admin refresh.
- `checkFFLogsRefreshQuota`: used before callable refresh to avoid blowing quota.

Secrets:

- `FFLOGS_CLIENT_ID`
- `FFLOGS_CLIENT_SECRET`

Auth:

- `functions/src/fflogs-auth.ts` gets OAuth token via FFLogs client credentials.
- Token is cached in-process until near expiry.

## FFLogs Query Wrapper

File: `functions/src/fflogs-queries.ts`

`queryFFLogs(token, query, variables, maxRetries, stats)`:

- Calls `https://www.fflogs.com/api/v2/client`.
- Retries HTTP 429 up to `maxRetries`.
- If FFLogs `Retry-After` is over 30 seconds, fails instead of holding the Cloud Function.
- Tracks `stats.requests` and `stats.rateLimitRetries`.

There is also a `RATE_LIMIT_QUERY` used to inspect FFLogs quota.

## Rate Limit Guardrails

File: `functions/src/refresh-fflogs.ts`

Important helpers:

- `readRateLimitData`
- `checkFFLogsRefreshQuota`
- `estimateRefreshPointsNeeded`
- `shouldSkipLowPriorityWork`

Behavior:

- Callable admin refresh checks quota before running.
- Refresh logs current rate-limit usage.
- If rate-limit usage is at least 80%, lower-priority report metadata refresh is skipped.
- Final `/raidStats/rateLimit` is written with usage data, `checkedAt`, `requestsThisRefresh`, `rateLimitRetries`, and `skippedReportMetadata`.

## Zone Config

File: `functions/src/zones.ts`

`ZONES` defines raid, trial, alliance, and ultimate zones and encounters.

Some zones use `fflogsZoneId`.

Meaning:

- Firebase path uses local `zone.id`.
- FFLogs API query uses `zone.fflogsZoneId`.

This matters especially for ultimates where multiple local zones share one FFLogs API zone.

## Character Query Model

File: `functions/src/fflogs-queries.ts`

`buildCharacterZonesQuery(zones, lookup)` builds a GraphQL character query.

Supported lookup modes:

```ts
lookup: "id" | "lodestoneID"
```

Guild members use:

```graphql
character(id: $charID)
```

Friends use:

```graphql
character(lodestoneID: $lodestoneID)
```

This was live-verified against FFLogs:

- `character(lodestoneID: 51400555)` resolves.
- It returned FFLogs character ID, Lodestone ID, name, server, and zone rankings.

The generated character query fetches:

- `id`
- `name`
- `lodestoneID`
- `server { slug }`
- `zoneRankings` for all configured zones

Savage zones fetch both difficulty 101 and 100. Other zones fetch without explicit difficulty. Aliases use forms like `z73_s`, `z73_n`, or `z59`.

## Tracked People Model

There is no `/friends` path.

All tracked people live under:

```txt
/members/{lodestoneId}
```

Friend identity:

```ts
fcRank: "Friend"
```

So `/members` means tracked people, not strictly FC members.

Relevant fields:

```ts
{
  name: string;
  server: string | null;
  fflogsId: string | null;
  avatarUrl: string | null;
  fcRank: string | null;
}
```

`fflogsId` is now an internal cache/status field, not something admins enter manually.

## FFLogs Refresh Flow

File: `functions/src/refresh-fflogs.ts`

High-level flow:

1. Get FFLogs OAuth token.
2. Query guild members via `GUILD_MEMBERS_QUERY`.
3. Read existing `/members`.
4. Build ranking targets:
   - All FFLogs guild members, using FFLogs character ID.
   - All `/members/{lodestoneId}` records where `fcRank === "Friend"`, using Lodestone ID.
5. Deduplicate Friends already present in guild feed if they have cached `fflogsId`.
6. Query each target's character rankings.
7. Build per-zone parse entries keyed by Lodestone ID.
8. Build histograms.
9. Write member identity updates.
10. Fetch guild report metadata if quota allows.
11. Atomic multi-path update to RTDB.

## Friend FFLogs Behavior

For each Friend:

```txt
/members/{lodestoneId}
```

If:

```ts
fcRank === "Friend"
```

Then refresh queries FFLogs by:

```graphql
character(lodestoneID: lodestoneId)
```

If successful:

- Writes parse data to `/raidStats/zones/{zoneId}/parses/{lodestoneId}`.
- Writes cached FFLogs ID to `/members/{lodestoneId}/fflogsId`.
- May update `/members/{lodestoneId}/name` and `/members/{lodestoneId}/server`.

Friend records are protected from stale guild cleanup.

## Guild Member Behavior

Guild members are pulled from FFLogs guild roster.

For guild members:

- FFLogs character ID comes from guild member data.
- Refresh queries by FFLogs ID.
- Effective Lodestone ID is FFLogs API `lodestoneID`, or existing DB lookup by `fflogsId`.

Writes:

- `/members/{lodestoneId}/name`
- `/members/{lodestoneId}/server`
- `/members/{lodestoneId}/fflogsId`

Stale cleanup:

- Non-Friend records with `fflogsId` no longer in guild feed may be removed.
- Friend records are skipped and never removed by FFLogs stale cleanup.

## Raid Stats DB Shape

Main paths:

```txt
/raidStats/lastUpdated
/raidStats/rateLimit
/raidStats/zones/{zoneId}/meta
/raidStats/zones/{zoneId}/lastUpdated
/raidStats/zones/{zoneId}/parses/{lodestoneId}
/raidStats/zones/{zoneId}/histogram
/raidStats/zones/{zoneId}/recentKill
/raidStats/zones/{zoneId}/firstKills
```

Parse entry shape:

```ts
{
  savage: {
    [encounterKey]: {
      percentile: number;
      rdps: number;
      job: string;
    };
  };
  normal: {
    [encounterKey]: {
      percentile: number;
      rdps: number;
      job: string;
    };
  };
  allStars: {
    points: number;
    worldRank: number;
    regionRank: number;
    serverRank: number;
    rankPercent: number;
    spec: string;
  } | null;
}
```

Histograms are backend-generated, but Raid Stats frontend now recomputes scoped histograms client-side for FC/Friends filtering.

## Report Metadata

Report metadata is guild-level only.

Query:

```graphql
reports(guildID: $guildID, zoneID: $zoneID, limit: 50)
```

Used to compute:

- `recentKill`
- `firstKills`

Important:

- Friends are included in per-character rankings.
- Friends are not separately included in guild report metadata unless their logs are part of guild reports.
- Report metadata is skipped if FFLogs quota is too high.

## Frontend Raid Stats

Raid Stats reads:

```txt
/raidStats/zones/{zoneId}
```

Hook:

```txt
src/features/raid-stats/api/useRaidStats.ts
```

Cache:

```txt
fcc_raidstats_v2_${zoneId}
```

Member identity join:

- Raid parse rows are keyed by Lodestone ID.
- Frontend joins parse rows against `useMembers()`.
- `useMembers()` reads `/members`.
- `useMembers()` cache key is `fcc_members_v3`.

If member cache is stale, parse rows may show as `Unknown`.

Admin Raid Stats refresh now clears:

- `fcc_raidstats_v2_*`
- `fcc_members_v3`

## FC / FC and Friends Scope

Shared scope helper:

```txt
src/features/fc-collection/hooks/useCollectionScope.ts
```

Types:

```ts
CollectionScope = "fc" | "all"
```

Storage:

```txt
fcc_collection_scope_v1
```

Behavior:

- `"fc"` excludes `fcRank === "Friend"`.
- `"all"` includes Friends.

Raid Stats uses this scope:

- `FC`: hides Friends.
- `FC and friends`: shows Friends with parse data.
- Friend badges are shown in mixed lists.

## Admin UI

File:

```txt
src/features/admin/components/FCMembersManager.tsx
```

Current behavior:

- Admin table does not show FFLogs column or "Missing."
- FFLogs ID is not editable.
- If present, `fflogsId` appears only as disabled `Resolved FFLogs ID` in profile editor.
- Admin can set `fcRank` to `Friend`.

## Member Profile Current State

Files:

- `src/features/member-profile/index.tsx`
- `src/features/member-profile/api/useMemberProfile.ts`

Member profile currently reads raid data only from:

```ts
const ZONE_ID = 73;
```

It fetches:

```txt
/raidStats/zones/73/parses/{lodestoneId}
/raidStats/zones/73/meta
```

So member profile currently shows current-zone raid summary and best parses only, not a general activity feed.

Rejected idea:

- Adding a Tomestone-like FFLogs recent activity feed by extending refresh to store `/memberActivity/{lodestoneId}/fflogs`.
- User rejected that plan and may have a better alternative.

## Commands / Verification Already Run

Passed:

```bash
npm run build
cd functions && npm run build
```

Live FFLogs verification was performed using Firebase secrets and confirmed Lodestone lookup works.

## Important Design Conclusions

- Lodestone ID is the canonical identity.
- FFLogs ID is useful but derived/internal.
- Friends should be added as `/members/{lodestoneId}` with `fcRank: "Friend"`.
- Frontend must filter Friends out of FC-only views.
- Backend FFLogs refresh can fetch Friends directly by Lodestone ID.
- Do not add `/friends`.
- Do not make admin users manually enter FFLogs IDs.
