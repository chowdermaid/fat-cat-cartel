# FC Collection Implementation

## Data Sources

FC collection data is sourced from FFXIV Collect and the app's canonical member roster.

- **FFXIV Collect** owns collectible catalogs, public ownership percentages, character avatars, and per-character owned item lists.
- **Realtime Database `/members`** owns the tracked character list. Members are keyed by Lodestone ID and may include FC ranks, including `Friend`.
- **Lodestone sync** owns member identity fields and job levels. Job levels are displayed near collection data on member profiles, but they are not FC collection data.
- **Admin and Discord flows** can add tracked people to `/members`; collection data appears after the next daily maintenance refresh or an immediate per-Friend signup refresh.

The frontend never calls FFXIV Collect directly. Firebase Functions fetch external data and write compact Realtime Database snapshots.

## Firebase Functions

Collection functions:

- `dailyMaintenance`: scheduled daily at `0 8 * * *` Australia/Sydney and runs the FC collection refresh alongside Tomestone and Discord planner sync.
- `triggerFCCollectionRefresh`: callable admin refresh.
- `refreshMemberSource`: callable admin per-member refresh. Use source `collection`.
- `retryFailedFCCollectionMembers`: scheduled every five minutes; processes up to five due failed-member retries without refreshing catalogs or successful members.
- No Firebase Function secrets are required for collection refresh.

Related functions:

- `refreshFriendSignup`: event-driven Discord Friend signup worker. It refreshes collection data for a newly signed-up Friend alongside Lodestone, Tomestone, and FFLogs when `/friendRefreshQueue/{jobId}` is created.
- `deleteMember`: callable admin deletion. It removes generated collection data for the deleted character and writes a member exclusion to prevent later reimport.
- `upsertMember`: callable admin add or restore. It clears any existing member exclusion.

Refresh implementation lives in `functions/src/refresh-fc-collection.ts`.

The function uses hard-coded FFXIV Collect Free Company ID `9235616198341716868`. It first POSTs to:

```text
https://ffxivcollect.com/api/v1/free_companies/{FC_ID}/refresh
```

That request is non-fatal. If it fails, the function continues and reads whatever FFXIV Collect data is currently available.

## Collectible Types

The shared client config lives in `src/features/fc-collection/constants.ts`.

Tracked collection types:

- `mounts`
- `minions`
- `titles`
- `achievements`

Achievements rank by points instead of count and are filtered to selected categories. The same achievement category allowlist is duplicated in `functions/src/refresh-fc-collection.ts`, so frontend and function config must stay aligned when categories change.

Achievement fetches request `limit=5000`. Other collectible lists use the default FFXIV Collect list endpoint.

## Database Shape

Collection-owned paths:

- `/fcCollection/collectibles/lastFetched`
- `/fcCollection/collectibles/mounts/{itemId}`
- `/fcCollection/collectibles/minions/{itemId}`
- `/fcCollection/collectibles/titles/{itemId}`
- `/fcCollection/collectibles/achievements/{itemId}`
- `/fcCollection/memberData/{lodestoneId}`

Related coordination paths:

- `/memberExclusions/{lodestoneId}`: deleted members that should not be reimported by Lodestone, FFLogs, or Discord signup.
- `/friendRefreshQueue/{jobId}`: queued Discord Friend signup refresh jobs.
- `/memberSyncStatus/{lodestoneId}/collection`: per-member collection refresh metadata.
- `/fcCollectionRetryQueue/{lodestoneId}`: private pending retries, with `attempts`, `failedAt`, and indexed `nextAttemptAt` fields.

Member data shape:

```ts
{
  avatar: string,
  owned: {
    mounts: number[],
    minions: number[],
    titles: number[],
    achievements: number[]
  },
  previousOwned: {
    mounts: { count: number, asOf: number },
    minions: { count: number, asOf: number },
    titles: { count: number, asOf: number },
    achievements: { count: number, asOf: number }
  },
  lastFetched: number
  lastError?: string
}
```

