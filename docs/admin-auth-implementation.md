# Admin Auth Implementation

The app uses Discord OAuth for browser login and Firebase Functions for authorization. The browser never decides access by itself. Discord OAuth creates a general application session for any authenticated Discord user. FFXIV member access separately requires current guild membership, an allowed current role, a Discord account linked to a tracked Lodestone character, and a current member record. Boss and Underpaw are the only roles that unlock admin access.

## OAuth Flow

- `AuthUserMenu` and the admin access state send users to the `startDiscordAdminOAuth` HTTP Function with a relative `returnTo` path.
- The start Function creates a random OAuth state, stores only `SHA-256(state)` at `/adminOAuthStates/{stateHash}` with the sanitized `returnTo`, sets a SameSite=Lax HTTP-only state cookie, and redirects to Discord with scopes `identify guilds.members.read`.
- `discordAdminOAuthCallback` validates the returned `state` against the cookie and stored state record, exchanges the OAuth code, and fetches the current Discord user. Guild membership lookup is optional during login so users outside the FFXIV Discord can still authenticate.
- When the user has a configured member/admin role, the callback also attempts to enrich the session from `/discordLinks/{discordUserId}` and `/members/{lodestoneId}`. Missing roles, links, or member records produce a base Discord session rather than FFXIV access.
- On success, the callback creates a random opaque web session token, stores only `SHA-256(token)` at `/adminSessions/{sessionIdHash}`, and redirects to `{returnTo}#admin_session=<token>`.
- On failure, the callback redirects to `{returnTo}#admin_error=<reason>` when a valid OAuth state exists.

## Secrets And Config

Required Functions config and secrets:

- Config: `DISCORD_CLIENT_ID`
- Secret: `DISCORD_CLIENT_SECRET`
- Config: `DISCORD_REDIRECT_URI`
- Config: `DISCORD_GUILD_ID`
- Config: `DISCORD_ADMIN_ROLE_IDS`, comma-separated Boss and Underpaw role IDs
- Config: `DISCORD_MEMBER_ROLE_IDS`, comma-separated non-admin role IDs allowed to log in
- Config: `DISCORD_MEMBER_ROLE_ID`, single general member role ID allowed to log in and use Meowket Board
- Config: `DISCORD_HOUSECAT_ROLE_ID`, single role ID allowed to submit calendar event requests
- Secret: `DISCORD_BOT_TOKEN`
- Config: `ADMIN_APP_ORIGIN`

The Discord Developer Portal redirect URI must exactly match `DISCORD_REDIRECT_URI`, which should point at `discordAdminOAuthCallback`.

Game server pages reuse this same linked member/admin OAuth flow. There is no separate game-server OAuth callback and `DISCORD_GAME_SERVER_REDIRECT_URI` is not required.

Underpaw users do not need Discord Administrator permission. The backend does not check Discord permission bits, role names, or FC rank for admin authorization. A user is an admin only when their current Discord guild member role IDs include one of the configured Boss or Underpaw role IDs. Non-admin member roles allow login and self-profile editing, but not admin navigation or admin callables.

Housecat calendar event requests require a normal member session plus the configured `DISCORD_HOUSECAT_ROLE_ID`. Housecat authorization does not grant admin access.

The Discord `/clear-channel` command uses the same Boss and Underpaw role IDs from `DISCORD_ADMIN_ROLE_IDS`. It does not grant access from Discord Administrator or Manage Messages permission alone. The command is guild-only, asks for an ephemeral Confirm or Cancel button, and only the admin who started the command can confirm it. Confirming bulk-deletes recent messages from the current channel with `DISCORD_BOT_TOKEN`; Discord's bulk delete API does not delete messages older than 14 days, so older messages may remain. The bot still needs Manage Messages permission in the target channel.

`DISCORD_ADMIN_ROLE_IDS` should be set to the Boss and Underpaw role IDs, currently `1336553728513146930,1336487933967990925`.

