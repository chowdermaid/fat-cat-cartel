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
- `/memberProfiles/{lodestoneId}`: editable profile fields such as `bio`, `birthday` as `MM-DD`, `mainJobs`, timezone, favorites, favorite content type, and optional `clubhouseHatId`. Hat IDs are `fat-cat-cartel-fedora`, `cartel-flat-cap`, `cartel-witch-hat`, `fat-cat-avatar-ears`, and `cartel-tiny-crown`; absent IDs display the fedora.
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
- `/calendarEventRequests/{requestId}`: temporary Housecat event requests awaiting Boss or Underpaw approval.
- `/calendarSync/discordPlanner`: Raid Helper sync diagnostics.
- `/birthdayNotifications/{yyyy-mm-dd}/{lodestoneId}`: scheduled Discord birthday notification guard and send status.
- `/adminOAuthStates/{stateHash}`: short-lived hashed Discord OAuth state records.
- `/adminSessions/{sessionIdHash}`: hashed web session records.
- `/gameServerAccess/{discordUserId}`: private Palworld-only grants, preserved in place.
- `/dragonwildsServerAccess/{discordUserId}`: private independent Dragonwilds grants; empty until separately granted. Live Boss/Underpaw admins bypass both lists. Browser reads/writes are denied at both roots. The manager loads only the selected list; the unused candidate endpoint additionally reads `/members` and `/discordLinksByLodestone`.
- `/gameServerSettings/{serverId}`: admin-owned game-server availability settings. Palworld uses `enabled`, optional `disabledMessage`, `updatedAt`, and `updatedBy`.
- `/gameServerIdleState/{serverId}`: small auto-stop state for idle countdown. Palworld stores `idleSince`, `autoStopEligibleAt`, and `updatedAt`.
- `/gameServerCost/{serverId}/monthly/{yyyy-mm}`: compact monthly estimated compute cost snapshots. Palworld stores estimated AUD compute cost, running hours, hourly rate, instance type, and update timestamp.
- `/gameServerAuditLog/{serverId}/{logId}`: bounded game-server start/stop audit entries. The app keeps the newest 50 entries per server and shows the newest 25 to admins.
- `/tools/spudJar`: public complaint jar with current `total`, completed `cycle`, `updatedAt`, and stable `updatedBy` Discord identity. Browsers can read it but cannot write it directly.
- `/discordLinks/{discordUserId}` and `/discordLinksByLodestone/{lodestoneId}`: Discord link records.
- `/memberExclusions/{lodestoneId}`: admin-deleted members that should not be reimported.
- `/friendRefreshQueue/{jobId}`: queued Discord Friend signup refresh jobs.

## Ownership Boundaries

- Lodestone sync writes member names, servers, avatar URLs, and job levels.
- FFLogs refresh writes member `name`, `server`, `fflogsId`, raid stats, and removes stale FFLogs-linked members. It should not clobber `avatarUrl`.
- Tomestone refresh writes recent activity, raid member summaries, and may enrich missing member identity fields.
- FC collection refresh writes collectibles and member collection data.
- Calendar sync writes Raid Helper planner events and diagnostics.
- Housecat event requests are written by Functions, reviewed by Boss/Underpaw callables, and deleted on approve or deny.
- Birthday notifications are claimed and marked by Functions so each member can be wished only once per local Sydney date.
- Admin UI can edit Easter participants, member profiles, `fcRank`, and manual member entries through callables.
- Verified FC members can add and undo Spud Jar complaints. Only Boss/Underpaw sessions can reset it. Each operation uses one atomic transaction and stores no complaint history.
- Manual member adds may be overwritten by the next Lodestone or FFLogs sync.
- Discord signup can add Friend records and queue source refreshes.
- Discord `/clear-channel` writes no RTDB data. It uses Discord API reads and deletes only, with request count proportional to the number of recent messages in the cleared channel.

`database.rules.json` currently allows public reads for app data and denies client writes for admin-owned paths. Treat public reads as an application choice, not a privacy guarantee.

## Firebase Functions

Functions are exported from `functions/src/index.ts`.

