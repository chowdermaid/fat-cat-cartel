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
- Config: `FFLOGS_CLIENT_ID`; secret: `FFLOGS_CLIENT_SECRET`.

Tomestone functions:

- `dailyMaintenance`: scheduled daily at `0 8 * * *` Australia/Sydney and runs the Tomestone refresh alongside FC collection and Discord planner sync.
- `triggerTomestoneRaidStatsRefresh`: callable admin refresh.
- `refreshMemberSource`: callable admin per-member refresh. Use source `tomestone` or `fflogs` for raid-related single-member refreshes.
- `getTomestoneProgressionGraph`: still exported as a callable, but the member profile UI no longer uses it because Tomestone progression graph rows were not reliable as per-activity pull history.
- Secret: `TOMESTONE_BEARER_TOKEN`.

Related refreshes:

- `dailyMaintenance` and `triggerFCCollectionRefresh`: FFXIV Collect data.
- `importLodestoneMembers`: Lodestone roster and portrait sync.
- `refreshFriendSignup`: runs when `/friendRefreshQueue/{jobId}` is created. It processes the queued Discord Friend signup job and refreshes Lodestone, FFXIV Collect, Tomestone, and FFLogs data for the signed-up character.
- `deleteMember`: callable admin deletion. It removes a tracked character from generated raid paths and writes an exclusion so later syncs do not reimport the character.
- `upsertMember`: callable admin add or restore. It creates the member record and clears any existing exclusion.

## Database Shape

### Retired DMU tracker

The completed DMU tracker has been removed. `/dmu-prog` uses normal not-found behavior, and `triggerDmuProgressRefresh` and its `DMU_PROGGERS` parameter declaration are removed. Delete the deployed callable before removing `/raidStats/dmuProgress`, allowing its 300-second execution window to drain first. This branch contains the tracker's player pull histories, activity, summary, timestamp, and source diagnostics; remove it from local emulator exports too.

Normal Dancing Mad raid results under `/raidStats/zones/76`, member Tomestone activity and profiles, shared diagnostics, and the generic progression graph cache remain active. Shared Tomestone refreshes do not write the retired tracker branch. The retirement removes tracker page reads and manual refresh costs without changing daily maintenance.

### UCOB static tracker

`/ucob-prog` displays The Coils Cartel as one static, with `src/assets/icons/dragon.svg` in the header and sidebar. The graph endpoint uses `src/assets/fatcathi.png` inside a shadcn Avatar with a gold border. It uses Lodestone ID `20439006` as its Tomestone source and assumes that character has no earlier UCOB attempts. All of that character's UCOB progression is included, including any future runs outside the static. The static is not a `/members` entry and needs no roster lookup.

The public page reads `/raidStats/ucobProgress` once on entry and on Reload. Refresh progress is available to signed-in linked members, including before the first cache exists. `triggerUcobProgressRefresh` calls `requireMemberSession`, which verifies live Discord guild roles, the Discord-to-Lodestone link, and the current tracked character. A base Discord login alone does not permit refresh, and admin status is not required. The callable uses the existing `TOMESTONE_BEARER_TOKEN` secret and `UCOB_SOURCE_LODESTONE_ID` plain config parameter (default `20439006`). It fetches UCOB's progression graph and activity page one, then writes one static record with points, summary, up to 24 recent sessions, timestamp, and source status. The caller's linked character does not replace the configured static source. It is manual only; daily maintenance does not refresh this branch.

Graph percentages represent overall remaining progression. `displayPercent` preserves Tomestone's boss/phase text separately; phase shading is inferred from observed pulls and is approximate. Best-so-far is recomputed in pull order. Pull time sums only supplied pull durations and shows partial coverage when durations are missing; session time is not substituted. Recent activity is the latest activity page, not a full session archive. Recent sessions use compact bordered tiles in a responsive grid, with small date/stat icons, total pulls, best result, optional clears/clear time, and conditional FFLogs report links. AnimeJS staggers up to 12 visible tiles when the grid enters view and only newly added session IDs after refresh; unchanged reloads do not replay it. Reduced motion skips the animation and cleanup restores styles. Pull details and report links are available in the chart tooltip; there is no separate Recent Pulls card.

