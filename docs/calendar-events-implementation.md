# Calendar Events Implementation

The calendar combines member birthdays with read-only Raid Helper event imports.

## Data Ownership

- `/calendarEvents/{eventId}` is public-read and function-written. The client never writes planner events directly.
- `/calendarSync/discordPlanner` stores public sync diagnostics for the admin panel.
- Raid Helper imports are keyed as `discordPlanner_{messageId}` so repeated syncs update the same event.

Normalized planner events include `title`, `description`, `startAt`, `endAt`, `location`, `source`, `sourceUrl`, `plannerMessageId`, `lastSyncedAt`, `updatedAt`, and `status`.

## Functions

- `syncDiscordPlannerEvents`: scheduled hourly. It reads posted events from the Raid Helper server events API, optionally filters to the configured channel, writes `/calendarEvents`, and records diagnostics.
- `triggerDiscordPlannerSync`: callable admin refresh. It requires `adminSessionToken` and uses the same Raid Helper sync path as the scheduled job.

Required Functions secrets:

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_EVENT_CHANNEL_ID`
- `RAID_HELPER_API_KEY`
- `RAID_HELPER_TEMPLATE_ID`, required for website-created events
- `RAID_HELPER_FALLBACK_LEADER_ID`, optional string param used when local dev bypass or a rejected leader ID cannot be used by Raid Helper

`DISCORD_BOT_TOKEN` is only needed for admin callable Discord session validation. The scheduled sync itself uses the Raid Helper API key and server ID.

## Parser Behavior

The sync uses Raid Helper's `startTime` and `endTime` Unix timestamps as the source of truth. Raw `date` and `time` strings are stored for diagnostics only, so event time display does not depend on the Cloud Functions timezone.

Events without an ID, title, or start time are skipped and surfaced under `/calendarSync/discordPlanner/recentFailures`.

## Client UI

`/calendar` reads `/memberProfiles` for birthdays and `/calendarEvents` for planner events. Planner chips use shadcn tooltips for title, time, location, description, source link, and sync age.

`/admin` shows a Calendar Sync panel with last success, import and skip counts, recent parse failures, and a manual refresh button.

Logged-in Boss and Underpaw users see a Create Event button on `/calendar` in the month summary card. The dialog uses the local shadcn Calendar picker plus a time input. The callable uses the verified Discord session's `discordUserId` as Raid Helper `leaderId`, the configured `RAID_HELPER_TEMPLATE_ID`, and writes the returned event into `/calendarEvents` immediately.

The create dialog has an Advanced role-ping section scaffolded with an empty frontend allowlist. Functions also validate selected role IDs against an empty backend allowlist. Fill both allowlists and add the Raid Helper `announcement` payload only after the exact role-ping request shape is confirmed.

When testing with `VITE_ADMIN_AUTH_BYPASS=true`, the emulator session has `discordUserId: "local-dev"`, which Raid Helper rejects. Set `RAID_HELPER_FALLBACK_LEADER_ID` in `functions/.env.local` to a real Discord user ID from the server for local event-creation tests.

## Verification

Run:

```bash
cd functions
npm run build
```

```bash
npm run build
```

Manual checks:

- Stub mode shows the sample planner event on `/calendar`.
- Admin status panel renders in stub mode.
- Manual sync succeeds only with Firebase Functions and a valid admin session.
- Unparseable planner messages are skipped and reported instead of appearing on the calendar.
