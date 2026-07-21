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
- `/calendarEventRequests/{requestId}`: temporary Housecat event requests awaiting Boss or Underpaw approval.
- `/calendarSync/discordPlanner`: Raid Helper sync diagnostics.
- `/birthdayNotifications/{yyyy-mm-dd}/{lodestoneId}`: scheduled Discord birthday notification guard and send status.
- `/adminOAuthStates/{stateHash}`: short-lived hashed Discord OAuth state records.
- `/adminSessions/{sessionIdHash}`: hashed web session records.
- `/gameServerAccess/{discordUserId}`: game-server whitelist entries keyed by Discord ID. Boss and Underpaw admins bypass this whitelist in Functions. The admin Palworld access manager reads this with `/members` and `/discordLinksByLodestone` through an admin-only callable to show linked-member candidates and legacy entries.
- `/gameServerSettings/{serverId}`: admin-owned game-server availability settings. Palworld uses `enabled`, optional `disabledMessage`, `updatedAt`, and `updatedBy`.
- `/gameServerIdleState/{serverId}`: small auto-stop state for idle countdown. Palworld stores `idleSince`, `autoStopEligibleAt`, and `updatedAt`.
- `/gameServerCost/{serverId}/monthly/{yyyy-mm}`: compact monthly estimated compute cost snapshots. Palworld stores estimated AUD compute cost, running hours, hourly rate, instance type, and update timestamp.
- `/gameServerAuditLog/{serverId}/{logId}`: bounded game-server start/stop audit entries. The app keeps the newest 50 entries per server and shows the newest 25 to admins.
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
- `sendBirthdayWishes`: scheduled daily Discord birthday notification worker. It runs at 7:00 AM Australia/Sydney, reads member profiles, members, and Discord links once, writes a small guard/status record per birthday, and posts one Discord message per birthday.
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
- `getGameServers` and `getGameServerStatus`: callable game-server reads. They require the existing linked admin/member session plus Boss/Underpaw admin bypass or enabled `/gameServerAccess` entry. Reads are manual except the bounded start-wait polling after a user clicks Start.
- `startGameServer` and `stopGameServer`: callable Palworld EC2 controls. They require the same linked-session game-server access, use AWS credentials only inside Functions, respect `/gameServerSettings/palworld/enabled`, and write one `/gameServerAuditLog/palworld` entry per authorized start/stop request.
- `listGameServerEvents`: callable game-server audit read for allowed game-server users. It returns the newest Palworld action entries and does not use AWS credentials.
- `getGameServerSettings` and `updateGameServerSettings`: callable admin game-server settings management. Updates write a settings audit entry and do not use AWS credentials.
- `listGameServerAccess`, `upsertGameServerAccess`, and `deleteGameServerAccess`: callable admin whitelist management.
- `listGameServerAuditLog`: callable admin audit-log read. It returns the newest Palworld action entries and does not use AWS credentials.
- `autoStopIdleGameServers`: scheduled Palworld idle guard. It runs every 10 minutes, skips when Palworld is disabled, and only stops the configured instance after 30 continuous minutes with zero confirmed players.

Function code uses `firebase-admin` and direct Admin SDK RTDB writes. App feature code should still use `src/lib/db.ts`.

## Game Server Cost Notes

- `/gameserver` and `/gameserver/palworld` use callable Functions for on-demand status only.
- Game-server pages reuse `admin_session_token`; `DISCORD_GAME_SERVER_REDIRECT_URI` is not required.
- Manual refresh calls one Function, one EC2 describe request, one SSM Run Command player REST read when running, and CloudWatch metric reads when running.
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
