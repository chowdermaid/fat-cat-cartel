# Database Cleanup Inventory

This document tracks the Realtime Database branches that are currently used by the app and the branches that look safe to review for cleanup.

## Live Top-Level Branches

Observed live top-level branches:

- `/discordLinks`
- `/discordLinksByLodestone`
- `/discordSignupIssues`
- `/events`
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
- `/memberProfiles`: editable profile data such as bio, birthday, and main jobs.
- `/events/easter2026/participants`: archived Easter 2026 scoreboard and admin data.

Collection data:

- `/fcCollection/collectibles`: FFXIV Collect catalogs and `lastFetched`.
- `/fcCollection/memberData`: per-character owned collectible cache.

Raid and activity data:

- `/raidStats/lastUpdated`: admin status timestamp.
- `/raidStats/sourceStatus`: Tomestone refresh diagnostics.
- `/raidStats/fflogsSourceStatus`: FFLogs refresh diagnostics.
- `/raidStats/zones/{zoneId}`: active raid stats data used by the raid stats dashboard and member profiles.
- `/memberActivity/{lodestoneId}/tomestone/recent`: compact Tomestone activity rows used by member profiles and admin sync status.
- `/memberSyncStatus/{lodestoneId}/{source}`: per-member source refresh metadata used by the admin members table.

Discord and sync coordination:

- `/discordLinks`: Discord user to Lodestone link records.
- `/discordLinksByLodestone`: reverse lookup for Discord linking.
- `/discordSignupIssues`: private signup conflict diagnostics.
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
- `/raidStats/zones/{zoneId}/members/{lodestoneId}`
- `/raidStats/zones/{zoneId}/parses/{lodestoneId}`

Do not remove an orphan automatically if it exists under `/memberExclusions` and you want to preserve the deletion audit trail.

## Local Storage Keys

These are browser cache keys, not Realtime Database paths:

- `admin_authed`
- `theme`
- `fcc_members_v3`
- `fcc_collection_v3`
- `fcc_collectibles_v1`
- `fcc_collection_scope_v1`
- `fcc_raidstats_v4_{zoneId}`
- `fc-member-filter-{type}`

Older local keys such as `fcc_collection_v2`, `fcc_raidstats_v2_*`, and `fcc_raidstats_v3_*` can be ignored or cleared from browsers. They are not database cleanup targets.

## Suggested Cleanup Flow

1. Export or backup Realtime Database.
2. Remove the obvious unused branches listed under cleanup candidates.
3. Run a dry-run orphan scan comparing branch child keys against `/members`.
4. Delete confirmed orphans with a multipath update.
5. Refresh Lodestone, collection, Tomestone, and FFLogs from admin.
6. Check the admin member table sync columns for missing or partial statuses.