Collectible catalog items are stored as real objects keyed by item ID, not JSON strings. Item payloads are mostly preserved from FFXIV Collect, with achievement categories normalized into the shared `sources` shape so the UI can filter by source type.

`/fcCollection/members` is legacy. The refresh now reads from canonical `/members` only.

The live database may still contain older `/fcCollection/cache` data from a prior schema. Current collection code does not read it.

Job levels are intentionally stored outside `/fcCollection`:

- `/members/{lodestoneId}/jobLevels`
- `/members/{lodestoneId}/jobLevelsLastFetched`

Those fields are written by `importLodestoneMembers`, not by FC collection refresh.

Job levels use canonical display-name keys, for example `Paladin`, `White Mage`, `Blue Mage`, `Carpenter`, and `Miner`. Numeric levels are stored as numbers. Lodestone rows that show `-` are stored as `null`, which the profile UI displays as `--`.

Most jobs use level 100 as the max-level display threshold. Blue Mage is capped at 80, so the profile UI treats `Blue Mage: 80` as max level.

## Refresh Behavior

Scheduled or manual collection refresh:

- Reads `/members` and previous `/fcCollection/memberData`.
- Uses Lodestone IDs from `/members` as the tracked character set.
- Fetches collectible catalogs from FFXIV Collect.
- Filters achievement catalog entries by the configured category allowlist.
- Writes `/fcCollection/collectibles/lastFetched` with `Date.now()`.
- Fetches each tracked character's FFXIV Collect profile for avatar data.
- Fetches owned mounts, minions, titles, and achievements for each tracked character.
- Stores owned item IDs as arrays under `/fcCollection/memberData/{lodestoneId}/owned`.
- Writes `/memberSyncStatus/{lodestoneId}/collection` success only when all four ownership lists fetched and validated successfully.
- Stores previous owned counts from the prior refresh under `previousOwned`.
- Leaves prior member collection data untouched if an ownership request fails or returns malformed data, and records an error status.
- Writes collectibles and all member data through one multipath root update.

Ownership refresh is all-or-nothing per member. HTTP errors, network failures, invalid JSON, and unexpected item-list shapes preserve the complete previous snapshot, including avatar, previous counts, and `lastFetched`. Existing snapshots receive a small `lastError` field; a successful refresh replaces the snapshot and clears that field. New members with failed refreshes receive error status without a fabricated empty ownership snapshot. Properly formatted empty lists remain valid ownership results. Catalogs are also validated before any database write; an empty filtered catalog aborts the run rather than erasing the catalog and making all rankings zero.

The refresh processes at most three members concurrently, with up to five parallel requests each. Each GET has a 15-second timeout and at most two attempts. Network failures, HTTP 429 and HTTP 5xx can retry once. `Retry-After` is honored when its delay is at most five seconds; longer or invalid delays fail the request instead of retrying early. The FC refresh POST is best effort, has a 15-second timeout, and logs unsuccessful responses. It does not establish that all upstream character snapshots are equally fresh.

The full refresh returns `{ total, refreshed, failed }`. Admin refresh reports partial failures and retains usable values. Failed sync status preserves the last known successful timestamp where available. The catalog timestamp describes catalog retrieval only. Rankings and matrix headers display each member's successful fetch time, mark errors or data older than 26 hours as stale, and show missing snapshots as unavailable. Unavailable members have no numeric leaderboard rank; valid empty snapshots still show zero. Overview averages exclude unavailable members.

### Delayed member retries

Failed ownership refreshes from the full daily/admin run or a single-member admin/Friend refresh enqueue that member for a delayed retry. `COLLECTION_RETRY_DELAY_MS` in `functions/src/refresh-fc-collection.ts` defaults to 15 minutes, and `COLLECTION_MAX_DELAYED_RETRIES` limits each failure cycle to three delayed attempts. The existing immediate per-request retry remains unchanged. If an upstream `Retry-After` exceeds 15 minutes, the queued attempt waits until that later time.

