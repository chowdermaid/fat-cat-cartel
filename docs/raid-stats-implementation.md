# Raid Stats Implementation

## Data Sources

Raid stats use two backend data sources:

- **FFLogs** owns parse performance: percentile, rDPS, all-stars, histograms, recent kills, and first kills.
- **Tomestone** owns recent activity: clears, wipes, best progress, jobs used, kill duration, report URL, participant count, and compact profile enrichment.

The frontend never calls FFLogs or Tomestone directly. Firebase Functions fetch external data with server-side secrets and write compact Realtime Database summaries.

## Firebase Functions

FFLogs functions:

- `refreshFFLogs`: scheduled daily at `0 11 * * *`.
- `triggerFFLogsRefresh`: callable admin refresh.
- Secrets: `FFLOGS_CLIENT_ID`, `FFLOGS_CLIENT_SECRET`.

Tomestone functions:

- `refreshTomestoneRaidStats`: scheduled hourly.
- `triggerTomestoneRaidStatsRefresh`: callable admin refresh.
- `getTomestoneProgressionGraph`: still exported as a callable, but the member profile UI no longer uses it because Tomestone progression graph rows were not reliable as per-activity pull history.
- Secret: `TOMESTONE_BEARER_TOKEN`.

Related refreshes:

- `refreshFCCollection` and `triggerFCCollectionRefresh`: FFXIV Collect data.
- `importLodestoneMembers`: Lodestone roster and portrait sync.

## Database Shape

FFLogs-owned paths:

- `/raidStats/lastUpdated`
- `/raidStats/zones/{zoneId}/meta`
- `/raidStats/zones/{zoneId}/lastUpdated`
- `/raidStats/zones/{zoneId}/parses`
- `/raidStats/zones/{zoneId}/histogram`
- `/raidStats/zones/{zoneId}/recentKill`
- `/raidStats/zones/{zoneId}/firstKills`
- `/members/{lodestoneId}/fflogsId`

Tomestone-owned paths:

- `/raidStats/sourceStatus`
- `/raidStats/zones/{zoneId}/members/{lodestoneId}`
- `/raidStats/zones/{zoneId}/recentActivity`
- `/memberActivity/{lodestoneId}/tomestone/recent`
- `/members/{lodestoneId}/tomestoneProfile`
- `/memberProgressionGraphs/{lodestoneId}/{encounterKey}` only for the unused progression graph callable cache.

`/memberActivity/{lodestoneId}/tomestone/recent` stores compact rows:

```ts
{
  id: string,
  lodestoneId: string,
  encounterKey: string,
  encounterName: string,
  zoneId: number,
  zoneName: string,
  contentType: string,
  job: string | null,
  jobAbbr: string | null,
  startedAt: number,
  endedAt: number | null,
  clearCount: number,
  wipeCount: number,
  bestProgress: number | null,
  killDuration: string | null,
  reportUrl: string | null,
  participantCount: number
}
```

Friends are normal tracked people under `/members/{lodestoneId}` with `fcRank: "Friend"`. FFLogs resolves Friend characters by Lodestone ID and writes the resolved `fflogsId` back to the member record when available.

## Refresh Behavior

FFLogs refresh:

- Reads the configured FFLogs guild roster.
- Includes Friend records from `/members` by querying FFLogs character data with Lodestone ID.
- Writes parse rankings by Lodestone ID into `/raidStats/zones/{zoneId}/parses`.
- Writes histograms, recent kills, first kills, and resolved member `fflogsId` values.
- Deduplicates zones that share an FFLogs zone ID through the query builder.
- Tracks and logs 429 retries during GraphQL calls. No persistent `/raidStats/rateLimit` object is currently written.
- Skips stale cleanup for Friend records so Friends are not deleted by guild roster sync.

Tomestone refresh:

- Reads all tracked `/members`, including Friends.
- Fetches each character profile and recent activity.
- Paginates activity until no next page or activity older than the retention window is reached.
- Writes compact per-member recent activity to `/memberActivity/{lodestoneId}/tomestone/recent`.
- Merges activity into `/raidStats/zones/{zoneId}/members/{lodestoneId}` summaries.
- Writes up to 30 recent activities per zone to `/raidStats/zones/{zoneId}/recentActivity`.
- Writes `/raidStats/sourceStatus` with request count, tracked member count, failed member count, and up to 20 failures.
- May enrich `/members/{lodestoneId}` with Tomestone name, server, avatar URL when missing, and `tomestoneProfile`.

## Frontend Behavior

Raid Stats dashboard:

- Uses FFLogs parse data for performance views, histograms, job distribution, all-stars, and encounter tables.
- Joins Tomestone zone member summaries to show clears, wipes, latest activity, best progress, and most played job where available.
- Supports FC-only and FC plus Friends scope through the shared collection scope helper.

Member profiles:

- Read FFLogs parses across current Savage, Trials, and Alliance tabs.
- Read Tomestone activity from `/memberActivity/{lodestoneId}/tomestone/recent`.
- Render `Raid Activity Insights` from stored Tomestone activity only:
  - Timeline: one activity point per stored activity.
  - Progress: best boss HP or cleared state per encounter.
  - Jobs: 50/50 donut and job breakdown with job icons.
  - Heatmap: calendar-style day grid with clear and wipe intensity.
- Use shadcn tooltips and scroll areas for custom chart hover and scroll behavior.
- Do not call `getTomestoneProgressionGraph` from the UI.

Admin refresh controls:

- Collection: `triggerFCCollectionRefresh`
- Tomestone: `triggerTomestoneRaidStatsRefresh`
- FFLogs: `triggerFFLogsRefresh`
- Lodestone: `importLodestoneMembers`

## Cache Keys

- `fcc_members_v3`: member identity cache.
- `fcc_raidstats_v3_{zoneId}`: raid stats zone cache.
- `fcc_collectibles_v1`: member profile collectible lookup.
- `fcc_collection_scope_v1`: shared FC / FC and Friends scope.

Admin FFLogs and Tomestone refreshes should clear member and raid stats caches so Friend records and new activity do not display as stale or unknown.

## Cost Notes

Tomestone runs hourly and makes roughly two initial API requests per tracked member: profile and activity page one. Extra activity pages are fetched only while recent rows remain within the retention window.

FFLogs runs daily by default to reduce quota pressure. Manual refresh remains available in admin. The current implementation logs 429 retry counts but does not preflight the FFLogs quota before manual refresh.

The member profile insights do not add Firebase or external API cost beyond the existing member profile reads. They reuse the already loaded Tomestone activity array in memory.

## Verification

Run these checks after raid-stat changes:

```bash
cd functions
npm run build
```

```bash
npm run build
```

Use `VITE_USE_STUBS=true` for local UI work. The in-memory stub includes FFLogs-shaped parse data and Tomestone-shaped activity data.