- `refreshFFLogs`: scheduled FFLogs refresh.
- `triggerFFLogsRefresh`: callable admin FFLogs refresh.
- `dailyMaintenance`: scheduled daily maintenance refresh for Tomestone raid stats, FC collection, and Discord planner events. It runs at 8:00 AM Australia/Sydney and logs each subtask result.
- `triggerTomestoneRaidStatsRefresh`: callable admin Tomestone refresh.
- `triggerFCCollectionRefresh`: callable admin collection refresh.
- `importLodestoneMembers`: callable Lodestone roster and portrait sync.
- `refreshFriendSignup`: event-driven Discord Friend signup worker. It runs when `/friendRefreshQueue/{jobId}` is created.
- `sendBirthdayWishes`: shared scheduled Discord notification worker. Its UTC triggers preserve birthday delivery at 7:00 AM Australia/Sydney across daylight saving and send one hardcoded Jumbo Cactpot DM at 7:00 PM fixed AEST each Saturday. Unused daylight-saving triggers exit without Firebase or Discord calls. Birthday runs read member profiles, members, and Discord links once, write a small guard/status record per birthday, and post one Discord message per birthday. The weekly Cactpot reminder adds two small Discord API requests and no Firebase data access.
- `deleteMember`: callable admin deletion.
- `upsertMember`: callable admin add or restore.
- `refreshMemberSource`: callable admin per-member source refresh.
- `triggerDiscordPlannerSync`: callable admin planner sync.
- `createRaidHelperEvent`: callable admin event creation.
- `submitCalendarEventRequest`: callable Housecat event request creation; sends one Discord DON-channel notification.
- `listCalendarEventRequests`: callable admin one-time pending request read.
- `approveCalendarEventRequest`: callable admin approval; creates a Raid Helper event and deletes the request.
- `denyCalendarEventRequest`: callable admin denial; deletes the request.
- `searchMeowketItems`: callable admin XIVAPI craftable item search for Meowket Board. It returns compact item results and writes no Firebase data.
- `calculateMeowketProfit`: callable admin XIVAPI recipe/material resolver and Universalis price lookup for Meowket Board. Optional child material mode adds bounded XIVAPI recipe lookups, batches item IDs per world, times out external API calls, and writes no Firebase data.
- `discordInteractions`: HTTP Discord slash-command handler for linking, friend signup/status, profile view, and admin-only `/clear-channel`. Clearing a channel writes no Firebase data and calls Discord message APIs in batches.
- `getGameServers` and `getGameServerStatus`: callable game-server reads. They require a valid base session plus live Boss/Underpaw bypass or an active grant for the selected game; catalog filters by both independent grants before status work. Reads are manual except the bounded start-wait polling after a user clicks Start.
- `getGameServerTelemetry`: callable background player and CloudWatch telemetry read. The Palworld page requests it only after the fast status response reports a running instance.
- `startGameServer` and `stopGameServer`: selected-game EC2 controls using scoped authorization, `/gameServerSettings/{serverId}` and `/gameServerAuditLog/{serverId}`. Credentials stay inside Functions. Disabling availability blocks controls without stopping the host or deleting grants.
- `listGameServerEvents`: callable game-server audit read for allowed game-server users. It returns the newest 5 selected-game action entries and does not use AWS credentials.
- `getGameServerSettings` and `updateGameServerSettings`: callable admin game-server settings management. Updates write a settings audit entry and do not use AWS credentials.
- `listGameServerAccess`, `listGameServerAccessCandidates`, `upsertGameServerAccess`, and `deleteGameServerAccess`: callable live-admin grant management scoped by `serverId`, default Palworld when omitted.
- `listGameServerAuditLog`: callable admin audit-log read. It returns the newest 25 selected-game action entries and does not use AWS credentials.
- `autoStopIdleGameServers`: scheduled Palworld idle guard. It runs every 10 minutes, skips when Palworld is disabled, and only stops the configured instance after 30 continuous minutes with zero confirmed players.
- `addSpudJarComplaints` and `undoSpudJarComplaint`: member-authorized atomic updates to `/tools/spudJar`. Additions and removals accept a validated batch of 1 through 1,000 complaints. `resetSpudJar` is a Boss/Underpaw-only atomic reset.

Function code uses `firebase-admin` and direct Admin SDK RTDB writes. App feature code should still use `src/lib/db.ts`.

## Spud Jar Cost Notes

- Each open `/spud-jar` page keeps one live listener on the small `/tools/spudJar` record. This realtime read is core to cross-session coin drops and replaces polling.
- The browser animates and counts every add or remove click immediately while silently batching the net backend change. Every click restarts a trailing three-second timer; opposite unflushed clicks cancel locally, and no max-wait or click-count trigger can submit while changes are still arriving. The signed unflushed change is stored per user in session storage and validated up to 1,000 complaints in either direction. In-flight local changes bridge the Function response and RTDB listener so persisted batches do not replay animations. Each flushed batch uses one callable invocation, one live Discord member-role validation, and one small RTDB transaction.
- Batched removal can cross a visual jar boundary without losing the lifetime count. Boss/Underpaw UI also exposes a separated, confirmed reset control.
- The jar stores one aggregate record only. Historical complaints do not add bodies, database children, or growing downloads. At 105 coins, the atomic add advances `cycle`, carries any batch overflow into `total`, and the UI breaks the full jar before rendering a new one. The displayed lifetime counter is `cycle * 105 + total`, so only visible coins reset at capacity. Legacy totals above 105 normalize into cycles on read and persist in normalized form on the next mutation.
- Matter.js is MIT licensed and loaded as a separate browser chunk only when the Spud Jar physics hook mounts. Coin Jar Pro source and assets are not reused.