`DISCORD_MEMBER_ROLE_IDS` should be set to the non-admin member role IDs, currently `1336488015828357241,1336487958273855550,1375069801244004462`.

`DISCORD_MEMBER_ROLE_ID` should be set to the general member role ID used for Meowket Board access, currently `1348617536048070707`.

## Session Data

Admin sessions live at `/adminSessions/{sessionIdHash}`:

- `discordUserId`
- `discordUsername`, `discordDisplayName`, and `discordAvatarUrl` for base identity display
- Nullable `lodestoneId`, `characterName`, `fcRank`, and `avatarUrl` for linked FFXIV identity
- `roleIds`
- `isMember`
- `isAdmin`
- `isHousecat` is returned by `getAdminSession` for client gating but is derived from live Discord roles, not stored as an auth authority.
- `canUseGameServers` is returned by `getAdminSession` from the live admin result or the active `/gameServerAccess/{discordUserId}` entitlement so the client does not need a second access bootstrap call.
- `createdAt`
- `expiresAt`
- `lastSeenAt`

The browser stores the raw opaque session token in `localStorage` under `admin_session_token` so login survives tab and browser restarts until logout, revocation, role loss, or expiry. Realtime Database stores only the token hash. Default expiry is 730 hours.

`requireAuthenticatedSession` validates the hashed opaque token, Discord user ID, and expiry. It grants no member, admin, Housecat, or Palworld authority.

`requireMemberSession` wraps base authentication for member callables. It fetches the current guild member with `DISCORD_BOT_TOKEN`, compares live role IDs against `DISCORD_ADMIN_ROLE_IDS` and configured member role IDs, and re-reads `/discordLinks/{discordUserId}` and `/members/{lodestoneId}`. Failed member authorization does not destroy an otherwise valid base Discord session.

`requireAdminSession` wraps `requireMemberSession` and rejects sessions whose live role IDs do not include Boss or Underpaw.

The UI displays linked in-game character data from `/members/{lodestoneId}`: full character name, FC rank, and avatar URL. Discord username, global display name, and Discord avatar are not used for app display.

## Client Surfaces

- The sidebar uses the reusable `AuthUserMenu` component. Logged-out users see "Member Login" and "Login with Discord"; clicking starts OAuth.
- Logged-in users see their linked in-game character name and FC rank. The account popover says `Welcome, {characterName}` and includes logout.
- Authenticated outsiders display their Discord identity and are not labelled as FFXIV members.
- Logged-in users can edit their own `/members/{lodestoneId}` profile fields: bio, birthday, main jobs, timezone, favorite owned mount, favorite owned minion, and favorite content type. The browser never sends the target Lodestone ID for self-edits; Functions derive it from the session.
- Only sessions with `isAdmin: true` see the Admin sidebar link or pass the `/admin` page gate.
- Linked sessions with a configured member role can access `/meowketboard`; Meowket search and calculation callables use member-session authorization, not admin-only authorization.
- Any base session can open Palworld only when its immutable Discord ID has an active, non-expired `/gameServerAccess` entitlement. Boss and Underpaw sessions retain a live-admin bypass.
- Sessions with `isHousecat: true` can submit calendar event requests from `/calendar`, but cannot approve requests or use admin callables.
- The `/admin` page uses a reusable access-state component. Password auth is deprecated and no password gate is rendered.
- The admin client feature follows the standard feature structure under `src/features/admin`: the route export stays thin in `index.tsx`, callable helpers live in `api/`, stateful orchestration lives in `hooks/`, pure display/cache/auth helpers live in `utils/`, and admin UI is grouped under `components/`.
- Local Vite dev can bypass browser Discord OAuth with `VITE_ADMIN_AUTH_BYPASS=true`. The bypass only opens the admin UI locally because the client also checks `import.meta.env.DEV`; production builds ignore it.
- Logout calls `logoutAdminSession`, shows a Sonner toast, clears the local token, and redirects to the home page.

