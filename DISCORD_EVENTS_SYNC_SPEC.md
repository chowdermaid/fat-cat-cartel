# Discord Events Sync Specification

## Goal

Show upcoming Discord content events on the Fat Cat Cartel website without running an always-online Discord gateway bot.

The first version should fetch native Discord Scheduled Events from the Discord REST API on a schedule, cache normalized event data in Firebase Realtime Database, and let the frontend render from Firebase.

## Architecture

```text
Firebase scheduled function
  -> Discord REST API
  -> fetch guild scheduled events
  -> normalize event payloads
  -> write Firebase Realtime Database
  -> website reads cached events
```

This should live alongside the existing Firebase Functions architecture. Use `firebase-admin` for database writes. Do not use frontend Firebase config in functions.

## Proposed Files

```text
functions/
  src/
    discord/
      events-sync.ts
      events-types.ts
  scripts/
    register-discord-commands.js
```

`functions/src/index.ts` should export one scheduled function:

```ts
syncDiscordEvents
```

## Schedule

Run every 3 hours to match existing refresh cadence:

```text
0 */3 * * *
```

Use region:

```text
us-central1
```

Recommended timeout:

```text
60 seconds
```

## Discord API Source

Use Discord Guild Scheduled Events API:

```text
GET /guilds/{guild.id}/scheduled-events
```

Use query:

```text
with_user_count=true
```

This should fetch server-native scheduled events, including events created directly in Discord or created by a third-party event planner bot if that bot creates native Discord events.

## Required Secrets And Config

Secrets:

```text
DISCORD_BOT_TOKEN
```

Config or secret:

```text
DISCORD_GUILD_ID
```

The bot token must never be committed. It should be available only to Firebase Functions or local registration/sync scripts.

## Bot Permissions

The Discord app should be invited to the server with enough access to read scheduled events.

Recommended OAuth scopes:

```text
bot
applications.commands
```

Start with minimal bot permissions. If scheduled event reads fail, review Discord app/server permissions and the bot's server membership.

## Database Path

Write normalized events to:

```text
/contentEvents/discord/events/{eventId}
```

Write sync metadata to:

```text
/contentEvents/discord/meta
```

## Normalized Event Shape

```ts
type DiscordContentEvent = {
  id: string;
  guildId: string;
  channelId: string | null;
  name: string;
  description: string | null;
  scheduledStartTime: string;
  scheduledEndTime: string | null;
  status: "scheduled" | "active" | "completed" | "cancelled" | "unknown";
  entityType: "stage" | "voice" | "external" | "unknown";
  location: string | null;
  imageUrl: string | null;
  userCount: number | null;
  discordUrl: string;
  source: "discord-scheduled-event";
  lastSyncedAt: number;
};
```

Metadata:

```ts
type DiscordEventsSyncMeta = {
  lastSyncedAt: number;
  sourceGuildId: string;
  eventCount: number;
  ok: boolean;
  error: string | null;
};
```

## Discord URL Format

Use a stable link format:

```text
https://discord.com/events/{guildId}/{eventId}
```

## Sync Behavior

On each sync:

1. Fetch scheduled events from Discord.
2. Normalize event fields.
3. Write all currently returned events to `/contentEvents/discord/events`.
4. Remove stale events that are no longer returned, or mark them as completed if preserving history is desired.
5. Write `/contentEvents/discord/meta`.

Recommended first version:

```text
replace the whole /contentEvents/discord/events object with the latest normalized upcoming/active events
```

This keeps the frontend simple and avoids stale event cards.

## Status Mapping

Discord status values should be mapped into readable strings:

```text
1 -> scheduled
2 -> active
3 -> completed
4 -> cancelled
other -> unknown
```

Entity type values:

```text
1 -> stage
2 -> voice
3 -> external
other -> unknown
```

## Frontend Display

Add a website surface later, likely:

```text
src/features/content-events/index.tsx
```

Potential route:

```text
/content-events
```

Display:

- upcoming and active events only
- sorted by `scheduledStartTime` ascending
- compact event rows or cards
- event title
- date and time
- location or channel indicator
- attendee/user count if available
- link to Discord event

Use Firebase reads through `src/lib/db.ts`, not direct Firebase imports.

## Caching And Cost Notes

Firebase impact should be low:

- one scheduled function invocation every 3 hours
- one Discord API request per sync
- one RTDB write replacing the cached event set
- website reads from cached RTDB data

Avoid client-side Discord API calls. The bot token must never reach the browser.

## Error Handling

If Discord fetch fails:

1. Keep existing cached events.
2. Update `/contentEvents/discord/meta` with `ok: false`.
3. Store a short error message.
4. Log full details in Firebase Functions logs.

The website can continue showing the last successful cache and optionally hide stale events once they are past their start/end time.

## Local Testing

Suggested local script later:

```text
functions/scripts/sync-discord-events-once.js
```

It should:

1. Read `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` from environment variables.
2. Fetch events from Discord.
3. Print normalized event JSON.
4. Avoid writing to Firebase unless explicitly requested.

## Deployment Steps

1. Set secrets:

```bash
firebase functions:secrets:set DISCORD_BOT_TOKEN
firebase functions:secrets:set DISCORD_GUILD_ID
```

2. Deploy:

```bash
firebase deploy --only functions:syncDiscordEvents
```

3. Confirm logs show successful sync.

4. Verify RTDB path:

```text
/contentEvents/discord/events
```

## Open Questions

- Does the current event planner bot create native Discord Scheduled Events?
- Should completed events be preserved for an archive, or should the website only show upcoming events?
- Should the website show RSVP/user counts?
- Should any event data be hidden from public website visitors?
- Should manual admin-created site events eventually merge with Discord events under one `/contentEvents` view?

## Recommended Version 1 Scope

Build only:

- scheduled function
- Discord scheduled events fetch
- RTDB cache write
- sync metadata
- local one-shot fetch helper if useful

Do not build message scraping in version 1. If the event planner bot does not create native Discord Scheduled Events, revisit with a separate scraper design.
