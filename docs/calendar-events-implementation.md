# Calendar Events Implementation

The calendar combines member birthdays with read-only Raid Helper event imports.

## Data Ownership

- `/calendarEvents/{eventId}` is public-read and function-written. The client never writes planner events directly.
- `/calendarEventRequests/{requestId}` stores temporary Housecat event requests until Boss or Underpaw approve or deny them. Requests also store the Discord DON-channel notification message ID when the bot post succeeds.
- `/calendarSync/discordPlanner` stores public sync diagnostics for the admin panel.
- Raid Helper imports are keyed as `discordPlanner_{messageId}` so repeated syncs update the same event.

Normalized planner events include `title`, `description`, `startAt`, `endAt`, `location`, `source`, `sourceUrl`, `plannerMessageId`, `lastSyncedAt`, `updatedAt`, and `status`.

## Functions

- `dailyMaintenance`: scheduled daily at `0 8 * * *` Australia/Sydney. It runs the Discord planner sync alongside Tomestone and FC collection refreshes. The sync reads posted events from the Raid Helper server events API, optionally filters to the configured channel, writes `/calendarEvents`, and records diagnostics.
- `triggerDiscordPlannerSync`: callable admin refresh. It requires `adminSessionToken` and uses the same Raid Helper sync path as the scheduled job.
- `submitCalendarEventRequest`: callable Housecat request creation. It requires a valid member session with `DISCORD_HOUSECAT_ROLE_ID`, writes `/calendarEventRequests`, posts a DON channel notification, and stores the returned Discord message ID.
- `listCalendarEventRequests`, `approveCalendarEventRequest`, and `denyCalendarEventRequest`: callable Boss/Underpaw review actions. Approve creates the Raid Helper event with the original requester as leader, writes `/calendarEvents`, edits the DON-channel bot message with an approved tick, and deletes the request. Deny edits the bot message with a denied cross and deletes the request.

Required Functions config and secrets:

- Secret: `DISCORD_BOT_TOKEN`
- Config: `DISCORD_GUILD_ID`
- Config: `DISCORD_EVENT_CHANNEL_ID`
- Config: `DISCORD_DON_CHANNEL_ID`, required for Housecat request notifications
- Secret: `RAID_HELPER_API_KEY`
- Config: `RAID_HELPER_TEMPLATE_ID`, required for website-created events
- Config: `DISCORD_HOUSECAT_ROLE_ID`, required for Housecat event requests
- Config: `RAID_HELPER_FALLBACK_LEADER_ID`, optional string param used when local dev bypass or a rejected leader ID cannot be used by Raid Helper

`DISCORD_BOT_TOKEN` is needed for callable Discord session validation, optional role pings, and Housecat request notifications. The scheduled sync itself uses the Raid Helper API key and server ID.

## Parser Behavior

The sync uses Raid Helper's `startTime` and `endTime` Unix timestamps as the source of truth. Raw `date` and `time` strings are stored for diagnostics only, so event time display does not depend on the Cloud Functions timezone.

Events without an ID, title, or start time are skipped and surfaced under `/calendarSync/discordPlanner/recentFailures`.

## Client UI

`/calendar` reads `/memberProfiles` for birthdays and `/calendarEvents` for planner events. The home page also performs one-time reads of those calendar branches for the This Week strip, plus the existing member cache validation used by `useMembers()` for birthday names. Planner chips use shadcn tooltips for title, time, location, description, source link, and sync age.

`/admin` shows a Calendar Sync panel with last success, import and skip counts, recent parse failures, and a manual refresh button.

Logged-in Boss and Underpaw users see a Create Event button on `/calendar` in the month summary card. The dialog uses the local shadcn Calendar picker plus a time input. The callable uses the verified Discord session's `discordUserId` as Raid Helper `leaderId`, the configured `RAID_HELPER_TEMPLATE_ID`, and writes the returned event into `/calendarEvents` immediately.

Logged-in Housecat users see the same Create Event dialog, but submit creates a pending request instead of a Raid Helper post. The submit callable stores the request temporarily and sends a Discord bot message to `DISCORD_DON_CHANNEL_ID` with the requester mention and a link to `/calendar`.

Boss and Underpaw users also see Review Requests on `/calendar`. The review dialog loads pending requests on open with a one-time callable read. Approving posts the Raid Helper event using the original Housecat Discord user ID as leader, preserves selected role pings, edits the DON-channel request notification with a tick, then deletes the request. Denying edits the notification with a cross, then deletes the request.

The create dialog has a role-ping section with an explicit frontend/backend allowlist. Selected role IDs are sent to `createRaidHelperEvent`; Functions validates them, creates the Raid Helper event, then posts a Discord role mention message to the event channel with `DISCORD_BOT_TOKEN`. This adds one Discord API call only when at least one role ping is selected.

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
- Housecat submit succeeds only with Firebase Functions, a valid member session, `DISCORD_HOUSECAT_ROLE_ID`, and `DISCORD_DON_CHANNEL_ID`.
- Boss/Underpaw review can approve and deny requests without live listeners.
- Unparseable planner messages are skipped and reported instead of appearing on the calendar.
