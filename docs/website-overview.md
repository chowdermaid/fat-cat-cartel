# Website Overview

Fat Cat Cartel is a React and Firebase website for the FFXIV Free Company Fat Cat Cartel, also branded in places as The Meowfia. It is both a public-facing FC site and a logged-in member toolkit for coordinating community activity, tracking collections, planning events, reviewing raid progress, and managing FC data.

The app is organized around feature pages under `src/features` and routes in `src/app/router.tsx`. Most user-facing data is read from Firebase Realtime Database, while Firebase Functions handle protected writes, Discord auth, external API refreshes, and server-side calls to services such as Lodestone, FFXIV Collect, FFLogs, Tomestone, Raid Helper, XIVAPI, and Universalis.

## Main Audiences

- Visitors can view the home page, recruitment page, public FC activity, collections, events, and archived event pages.
- FC members can log in through Discord-linked identity and use member tools such as Meowket Board and profile features.
- Housecats can submit calendar event requests.
- Boss and Underpaw admins can review event requests, create Raid Helper events, manage members, trigger syncs, and inspect refresh status.

## Public And Community Features

- **Home page**: A themed FC landing page with weekly calendar highlights, FC notices, member spotlight, status widgets, and links into core tools.
- **Recruitment page**: A public-facing recruitment route for people interested in joining The Meowfia.
- **Past events**: A route for archived FC event content.
- **Easter 2026 event page**: An event-specific page with scoreboard-style content and hide-and-seek rules.
- **Calendar**: A monthly calendar that combines member birthdays with imported Raid Helper events.

## Member And FC Data Features

- **Member directory**: Lists tracked FC members and friends, using Lodestone-owned identity data and cached Firebase snapshots.
- **Member profiles**: Shows character identity, job levels, collection highlights, favorite content, birthdays, timezone, and recent raid activity.
- **FC collection tracking**: Tracks mounts, minions, titles, and achievements for FC members using FFXIV Collect data. Includes overview cards, per-collectible grids, member filtering, collectible detail dialogs, and leaderboard views.
- **Mount roulette**: Picks mounts from FC collection data and shows who already has or still needs the result.

## Tools

- **Crafting Board**: Lets members request craftable items, review materials, set commission and material status, and track request state from open to completed or cancelled.
- **Meowket Board**: A member-access market profitability tool. It searches craftable items, resolves recipe and material data, checks Universalis market listings, estimates Sophia sell value, calculates profit, and builds a session-only shopping route grouped by Materia worlds.
- **Raid Stats**: Shows FC raid performance and activity using FFLogs parse data and Tomestone activity data. It includes summary cards, leaderboards, parse views, kill timelines, activity charts, and member profile raid panels.

## Admin Features

- **Discord OAuth sessions**: Admin and member access is based on Discord-linked sessions and configured role IDs.
- **Member management**: Admin tools can add, refresh, inspect, and delete tracked members.
- **Refresh controls**: Admins can trigger or inspect Lodestone, FFXIV Collect, FFLogs, Tomestone, calendar, and member sync status.
- **Calendar moderation**: Boss and Underpaw users can approve or deny Housecat event requests and create Raid Helper events from the website.
- **Event management**: Admin UI includes event-specific tooling such as Easter participant management.

## Data Sources And Integrations

- **Firebase Realtime Database** stores compact app snapshots for members, profiles, collections, calendar events, crafting requests, raid stats, sync status, and event data.
- **Firebase Functions** own privileged work: Discord auth, protected mutations, external API fetches, scheduled refreshes, and expensive aggregation.
- **Discord** provides login/session identity, role checks, bot notifications, slash command workflows, and event-request coordination.
- **Lodestone** provides member identity, FC roster details, portraits, and job levels.
- **FFXIV Collect** provides collectible catalogs, public ownership percentages, avatars, and character-owned collection data.
- **FFLogs** provides parse performance, histograms, all-stars, recent kills, and first-kill data.
- **Tomestone** provides recent raid activity, progress, clears, wipes, jobs, and profile enrichment.
- **Raid Helper** provides scheduled event imports and website-created Discord events.
- **XIVAPI and Universalis** power Meowket Board and crafting-related item, recipe, and market data.

## Local Development Modes

- Normal local development uses `npm run dev` with Firebase configuration.
- Stub mode uses `VITE_USE_STUBS=true` or `npm run dev:stub` to run against in-memory local data without Firebase credentials.
- The optional dev persona layer uses `VITE_DEV_AUTH_LAYER=true` for local UI flow testing with mock sessions and callable handlers.
- Firebase emulators can be used for production-shaped database and Functions behavior.

## Deeper Docs

- `docs/project-reference.md`: route map, commands, stack, conventions, and verification guidance.
- `docs/firebase-data-and-costs.md`: Firebase paths, ownership, cost considerations, and cache behavior.
- `docs/admin-auth-implementation.md`: Discord OAuth, sessions, roles, and protected callable behavior.
- `docs/fc-collection-implementation.md`: collection data ownership and refresh behavior.
- `docs/raid-stats-implementation.md`: FFLogs and Tomestone raid stats behavior.
- `docs/calendar-events-implementation.md`: Raid Helper imports and event request flows.
- `docs/crafting-board-implementation.md`: crafting request feature behavior.
- `docs/meowket-board-implementation.md`: market profitability tool behavior.