## Protected Admin Operations

All admin mutations must include `adminSessionToken` and call `requireAdminSession` before writing:

- `deleteMember`
- `upsertMember`
- `refreshMemberSource`
- `triggerFFLogsRefresh`
- `triggerTomestoneRaidStatsRefresh`
- `importLodestoneMembers`
- `triggerFCCollectionRefresh`
- `triggerDiscordPlannerSync`
- `createRaidHelperEvent`
- `listCalendarEventRequests`
- `approveCalendarEventRequest`
- `denyCalendarEventRequest`
- `updateMemberProfileAdmin`
- `upsertEasterParticipantAdmin`
- `deleteEasterParticipantAdmin`

Member self profile editing uses `updateOwnMemberProfile`. Housecat event request creation uses `submitCalendarEventRequest`. Both accept the same session token and call `requireMemberSession`; profile edits write only to the linked `/memberProfiles/{lodestoneId}` derived from the verified session. Favorite mount and minion IDs are accepted only when they are present in that member's synced `/fcCollection/memberData/{lodestoneId}/owned` arrays.

The admin and profile UIs use `callAdminFunction` from `src/features/admin/api/adminFunctions.ts` to attach the session token to callable payloads. Stub mode keeps direct local writes for UI development only because `firebaseApp` is null.

## Database Rules

Public reads remain available where the app needs them. Client writes are denied for admin-owned paths:

- `/members`
- `/membersLastUpdated`
- `/memberProfiles`
- `/events/easter2026/participants`
- `/adminOAuthStates`
- `/adminSessions`

Functions write these paths through the Admin SDK after server-side role authorization.

## Palworld Entitlements

Palworld entitlements live at `/gameServerAccess/{discordUserId}` and remain private to trusted Functions. Legacy `enabled: true` entries without `expiresAt` remain active and non-expiring. New records can include nullable `expiresAt`, `updatedBy`, notes, grant actor, and timestamps. Missing, disabled, malformed, or expired entries are denied on the next Palworld request. Entitlements never grant FFXIV member or admin access.

Game-server callables authorize direct entitlements immediately after base-session validation. They call Discord for live Boss or Underpaw verification only when no direct entitlement exists and an admin bypass may apply.

## Local Emulator Development

Local development should run against the Firebase emulators when testing admin auth, RTDB rules, Functions, Discord OAuth, or imported production-shaped data. Stub mode remains available as an explicit offline fallback.

Recommended root `.env.local` or local `.env` values:

```bash
VITE_USE_STUBS=false
VITE_USE_DATABASE_EMULATOR=true
VITE_DATABASE_EMULATOR_HOST=127.0.0.1
VITE_DATABASE_EMULATOR_PORT=9000
VITE_USE_FUNCTIONS_EMULATOR=true
VITE_ADMIN_AUTH_BYPASS=false
VITE_DEV_AUTH_LAYER=false
```

The normal `VITE_FIREBASE_*` web app config is still required. The Firebase SDK uses it to identify the project and RTDB instance, even when the app connects to the local emulator.

Set `VITE_ADMIN_AUTH_BYPASS=true` only for local browser UI work when Discord OAuth is not needed. It does not create a real server session, so Firebase callable admin operations still require emulator stub paths or a valid Discord-backed session.

Set `VITE_DEV_AUTH_LAYER=true` only for local UI flow testing. It shows a top-header persona selector, returns local pseudo sessions, and routes registered callables through localStorage-backed mock handlers instead of Firebase, Discord, Raid Helper, or crafting request Functions. The crafting board mock store is kept in localStorage, so switching from Member to Crafter can test create -> accept -> complete/close/reopen flows without Firebase writes. Use emulators instead when validating RTDB rules, Functions, OAuth, or external integrations.