The five-minute worker reads only the first five due entries from `/fcCollectionRetryQueue`, ordered by `nextAttemptAt`. In normal operation the first retry runs about 15 to 20 minutes after failure; a backlog can delay it further. It processes these members sequentially, fetching only their profile and four ownership lists. A transaction claims each attempt and moves its due time forward before external work, preventing overlapping workers from duplicating the same queued attempt. Claims also bound attempts if a Function stops unexpectedly.

Success updates ownership and sync status and removes the queue entry. Failure preserves the prior snapshot and schedules the next attempt 15 minutes later, unless the three-attempt limit is reached. The final failure stays visible but has no queued retry; the next daily or explicit refresh can start a new cycle. Successful normal refreshes also cancel pending retries. The worker removes entries for missing/excluded members or snapshots successfully refreshed since the queued failure. Admin deletion clears the queue entry with the existing multipath deletion. Catalog fetch failures do not enqueue the whole roster.

Deploy the updated database rules/index, `retryFailedFCCollectionMembers`, and the existing Functions that call collection refresh (`dailyMaintenance`, `triggerFCCollectionRefresh`, `refreshMemberSource`, `refreshFriendSignup`) for this behavior to become active. Deploy `deleteMember` as well for immediate queue cleanup on deletion. There is no browser listener or new frontend cache invalidation after a background retry; normal cache expiry/focus revalidation shows the recovered data.

Single-member collection refresh:

- `runRefreshFCCollectionMember(lodestoneId)` refreshes collection data for one tracked character.
- It is used by the Discord Friend signup queue worker so new Friends can get collection data without waiting for the next daily maintenance refresh.
- It replaces `/fcCollection/memberData/{lodestoneId}` only on success. On failure, it records `lastError` for an existing snapshot and throws so the admin/Friend source wrapper records failure instead of success. Catalog refresh remains owned by the full collection refresh.

## Lodestone Job Levels

The Lodestone import is related to member profiles, but it is separate from FC collection refresh.

`importLodestoneMembers` calls `fetchLodestoneCharacter(lodestoneId)` in `functions/src/scrape-lodestone.ts`. For each tracked member, the function fetches:

- `https://na.finalfantasyxiv.com/lodestone/character/{lodestoneId}/` for name, world, and portrait.
- `https://na.finalfantasyxiv.com/lodestone/character/{lodestoneId}/class_job/` for class and job levels.

The class/job page renders each job as a list row with the level and display name in sibling elements:

```html
<div class="character__job__level">100</div>
<div class="character__job__name">Paladin</div>
```

The parser reads each `<li>` job row as a unit, then maps the visible name through `JOB_ALIASES`. This matters because splitting the page by every `<div>` separates the level from the job name and can produce incorrect or missing data.

Recognized combat, crafting, and gathering jobs are written into `/members/{lodestoneId}/jobLevels`. Base classes map to their job names where needed, such as `Gladiator` to `Paladin` and `Conjurer` to `White Mage`. `Beastmaster` is recognized as a limited job value, although the current member profile UI only renders the configured visible job groups.

If no job levels are parsed for a character, Lodestone sync leaves existing `jobLevels` untouched and logs a warning instead of writing an empty object.

## Frontend Data Hook

`useFCCollection` is the shared frontend collection loader in `src/features/fc-collection/api/useFCCollection.ts`.

It reads:

- `/members`
- `/fcCollection/collectibles`
- `/fcCollection/memberData`

It returns:

- `members`: simple member identities from `/members`.
- `allCollectibles`: arrays for all configured collection types.
- `memberData`: raw per-member cache data.
- `membersWithMounts`: normalized members with owned item `Set`s for every collection type.
- `lastFetched`
- `loading`

Despite the `membersWithMounts` name, the object now contains ownership sets for mounts, minions, titles, and achievements.

The hook normalizes both array-shaped and object-shaped collectible data. This keeps the UI tolerant of Firebase array-like objects and item-ID maps.

## Frontend Routes

Routes are registered in `src/app/router.tsx`.

- `/fc-collection`: redirects to `/fc-collection/overview`.
- `/fc-collection/overview`: overview dashboard.
- `/fc-collection/collections`: collection matrix, defaulting to mounts.
- `/fc-collection/collections/$type`: collection matrix for one type.
- `/fc-collection/rankings`: member rankings.

