# Database Cleanup Inventory

This document tracks the Realtime Database branches that are currently used by the app and the branches that look safe to review for cleanup.

## Live Top-Level Branches

Observed live top-level branches:

- `/discordLinks`
- `/discordLinksByLodestone`
- `/discordSignupIssues`
- `/adminOAuthStates`
- `/adminSessions`
- `/events`
- `/calendarEvents`
- `/calendarSync`
- `/fcCollection`
- `/guildMembers`
- `/memberActivity`
- `/memberExclusions`
- `/memberProfiles`
- `/memberProgressionGraphs`
- `/memberSyncStatus`
- `/members`
- `/membersLastUpdated`
- `/participants`
- `/portraitCache`
- `/portraitOverrides`
- `/raidStats`

## Keep

Core app data:

- `/members`: canonical tracked character records keyed by Lodestone ID.
- `/membersLastUpdated`: cache invalidation timestamp for member identity reads.
- `/memberProfiles`: editable profile data such as bio, birthday, main jobs, timezone, favorite owned mount and minion IDs, and favorite content type.
- `/events/easter2026/participants`: archived Easter 2026 scoreboard and admin data.
- `/calendarEvents`: normalized read-only Discord Event Planner imports used by `/calendar`.
- `/calendarSync/discordPlanner`: sync diagnostics for the admin Calendar Sync panel.

Collection data:

- `/fcCollection/collectibles`: FFXIV Collect catalogs and `lastFetched`.
- `/fcCollection/memberData`: per-character owned collectible cache.

Raid and activity data:

- `/raidStats/lastUpdated`: admin status timestamp.
- `/raidStats/sourceStatus`: Tomestone refresh diagnostics.
- `/raidStats/fflogsSourceStatus`: FFLogs refresh diagnostics.
- `/raidStats/zones/{zoneId}`: active raid stats data used by the raid stats dashboard and member profiles.
- `/memberActivity/{lodestoneId}/tomestone/recent`: compact Tomestone activity rows used by member profiles and admin sync status.
- `/memberSyncStatus/{lodestoneId}/{source}`: active per-member source refresh metadata used by the admin members table. Full and single-member refreshes write this path for `lodestone`, `collection`, `tomestone`, and `fflogs`.

Discord and sync coordination:

- `/discordLinks`: Discord user to Lodestone link records.
- `/discordLinksByLodestone`: reverse lookup for Discord linking.
- `/discordSignupIssues`: private signup conflict diagnostics.
- `/adminOAuthStates`: short-lived hashed Discord OAuth state records for web admin login.
- `/adminSessions`: hashed web admin session records authorized by Boss and Underpaw Discord role IDs. Session records include the linked Lodestone ID, character name, FC rank, and avatar URL copied from `/members/{lodestoneId}`.
- `/memberExclusions`: admin-deleted members that should not be reimported.
- `/friendRefreshQueue`: queued Discord Friend signup refresh jobs.

## Generated And Rebuildable

These branches are active, but they are generated from external sources. They can be deleted only if you are comfortable with temporary missing UI data until refreshes complete.

- `/fcCollection/collectibles`
- `/fcCollection/memberData`
- `/raidStats/zones`
- `/raidStats/sourceStatus`
- `/raidStats/fflogsSourceStatus`
- `/memberActivity`
- `/memberProgressionGraphs`

`/memberProgressionGraphs` is only used by the exported `getTomestoneProgressionGraph` callable cache. The current member profile UI does not call it.

## Cleanup Candidates

These branches were present live but are not referenced by current app or function code:

- `/portraitOverrides`
- `/portraitCache`
- `/guildMembers`
- `/participants`
- `/fcCollection/cache`
- `/raidStats/members`
- `/raidStats/parseHistogram`

`/participants` appears to be a root-level legacy event branch. Current Easter data lives under `/events/easter2026/participants`.

`/fcCollection/cache` appears to be a prior collection schema. Current code reads `/fcCollection/collectibles` and `/fcCollection/memberData`.

`/raidStats/members` and `/raidStats/parseHistogram` appear to be prior top-level raid stats branches. Current code reads zone-scoped data under `/raidStats/zones/{zoneId}`.

## Orphan Cleanup Rules

After removing obvious legacy branches, a safer second pass is to remove records whose IDs no longer exist under `/members`.

Candidate orphan paths:

- `/memberProfiles/{lodestoneId}`
- `/fcCollection/memberData/{lodestoneId}`
- `/memberActivity/{lodestoneId}`
- `/memberProgressionGraphs/{lodestoneId}`
- `/memberSyncStatus/{lodestoneId}`
- `/adminOAuthStates/{stateHash}` when `expiresAt` is in the past.
- `/adminSessions/{sessionIdHash}` when `expiresAt` is in the past.
- `/raidStats/zones/{zoneId}/members/{lodestoneId}`
- `/raidStats/zones/{zoneId}/parses/{lodestoneId}`

Do not remove an orphan automatically if it exists under `/memberExclusions` and you want to preserve the deletion audit trail.

## Emulator Data

Use emulator imports for normal local development when validating RTDB rules, Functions, Discord OAuth, collection pages, raid stats, and admin flows.

Expected import shape:

```text
emulator-data/
  firebase-export-metadata.json
  database_export/
    fat-cat-cartel-default-rtdb.json
```

Start local Functions and RTDB with:

```bash
firebase emulators:start --only functions,database --import=emulator-data --export-on-exit=emulator-data
```

The export metadata should point the database emulator at `database_export`. The RTDB data file name must match the database namespace used by the app, such as `fat-cat-cartel-default-rtdb.json`.

When checking imported data through emulator REST, include the namespace:

```text
http://127.0.0.1:9000/members/20439006.json?ns=fat-cat-cartel-default-rtdb
```

Private branches such as `/discordLinks`, `/discordLinksByLodestone`, `/adminSessions`, `/adminOAuthStates`, `/memberExclusions`, and `/friendRefreshQueue` should not be readable through client REST. A `401` for those paths is expected because rules deny public reads. Firebase Functions can still read them through the Admin SDK.

Be careful with committed emulator exports. Full production exports can contain Discord IDs, Lodestone link records, OAuth session metadata, signup diagnostics, and other operational data. Commit only intentionally sanitized exports, or keep full exports local and gitignored.

## Local Storage Keys

These are browser cache keys, not Realtime Database paths:

- `admin_session_token`: localStorage key for the opaque Discord-backed web session token.
- `theme`
- `fcc_members_v3`
- `fcc_collection_v3`
- `fcc_collectibles_v1`
- `fcc_collection_scope_v1`
- `fcc_raidstats_v4_{zoneId}`
- `fc-member-filter-{type}`

Older local keys such as `admin_authed`, `fcc_collection_v2`, `fcc_raidstats_v2_*`, and `fcc_raidstats_v3_*` can be ignored or cleared from browsers. They are not database cleanup targets.

## Suggested Cleanup Flow

1. Export or backup Realtime Database.
2. Remove the obvious unused branches listed under cleanup candidates.
3. Run a dry-run orphan scan comparing branch child keys against `/members`.
4. Delete confirmed orphans with a multipath update.
5. Refresh Lodestone, collection, Tomestone, and FFLogs from admin.
6. Check the admin member table sync columns for missing or partial statuses.