The progress section above the graph uses shadcn's Radix Progress primitive for an 8px continuous bar, with the gold-bordered 36px cat at its filled endpoint and the percentage above its avatar. Fill is 100 minus the lowest valid overall remaining percentage across recorded pulls, so later wipes do not move it backwards. There is no enclosing card surface, heading, visible state label, pull-detail footer, underline, check, or dash. A compact text row directly below the bar shows each phase number and boss name on one line, with muted labels except for the furthest phase's brighter text. It has no background or separators and wraps naturally on narrow screens. The cached data contains no verified percentage thresholds for phase boundaries, so label spacing is categorical and does not divide the quantitative bar into invented percentage regions. Phase states use the highest recognised phase across recorded pulls, and earlier stages are passed even when intermediate records are missing. Missing/invalid phase labels leave all labels muted while valid overall values still fill the bar; unavailable percentage data leaves it indeterminate. Recorded clearance fills the bar and completes all stages. Both themes and reduced motion are supported, using existing loaded data with no additional Firebase operations.

Feature-local AnimeJS hooks reveal the header, progress section, chart, and session heading once with a 320ms fade and 8px rise when visible, using entrance delays of 0/120/240/360ms respectively. Layout effects prepare opacity before paint to avoid a fully rendered flash; cleanup and reduced motion restore the original styles. Initial session cards follow a 60ms stagger starting at 360ms, while new sessions after refresh retain the shorter 45ms stagger without an entrance delay. Initial known progress and pull counts render at their actual values. Changed progress animates the fill, avatar, and percentage together over 450ms, replacing CSS transitions only within this feature; changed pull counts animate over 350ms. Other changed stats and the newly active phase label fade over 180ms. Screen-reader values remain at the actual current data throughout numeric animations. Unchanged values do not animate, live reduced-motion changes settle numeric displays at their current targets, and effects release animations, observers, and listeners on cleanup. Graph lines and tooltips remain immediate. No additional reads, writes, or calls are introduced.

Malformed data, external failures, duplicate pull numbers, and responses with fewer pulls than the same source's saved history reject the refresh without overwriting the last successful cache. Live UCOB payload validation and desktop/mobile browser inspection remain release checks; local tests use representative Tomestone-shaped fixtures rather than claiming live-source accuracy.

Cost: one tracker read/download per page entry or Reload. Successful manual refresh adds one callable invocation, existing linked-member authorization work, two initial Tomestone requests (up to four attempts per request on 429), one tracker-cache read, one tracker-cache write, and one browser reload read. The request count includes retries. Allowing linked members to refresh broadens who can incur this existing per-click cost; the request/read/write budget per refresh is unchanged because admin authorization already included member validation. Downloads and writes grow with the one static's pull history; recent sessions are capped at 24. No new listeners, polling, scheduled jobs, member-wide reads, or database rules are needed: existing `/raidStats` public-read/client-write-denied rules apply.

Local verification: `npm --prefix functions run build`, `node --test functions/lib/ucob-progress.test.js`, `node --test tests/ucob-progress-client.test.mjs`, `node --experimental-test-module-mocks --test tests/ucob-animations.test.mjs`, `npm run build`, and targeted ESLint for the new feature/backend files. Stub mode seeds sample progression without a sample-data label. `VITE_DEV_AUTH_LAYER=true` with stub mode enables persona-based linked-member refresh testing, with no external API requests. Server rendering checks populated/empty/error page states and refresh visibility; animation-hook tests cover updates, interruptions, visibility, cleanup, and reduced motion using mocked React effects and animation handles. These do not replace browser inspection. Neither local path verifies production rules or live Discord/Tomestone behavior.