For local integration testing with real Discord OAuth, real callable Functions, Firebase emulators, and real Discord bot delivery, keep `VITE_DEV_AUTH_LAYER=false` and enable the Functions role override only in the emulator:

```bash
FUNCTIONS_DEV_ALLOW_ROLE_OVERRIDE=true
FUNCTIONS_DEV_DISCORD_ROLE_OVERRIDE=housecat
```

The override is rejected unless `FUNCTIONS_EMULATOR=true`. It does not change Discord roles, linked members, stored sessions, or production data; it only adjusts the app-facing role IDs returned by `requireMemberSession` after real Discord session validation succeeds.

Recommended Functions local files:

- `functions/.env.local`: set `ADMIN_APP_ORIGIN=http://localhost:5173`.
- `functions/.env.local`: set local non-secret config, including `ADMIN_APP_ORIGIN`, Discord IDs and role IDs, channel IDs, redirect URI, FFLogs client ID, and Raid Helper template ID.
- `functions/.secret.local`: set local API credentials, including `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `FFLOGS_CLIENT_SECRET`, `TOMESTONE_BEARER_TOKEN`, and `RAID_HELPER_API_KEY` as needed.

For local OAuth, the Discord Developer Portal redirect URI and `DISCORD_REDIRECT_URI` must match the Functions emulator callback URL:

```text
http://127.0.0.1:5001/fat-cat-cartel/us-central1/discordAdminOAuthCallback
```

Use the current Firebase project ID in place of `fat-cat-cartel` if you run the emulator under a different project.

Recommended emulator import shape:

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

Imported data may be visible through emulator REST only when the RTDB namespace is included, for example:

```text
http://127.0.0.1:9000/members/20439006.json?ns=fat-cat-cartel-default-rtdb
```

Private paths such as `/discordLinks`, `/adminSessions`, and `/adminOAuthStates` should return `401` over client REST because RTDB rules deny public reads. That is expected. Functions use the Admin SDK and can still read `/discordLinks/{discordUserId}` during login.

Expected login feedback is shown through Sonner toasts:

- Successful linked-character login: `Welcome, {characterName}.`
- Missing Discord link: link the Lodestone profile first with the Discord slash command.
- Missing member record: the linked character is no longer tracked.
- Missing allowed login role: `Allowed Discord role required.`
- Logged-in non-admin user visiting `/admin`: `Boss or Underpaw Discord role required.`

Use `VITE_USE_STUBS=true` only when Firebase credentials or emulators are not available. In stub mode, Firebase is disabled, callable Functions are unavailable, and Discord OAuth cannot complete.

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

- Boss role ID can login, edit their own profile, and use admin actions.
- Underpaw role ID can login, edit their own profile, and use admin actions without Discord Administrator permission.
- Configured member role IDs can login and edit their own profile, but cannot see Admin or access `/admin`.
- Discord Administrator permission alone does not grant access unless the user also has Boss or Underpaw role ID.
- Allowed-role user without `/discordLinks/{discordUserId}` sees the link-first message.
- Linked user whose member record was deleted sees the missing tracked character message.
- No-role user sees "Boss or Underpaw Discord role required."
- A user outside the guild is denied.
- Sidebar authenticated state displays in-game character name and rank, not Discord username.
- Missing, tampered, expired, revoked, or role-removed sessions are rejected by admin callables.
- Browser attempts to edit another member's profile fail because self profile updates derive Lodestone ID from the verified session.
- Logout deletes the server session.
- Direct browser RTDB writes fail for admin-owned paths.
- Game-server access requires a linked member/admin session; unlinked Discord users cannot use `/gameserver`.
- Public members, collection, raid stats, and Easter scoreboard reads still work.
- Discord friend signup, linking, status, and profile view slash commands still work. Profile editing slash commands were removed because profile edits now live on the website.
- Discord `/clear-channel` denies non-admin members, requires confirmation from the initiating admin, cancels without deleting, and reports that messages older than 14 days may remain.
