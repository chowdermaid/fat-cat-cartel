# Firebase Data And Costs

This app uses Firebase Realtime Database for public app data and Firebase Functions for external refreshes, admin mutations, and callable operations.

## Data Access Rules

- Always import Realtime Database helpers from `src/lib/db.ts`.
- Do not import from `firebase/database` in feature code.
- `src/lib/db.ts` switches between real Firebase and `db.stub.ts` based on `VITE_USE_STUBS`.
- Direct Firebase app access is only needed for callable Functions.
- Existing callable pattern: import `firebaseApp` from `src/lib/firebase`, guard when null, then dynamically import `firebase/functions`.
- Treat `.env` as secret and gitignored. Never commit Firebase credentials.

## Cost And Read Rules

The project is on Blaze, but design for free-tier headroom.

- Prefer `get` reads plus local React state or localStorage cache.
- Use `onValue` only where live updates are core, such as admin active management and Easter scoreboard.
- Avoid polling.
- Keep RTDB payloads small.
- Do not store derived data that can be computed client-side unless it avoids larger external API or Function cost.
- Batch multi-path updates in Functions when refreshing large data sets.
- When proposing or implementing a Firebase feature, call out read, write, download, and Function invocation impact.
- Preserve or invalidate matching cache keys when changing data writes.

## Cache Keys

- `fcc_members_v3`: shared member list, 3-hour TTL.
- `fcc_collection_v3`: FC collection aggregate, 3-hour TTL.
- `fcc_raidstats_v4_{zoneId}`: raid stats per zone.
- `fcc_collectibles_v1`: member profile collectible lookup, 24-hour TTL.
- `fcc_collection_scope_v1`: FC or FC plus Friends collection scope.
- `theme`: dark mode preference.
- `admin_session_token`: opaque Discord-backed web session token.

Older local keys such as `admin_authed`, `fcc_collection_v2`, `fcc_raidstats_v2_*`, and `fcc_raidstats_v3_*` can be ignored or cleared from browsers.

## Database Shape

Important RTDB paths:

- `/members/{lodestoneId}`: canonical member records keyed by Lodestone ID. Fields include `name`, `server`, `fflogsId`, `avatarUrl`, and `fcRank`.
- `/memberProfiles/{lodestoneId}`: editable profile fields such as `bio`, `birthday` as `MM-DD`, `mainJobs`, timezone, favorites, and favorite content type.
- `/fcCollection/collectibles/{mounts|minions|titles|achievements}`: FFXIV Collect item data keyed by item ID.
- `/fcCollection/collectibles/lastFetched`: collection refresh timestamp.
- `/fcCollection/memberData/{lodestoneId}`: avatar, owned collectible IDs, previous counts, and `lastFetched`.
- `/raidStats/lastUpdated`: global FFLogs refresh timestamp.
- `/raidStats/sourceStatus`: Tomestone refresh diagnostics.
- `/raidStats/fflogsSourceStatus`: FFLogs refresh diagnostics.
- `/raidStats/zones/{zoneId}`: zone meta, parses keyed by Lodestone ID, Tomestone member summaries, histograms, recent kill, first kills, and recent activity.
- `/memberActivity/{lodestoneId}/tomestone/recent`: compact Tomestone activity rows.
- `/memberSyncStatus/{lodestoneId}/{source}`: per-member source refresh metadata.
- `/events/easter2026/participants/{participantId}`: archived Easter event scores and totals.
- `/calendarEvents/{eventId}`: normalized planner events.
- `/calendarSync/discordPlanner`: Raid Helper sync diagnostics.
- `/adminOAuthStates/{stateHash}`: short-lived hashed Discord OAuth state records.
- `/adminSessions/{sessionIdHash}`: hashed web session records.
- `/discordLinks/{discordUserId}` and `/discordLinksByLodestone/{lodestoneId}`: Discord link records.
- `/memberExclusions/{lodestoneId}`: admin-deleted members that should not be reimported.
- `/friendRefreshQueue/{jobId}`: queued Discord Friend signup refresh jobs.

## Ownership Boundaries

- Lodestone sync writes member names, servers, avatar URLs, and job levels.
- FFLogs refresh writes member `name`, `server`, `fflogsId`, raid stats, and removes stale FFLogs-linked members. It should not clobber `avatarUrl`.
- Tomestone refresh writes recent activity, raid member summaries, and may enrich missing member identity fields.
- FC collection refresh writes collectibles and member collection data.
- Calendar sync writes Raid Helper planner events and diagnostics.
- Admin UI can edit Easter participants, member profiles, `fcRank`, and manual member entries through callables.
- Manual member adds may be overwritten by the next Lodestone or FFLogs sync.
- Discord signup can add Friend records and queue source refreshes.

`database.rules.json` currently allows public reads for app data and denies client writes for admin-owned paths. Treat public reads as an application choice, not a privacy guarantee.

## Firebase Functions

Functions are exported from `functions/src/index.ts`.

- `refreshFFLogs`: scheduled FFLogs refresh.
- `triggerFFLogsRefresh`: callable admin FFLogs refresh.
- `refreshTomestoneRaidStats`: scheduled Tomestone refresh.
- `triggerTomestoneRaidStatsRefresh`: callable admin Tomestone refresh.
- `refreshFCCollection`: scheduled FFXIV Collect refresh.
- `triggerFCCollectionRefresh`: callable admin collection refresh.
- `importLodestoneMembers`: callable Lodestone roster and portrait sync.
- `refreshFriendSignup`: scheduled Discord Friend signup worker.
- `deleteMember`: callable admin deletion.
- `upsertMember`: callable admin add or restore.
- `refreshMemberSource`: callable admin per-member source refresh.
- `syncDiscordPlannerEvents`: scheduled Raid Helper planner sync.
- `triggerDiscordPlannerSync`: callable admin planner sync.
- `createRaidHelperEvent`: callable admin event creation.

Function code uses `firebase-admin` and direct Admin SDK RTDB writes. App feature code should still use `src/lib/db.ts`.

## Related Docs

- Collection shape and refresh details: `docs/fc-collection-implementation.md`.
- Raid stats shape and refresh details: `docs/raid-stats-implementation.md`.
- Admin auth and protected callables: `docs/admin-auth-implementation.md`.
- Calendar events: `docs/calendar-events-implementation.md`.
- Cleanup inventory: `docs/database-cleanup-inventory.md`.