## Game Server Cost Notes

Phase 7 catalog compatibility: optional `includeDragonwilds` defaults to false; current frontend explicitly sends true. Selection happens before grant/config/status work. Legacy requests read only the selected Palworld grant and perform no Dragonwilds status/AWS work. Opted-in requests retain the Phase 5 two-entry authorization and fast catalog costs below. No new callables, writes, listeners, polling or catalog telemetry. Source-backed Dragonwilds telemetry/idle costs remain a separate prerequisite; no deployment occurred. See the [release handoff](../DRAGONWILDS_PHASE_7_HANDOFF.md).

Phase 5 authorization costs: non-admin session bootstrap reads two individual Discord-ID grant entries (one additional small Dragonwilds read); verified admin bootstrap reads no grants. Catalog reads both individual entries once and performs at most one live-admin fallback. Selected detail/telemetry/action/event/access-status calls read only their selected entry once; active direct grants avoid Discord lookup. Admin fallback reuses the validated base session and does not reread grants. Catalog performs no settings/config/AWS work for hidden games and remains telemetry-free. Ordinary membership grants neither game.

The admin selector makes one selected-list call and one selected-settings call, each still guarded by live admin verification. Grant upsert reads/writes one selected entry; delete removes one selected entry. Grant mutations refresh only that list; settings saves update only the selected settings response plus existing audit work. Candidate support still reads roster, links and the selected list, but the UI does not invoke it. No grant migration, copy job, new Firebase listener, scheduled authorization polling or per-player call is added. Existing action/audit/availability costs and the scheduler remain unchanged. Client identity/capability changes discard pending read sharing; superseding an in-flight manual read may require one fresh replacement request.

The following Phase 4 record describes that phase's incremental costs; Phase 5 replaces its shared-authorization assumptions.

Phase 4 adds the Dragonwilds dashboard using the existing callable contracts. Authorized entry makes one status and one five-event read, followed by telemetry only for an enabled running host. Status refresh does not refresh events; activity refresh does not refresh status. An action adds its callable, one status refresh and one event refresh, with conditional running telemetry. Successful pending startup adds at most 48 status calls, ten seconds apart after each completed read, and one telemetry call on reaching running. Manual refresh, access/identity changes and unmount cancel waiting; normal viewing and Stop add no polling. Superseding an in-flight read may require a fresh replacement read after it settles. Catalog still makes one callable with no telemetry. No new listeners, per-player calls, backend paths or authorization checks are added. Browser verification remains pending; see the Phase 4 implementation record.