All views are children of `FCCollectionLayout`, which owns the header, navigation, scope, and one `useFCCollection` instance. Child views consume `useCollectionView`; tab navigation replaces only the outlet content without remounting the shared loader or header. Scope and loaded collection data remain available across tab switches. Matrix filters and leaderboard controls remain local to their views.

Legacy `/fc-collection/$type` and `/fc-collection/leaderboard` URLs redirect to their corresponding canonical URLs with history replacement. Loader paths, cache keys, calculations, and shared matrix/leaderboard contracts are unchanged. Switching tabs adds no Firebase reads or refresh calls.

The overview page renders aggregate cards for all configured collectible types, FC coverage, niche achievement leaders, rarest owned item, rarest mount collector, and the leaderboard link.

The collectible detail page renders a matrix:

- Rows are collectibles.
- Columns are selected tracked members.
- Cells show owned or missing.
- The right column shows count and completion bar for visible members.

Supported filters:

- Search by item name.
- Expansion by patch range: ARR, HW, SB, ShB, EW, DT.
- Source type chips from item `sources`.
- Quick filters: all, nobody has, everyone has.
- Member picker.
- Sort by patch or name.

The leaderboard ranks members by the active collection type:

- Mounts, minions, and titles rank by owned count.
- Achievements rank by points.
- Achievement subgroups filter the scored achievement pool.
- Rows show rank, count or points, completion percentage, delta since previous refresh, and rarest owned item.

## Scope Behavior

Collection views share `useCollectionScope`.

Scopes:

- `fc`: excludes members with `fcRank === "Friend"`.
- `all`: includes FC members and Friends.

The selected scope is stored in localStorage as `fcc_collection_scope_v1`. The default is `fc`.

Friends are normal records under `/members` with `fcRank: "Friend"`. They appear in collection views only when scope is `all`, with Friend badges in member-aware controls.

Admin delete writes `/memberExclusions/{lodestoneId}` and removes `/fcCollection/memberData/{lodestoneId}`. This keeps a deleted character from reappearing in collection scope after the next Lodestone or FFLogs sync.

## Comparison UI

Category links share a fixed 40 px row with a compact, right-aligned icon, category heading, and catalog count. The tracked-member count is omitted from that row. On narrow screens, category links scroll horizontally while the summary remains visible. The matrix horizontal scrollbar has a feature-local z-index of 40, above sticky headers (30) and item cells (10).

The four comparison categories share a grouped toolbar with name search, member selection, one expansion Select, multi-source checkbox Popover, visible ownership quick filters, and patch/name sorting. Source changes apply immediately and retain OR matching. The member dialog retains draft/Cancel/Apply semantics, no selection cap, and per-category persistence owned by the grid. Mount Roulette still uses the shared picker with `defaultToAll={false}` and its existing normalization.

The matrix uses one bounded ScrollArea for both axes, with keyboard focus, sticky member headers and item names, opaque sticky backgrounds, and an Owned by selected summary. Member headers use full-catalog totals; row summaries and ownership filters use visible selected members. Item names continue opening the existing detail dialog. Reduced-motion preferences skip the comparison's scripted entrance/count/bar animations when those effects run. No Firebase reads, downloads, listeners, Functions, routes, API contracts, or cache keys were added or changed.

## Local UI State

Collection matrix member filters persist per collection type:

- `fc-member-filter-mounts`
- `fc-member-filter-minions`
- `fc-member-filter-titles`
- `fc-member-filter-achievements`

If the selected member IDs no longer exist in the current scope, the UI prunes them.

Mount roulette keeps its selected members in React state only. It does not persist its member filter.

## Related Consumers

Member profiles:

- Read `/members/{lodestoneId}` for identity, rank, server, avatar, and Lodestone-owned job levels.
- Read `/fcCollection/memberData/{lodestoneId}`.
- Read collectible catalogs for mounts and minions only.
- Cache the mount and minion lookup as `fcc_collectibles_v1`.
- Show collection totals and rarest mount or minion data from stored collection data.
- Show job levels from `/members/{lodestoneId}/jobLevels`; these do not affect FC collection cache or refresh behavior.
- Render grouped job levels in a compact grid. Max-level jobs keep a neutral tile and only highlight the level badge.
- Show the member server in the profile header only when `fcRank` is `Friend`.

Mount roulette:

- Reuses `useFCCollection`.
- Uses only the `mounts` catalog and member mount ownership.
- Supports the same FC or all scope.
- Filters by expansion, Trial or Raid source, and ownership.
- Ownership options are "nobody has it" and "at least one missing".

Discord profile status:

- `/friend status` reads `/fcCollection/memberData/{lodestoneId}` to report whether collection cache exists.
- Friend signup queues an immediate per-Friend refresh for collection data.

Admin panel:

- Shows `/fcCollection/collectibles/lastFetched`.
- Calls `triggerFCCollectionRefresh` through Firebase Functions.
- Calls `importLodestoneMembers` for names, portraits, servers, and job levels.
- Manual member profile saves clear `fcc_collection_v3` because rank changes affect FC or Friend scoping.
- Shows a Collection sync status column in the member table by reading `/fcCollection/memberData`.
- Reads `/memberSyncStatus` to identify current, stale, failed, missing, or unknown-age collection states. If metadata is missing, the table falls back to `/fcCollection/memberData/{lodestoneId}/lastFetched` for collection freshness.
- Lets admins refresh one member's collection data from that member's Collection status cell.
- Uses `deleteMember` and `upsertMember` callables in real Firebase mode. Stub mode falls back to direct local stub writes.
- Shows a shadcn confirmation dialog before member deletion.
- Passes `adminSessionToken` to admin callables. Firebase Functions validate the Discord session against configured Boss and Underpaw role IDs before writes or refreshes.

## Cache Keys

- `fcc_collection_v3`: collection dashboard and matrix cache, 3-hour TTL.
- `fcc_collectibles_v1`: member profile mount and minion lookup, 24-hour TTL.
- `fcc_collection_scope_v1`: FC or FC plus Friends scope.
- `fc-member-filter-{type}`: per-type matrix member filter.

`useFCCollection` checks `fcc_collection_v3` before reading Firebase. If the cache is fresh, state is populated from localStorage and Firebase is not read.

Admin full collection refresh clears `fcc_collection_v3` and `fcc_collectibles_v1` after the callable completes, including partial success. Single-member collection attempts also invalidate those caches, so failed attempts can expose their stale-data indicators.

Mounted collection loaders reload after same-window invalidation or cross-tab cache removal. Returning focus or visibility to a page rechecks the three-hour TTL; fresh caches cause no Firebase reads. Concurrent events share a loader's in-flight request, and an invalidation during a request discards that result before loading a replacement. Failed reads retain the displayed snapshot and surface an error. An expired browser snapshot can be shown while its replacement loads. Failed ordinary rechecks have a 30-second cooldown; admin invalidation bypasses it. Unmounted loaders remove their browser event handlers and ignore late responses.

Admin member delete clears `fcc_collectibles_v1`, the legacy `fcc_collection_v2`, and raid stat caches. Admin profile save clears `fcc_collection_v3` because rank edits can change FC or Friend scope.

## Security Rules

Current Realtime Database rules:

- `/fcCollection` is publicly readable.
- `/fcCollection/collectibles` is not client-writable.
- `/fcCollection/memberData` is not client-writable.
- `/members`, `/membersLastUpdated`, `/memberProfiles`, and `/events/easter2026/participants` are not client-writable.
- `/memberExclusions` is not publicly readable or writable.
- `/friendRefreshQueue` is not publicly readable or writable.
- `/fcCollectionRetryQueue` is not publicly readable or writable and indexes `nextAttemptAt` for bounded due-work queries.
- `/adminSessions` and `/adminOAuthStates` are not publicly readable or writable.
- `/memberSyncStatus` is publicly readable and not client-writable.