Deployment: deploy the new `triggerUcobProgressRefresh` callable with the existing Tomestone and Discord secrets available, then publish the frontend. Initial population requires a signed-in linked member clicking Refresh progress. No production deployment is performed by the implementation task.

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

Member deletion and signup coordination:

- `/memberExclusions/{lodestoneId}` is written by admin delete and read by Lodestone, FFLogs, and Discord signup flows. A record here means the character should not be reimported automatically.
- `/friendRefreshQueue/{jobId}` stores queued Discord Friend signup refresh jobs. Jobs start as `queued`, move to `running`, and finish as `done` or `error` with per-source results.
- `/memberSyncStatus/{lodestoneId}/{source}` stores per-member source refresh metadata for `lodestone`, `collection`, `tomestone`, and `fflogs`.

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
- Skips members listed under `/memberExclusions` so admin deletions survive later FFLogs refreshes.
- Writes `/memberSyncStatus/{lodestoneId}/fflogs` success for resolved members included in the refresh, and error metadata for members whose per-character rankings failed.

Tomestone refresh:

- Reads all tracked `/members`, including Friends.
- Fetches each character profile and recent activity sequentially with a small delay to reduce Tomestone 429s.
- Retries 429 responses with `Retry-After` or increasing backoff before recording a member failure.
- Paginates activity until no next page or activity older than the retention window is reached.
- Writes compact per-member recent activity to `/memberActivity/{lodestoneId}/tomestone/recent`.
- Merges activity into `/raidStats/zones/{zoneId}/members/{lodestoneId}` summaries.
- Writes up to 30 recent activities per zone to `/raidStats/zones/{zoneId}/recentActivity`.
- Writes `/raidStats/sourceStatus` with request count, tracked member count, failed member count, and up to 20 failures.
- May enrich `/members/{lodestoneId}` with Tomestone name, server, avatar URL when missing, and `tomestoneProfile`.
- Writes `/memberSyncStatus/{lodestoneId}/tomestone` success when the profile fetch succeeds. Recent activity failures are recorded in source diagnostics but do not make the member status fail.

Friend signup refresh:

- Discord signup writes the Friend to `/members/{lodestoneId}` with `fcRank: "Friend"` and queues `/friendRefreshQueue/{jobId}`.
- The event-driven queue worker refreshes Lodestone identity and job levels, collection ownership, Tomestone activity, and FFLogs parses for that one character.
- A failure in one source does not block the other sources. The job result records which sources succeeded or failed.
- Each source refresh writes `/memberSyncStatus/{lodestoneId}/{source}` with success or error metadata.
- Discord signup refuses characters that exist in `/memberExclusions`.

## Frontend Behavior

Raid Stats dashboard:

- Uses FFLogs parse data for performance views, histograms, job distribution, all-stars, and encounter tables.
- Joins Tomestone zone member summaries to show clears, wipes, latest activity, best progress, and most played job where available.
- Merges FFLogs parse members and Tomestone-only members so Friends with activity but no parse data can still appear in Friends-inclusive views.
- Supports FC-only and FC plus Friends scope through the shared collection scope helper.

Member profiles:

- Read FFLogs parses across current Savage, Trials, and Alliance tabs.
- Read Tomestone activity from `/memberActivity/{lodestoneId}/tomestone/recent`.
- Render `Raid Activity Insights` from stored Tomestone activity only:
  - Encounters (default): Recharts stacked clear/wipe bars grouped by zone, encounter, and content type, sorted by attempts.
  - Jobs: Recharts donut counting activity records per normalized job, with job icons, counts, and percentages in the legend and tooltip.
  - Heatmap: calendar-style day grid with clear and wipe intensity.
- A compact top-right header summary shows latest activity, top known job, recent clears, and wipes. Title and tabs stay on the left; charts span the full panel width below. The header wraps on narrow screens.
- Use shadcn tooltips and scroll areas for custom chart hover and scroll behavior.
- Do not call `getTomestoneProgressionGraph` from the UI.