Phase 2 backend groundwork supports `palworld` and `dragonwilds`; Phase 4 frontend integration exists locally, with browser verification and deployment still pending. Dragonwilds defaults disabled and uses separate settings/cost/idle/audit paths with independent grants implemented in Phase 5. Catalog uses fast status only (up to two EC2 describes, no SSM/CloudWatch). Dragonwilds running telemetry uses one describe plus one CloudWatch query, returns unknown player count and makes no SSM player request; manual stop skips that optional telemetry. The ten-minute scheduler adds a Dragonwilds settings read and, when configured/enabled, an idle-state read/reset as needed, but makes no Dragonwilds AWS calls or automatic stops. See [Dragonwilds backend behavior and costs](dragonwilds-server-implementation.md#7-phase-2-backend-groundwork). Existing Palworld detail/action costs below otherwise remain unchanged.

- `/gameserver` and `/gameserver/palworld` use callable Functions for on-demand status only.
- Game-server pages reuse `admin_session_token`; `DISCORD_GAME_SERVER_REDIRECT_URI` is not required.
- Initial and manual refresh render from a fast status Function first, then call a background telemetry Function only when the instance is running. A running-server refresh therefore uses two Function invocations and two EC2 describe requests, followed by one SSM Run Command player REST read and CloudWatch metric reads; the extra lightweight status phase prevents SSM polling from blocking the page render.
- Status reads increment one small current-month cost snapshot when Palworld is running and the instance type has a configured hourly rate. The previous month snapshot is read for display only.
- Start polling calls status every 10 seconds for up to 8 minutes after a user clicks Start.
- Start and stop each call one Function, one or more EC2 requests, and one small audit-log write.
- The auto-stop scheduler runs every 10 minutes. It uses the same SSM Run Command player REST read, resets idle state when the server is not running, when players are online, or when player count is unavailable, and only stops after 30 continuous minutes with zero confirmed players.
- There are no client RTDB listeners or frontend AWS SDK imports for game-server control.
- Required AWS IAM actions are `ec2:DescribeInstances`, `ec2:StartInstances`, `ec2:StopInstances`, `ssm:SendCommand`, `ssm:GetCommandInvocation`, and CloudWatch metric read access such as `cloudwatch:GetMetricData`. The EC2 instance must be managed by SSM and able to run `AWS-RunShellScript`. No terminate or delete operation is implemented.
- Palworld REST player reads use plain Functions config string `PALWORLD_ADMIN_PASSWORD`; this value stays server-side and is never sent to React. The player list returned to the frontend excludes IP addresses.
- For RAM/disk display, two AWS permission surfaces are required:

Firebase Functions AWS user needs CloudWatch read access:

```json
{
  "Sid": "AllowReadCloudWatchMetrics",
  "Effect": "Allow",
  "Action": [
    "cloudwatch:GetMetricData",
    "cloudwatch:GetMetricStatistics",
    "cloudwatch:ListMetrics"
  ],
  "Resource": "*"
}
```

The Palworld EC2 instance role needs CloudWatch Agent write access so RAM/disk metrics are published. Prefer attaching AWS managed policy `CloudWatchAgentServerPolicy` to the instance role. If using an inline policy instead, include:

```json
{
  "Sid": "AllowCloudWatchAgentMetrics",
  "Effect": "Allow",
  "Action": [
    "cloudwatch:PutMetricData",
    "ec2:DescribeVolumes",
    "ec2:DescribeTags",
    "logs:PutLogEvents",
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:DescribeLogStreams"
  ],
  "Resource": "*"
}
```

The CloudWatch Agent must publish `mem_used_percent` and `disk_used_percent` under the configured namespace, default `CWAgent`, with an `InstanceId` dimension matching `PALWORLD_INSTANCE_ID`.

## Related Docs

- Collection shape and refresh details: `docs/fc-collection-implementation.md`.
- Raid stats shape and refresh details: `docs/raid-stats-implementation.md`.
- Admin auth and protected callables: `docs/admin-auth-implementation.md`.
- Calendar events: `docs/calendar-events-implementation.md`.
- Cleanup inventory: `docs/database-cleanup-inventory.md`.

## Clubhouse Hat Updates

Self-edit and admin profile saves validate `clubhouseHatId` through existing callables. Null explicitly selects the fedora; an omitted field preserves any saved selection for older clients. Unknown IDs or wrong types fail validation. Both operations update known profile children rather than replacing the profile node. No migration or additional read, write request, listener, or Function invocation is added. Existing profile payloads gain one short string; SVGs are bundled frontend assets. Deploy updated profile Functions before the frontend.

### Phase 6 verification and cost limits

Malformed Palworld player rows now invalidate the entire query result instead of disappearing from the list. Unknown telemetry clears idle eligibility; only a valid empty list can establish zero. This adds no calls, reads, writes, listeners or stored history beyond existing query-failure handling. Dragonwilds telemetry and automatic-stop gates remain unchanged. Operational-path emulator coverage and sanitized callable/audit assertions are recorded in the [Phase 6 checklist](../DRAGONWILDS_PHASED_IMPLEMENTATION.md#phase-6-local-implementation-record---29-september-2026).

Budget the second host separately: instance hourly rate ? running hours; EBS provisioned GB-month plus applicable IOPS/throughput; backup GB-month and requests; chargeable transfer and public IPv4 hours; CloudWatch metrics/log ingestion/retention/API usage; applicable SSM or management-network costs. Record region, instance/storage selections, currency, pricing date and running/stopped assumptions before attaching amounts. Those inputs remain unknown, so no total-price acceptance is claimed. EC2 stop does not eliminate storage, backup or other retained-resource costs. Dashboard estimates remain approximate compute-only values.

One ten-minute schedule is retained (4,320 invocations per 30-day month). Dragonwilds adds one settings read each run and, only when enabled/configured, one idle-state read plus a reset write if old eligibility exists. Its gated scheduler makes no AWS requests. Catalog remains one callable with up to two authorized fast status reads and no telemetry. Detail refresh and bounded startup polling retain the documented Phase 4/5 request budget. Audits retain 50 entries per game; player history is not stored.