Collection writes are expected to come from Firebase Admin SDK in Functions. Public reads are an application choice, not a privacy guarantee.

## Cost Notes

Frontend collection pages use `get` reads and localStorage caching rather than live listeners.

One uncached `useFCCollection` load reads three top-level paths:

- `/members`
- `/fcCollection/collectibles`
- `/fcCollection/memberData`

That is a relatively large RTDB download because it includes all collectible catalogs and all tracked member ownership arrays. The 3-hour cache is important for Firebase download cost.

Scheduled refresh runs daily at 8:00 AM Australia/Sydney. For each run it fetches:

- One optional FC refresh endpoint.
- Four collectible catalogs.
- One character profile per tracked member.
- Four owned-list endpoints per tracked member.

Normal external requests total `5 + trackedMemberCount * 5`. Immediate retries can increase that to at most `9 + trackedMemberCount * 10` and extend Function runtime. Full refresh still uses one atomic RTDB write request; queue entries and status/error fields join that update. Single-member refresh uses one atomic root update for snapshot/status/queue changes, plus the existing source-wrapper status write. Browser expiry/invalidation can trigger another download of the same three paths per mounted loader, including collection pages in other tabs. Reloading admin sync status after a full refresh adds its existing four-path status read.

Delayed retry adds one scheduled Function every five minutes (288 invocations/day, 8,640 per 30-day month) and one indexed query returning at most five due queue entries per run. Each claimed member adds a small claim transaction, three point reads (member, exclusion, prior collection snapshot), and one atomic result update, or a cleanup transaction when skipped. Each actual member attempt makes five external GETs, up to ten with immediate retries. Three delayed attempts therefore add at most 30 external GETs per failed-member cycle. Only failures enter the queue. Queue entries are removed on success, final exhaustion, or member deletion. No new browser Firebase reads, listeners, callable invocations, or external providers are added by delayed retries.

## Local Development

Use Firebase emulator mode for normal local development so collection pages exercise production-shaped RTDB data, database rules, and callable admin refreshes.

Recommended root `.env.local` or local `.env` values:

```bash
VITE_USE_STUBS=false
VITE_USE_DATABASE_EMULATOR=true
VITE_DATABASE_EMULATOR_HOST=127.0.0.1
VITE_DATABASE_EMULATOR_PORT=9000
VITE_USE_FUNCTIONS_EMULATOR=true
```

Start the emulators with an imported RTDB export:

```bash
firebase emulators:start --only functions,database --import=emulator-data --export-on-exit=emulator-data
```

The import should include `emulator-data/firebase-export-metadata.json` and `emulator-data/database_export/fat-cat-cartel-default-rtdb.json`. With emulator mode enabled, `/members`, `/fcCollection/collectibles`, and `/fcCollection/memberData` are read from the local RTDB emulator instead of the in-memory stub.

Use `VITE_USE_STUBS=true` only as an offline fallback when Firebase credentials or emulators are not available.

The in-memory stub includes:

- `/members` with FC members and one Friend.
- Sample `/members/{lodestoneId}/jobLevels` for member profile UI.
- `/fcCollection/collectibles` with sample mounts and minions.
- Empty titles and achievements.
- `/fcCollection/memberData` for sample ownership.

Callable refreshes are available only in Firebase mode. In stub mode, `firebaseApp` is null and the admin panel shows a toast instead of calling Functions.

## Verification

Run these checks after collection UI changes:

```bash
npm run build
node --test tests/fc-collection-sync.test.mjs tests/fc-collection-routing.test.mjs
```

Run these checks after collection Function changes:

```bash
cd functions
npm run build
node --test lib/refresh-fc-collection.test.js
```

From the repository root, exercise retry persistence and overlapping claims against the local demo database emulator (build Functions first):

```bash
firebase emulators:exec --project demo-fat-cat-cartel --only database "node --test tests/database-rules.test.mjs tests/fc-collection-retry-emulator.test.mjs"
```

When changing Firebase paths or refresh behavior, test against the RTDB and Functions emulators first. Use `VITE_USE_STUBS=true` only to confirm the offline fallback still renders.