Admin refresh controls:

- Collection: `triggerFCCollectionRefresh`
- Tomestone: `triggerTomestoneRaidStatsRefresh`
- FFLogs: `triggerFFLogsRefresh`
- Lodestone: `importLodestoneMembers`
- Single member source refresh: `refreshMemberSource`

These callable refreshes require `adminSessionToken`. Firebase Functions validate the Discord session server-side with the configured Boss and Underpaw role IDs before running any admin refresh. Discord Administrator permission is not checked.

The admin member table also reads `/fcCollection/memberData`, `/memberActivity`, `/raidStats/zones/73/parses`, and `/memberSyncStatus` to show per-member sync status columns for Collection, Tomestone, FFLogs, and Lodestone. Missing, stale, failed, no ID, no data, no activity, and unknown-age states expose a per-source refresh button in the status cell. Collection can fall back to `/fcCollection/memberData/{lodestoneId}/lastFetched` and Lodestone can fall back to `/members/{lodestoneId}/jobLevelsLastFetched` when sync metadata is not present. Tomestone and FFLogs require `/memberSyncStatus` because global timestamps do not prove a specific member refreshed successfully. Tooltips explain the reason for each state.

Admin deletion uses a shadcn confirmation dialog before calling `deleteMember`. The function removes the character from `/members`, generated collection data, Tomestone activity, progression graph cache, and raid zone member or parse entries, then recomputes zone histograms.

## Cache Keys

- `fcc_members_v3`: member identity cache.
- `fcc_raidstats_v4_{zoneId}`: raid stats zone cache.
- `fcc_collectibles_v1`: member profile collectible lookup.
- `fcc_collection_scope_v1`: shared FC / FC and Friends scope.

Admin FFLogs and Tomestone refreshes clear member and raid stats caches so Friend records and new activity do not display as stale or unknown. Admin delete and profile save also clear matching local caches.

## Cost Notes

Tomestone runs hourly and makes roughly two initial API requests per tracked member: profile and activity page one. Extra activity pages are fetched only while recent rows remain within the retention window.

FFLogs runs daily by default to reduce quota pressure. Manual refresh remains available in admin. The current implementation logs 429 retry counts but does not preflight the FFLogs quota before manual refresh.

The member profile insights do not add Firebase or external API cost beyond the existing member profile reads. They reuse the already loaded Tomestone activity array in memory.

The admin member table sync status read adds three one-shot reads when the member list changes: `/fcCollection/memberData`, `/memberActivity`, and `/raidStats/zones/73/parses`.

## Verification

Run these checks after raid-stat changes:

```bash
cd functions
npm run build
```

```bash
npm run build
```

Use Firebase emulator mode for normal local development so raid stats pages exercise production-shaped RTDB data, database rules, and callable admin refreshes.

Recommended root `.env.local` or local `.env` values:

```bash
VITE_USE_STUBS=false
VITE_USE_DATABASE_EMULATOR=true
VITE_DATABASE_EMULATOR_HOST=127.0.0.1
VITE_DATABASE_EMULATOR_PORT=9000
VITE_USE_FUNCTIONS_EMULATOR=true
```

Start local Functions and RTDB with imported data:

```bash
firebase emulators:start --only functions,database --import=emulator-data --export-on-exit=emulator-data
```

The import should include `emulator-data/firebase-export-metadata.json` and `emulator-data/database_export/fat-cat-cartel-default-rtdb.json`. With emulator mode enabled, `/members`, `/raidStats`, `/memberActivity`, and `/memberSyncStatus` are read from the local RTDB emulator.

Use `VITE_USE_STUBS=true` only as an offline fallback. The in-memory stub includes FFLogs-shaped parse data and Tomestone-shaped activity data, but it does not exercise RTDB rules or callable Functions.
