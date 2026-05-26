# Admin Auth Implementation

The app uses Discord OAuth for browser login and Firebase Functions for authorization. The browser never decides access by itself. A successful web session requires both a Discord account linked to a tracked Lodestone character and a configured Boss or Underpaw Discord role ID.

## OAuth Flow

- `AuthUserMenu` and the admin access state send users to the `startDiscordAdminOAuth` HTTP Function with a relative `returnTo` path.
- The start Function creates a random OAuth state, stores only `SHA-256(state)` at `/adminOAuthStates/{stateHash}` with the sanitized `returnTo`, sets a SameSite=Lax HTTP-only state cookie, and redirects to Discord with scopes `identify guilds.members.read`.
- `discordAdminOAuthCallback` validates the returned `state` against the cookie and stored state record, exchanges the OAuth code, fetches the current Discord user and current guild member, and checks the member `roles` array against `DISCORD_ADMIN_ROLE_IDS`.
- After role verification, the callback reads `/discordLinks/{discordUserId}` and then `/members/{lodestoneId}`. Login is rejected if the Discord account is not linked or the linked character is no longer tracked.
- On success, the callback creates a random opaque admin session token, stores only `SHA-256(token)` at `/adminSessions/{sessionIdHash}`, and redirects to `{returnTo}#admin_session=<token>`.
- On failure, the callback redirects to `{returnTo}#admin_error=<reason>` when a valid OAuth state exists.

## Secrets And Config

Required Functions values:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_GUILD_ID`
- `DISCORD_ADMIN_ROLE_IDS`, comma-separated Boss and Underpaw role IDs
- `DISCORD_BOT_TOKEN`
- `ADMIN_APP_ORIGIN`

The Discord Developer Portal redirect URI must exactly match `DISCORD_REDIRECT_URI`, which should point at `discordAdminOAuthCallback`.

Underpaw users do not need Discord Administrator permission. The backend does not check Discord permission bits, role names, or FC rank for admin authorization. A user is authorized only when their current Discord guild member role IDs include one of the configured Boss or Underpaw role IDs.

`DISCORD_ADMIN_ROLE_IDS` should be set to the Boss and Underpaw role IDs, currently `1336553728513146930,1336487933967990925`.

## Session Data

Admin sessions live at `/adminSessions/{sessionIdHash}`:

- `discordUserId`
- `lodestoneId`
- `characterName`
- `fcRank`
- `avatarUrl`
- `roleIds`
- `createdAt`
- `expiresAt`
- `lastSeenAt`

The browser stores the raw opaque session token in `localStorage` under `admin_session_token` so login survives tab and browser restarts until logout, revocation, role loss, or expiry. Realtime Database stores only the token hash. Default expiry is 730 hours.

`requireAdminSession` validates the token on every admin callable. It fetches the current guild member with `DISCORD_BOT_TOKEN`, compares live role IDs against `DISCORD_ADMIN_ROLE_IDS`, re-reads `/discordLinks/{discordUserId}` and `/members/{lodestoneId}`, refreshes `lastSeenAt`, and deletes the session if the user is no longer in the guild, the role check fails, the Discord link is removed, the member disappears, or the session is expired.

The UI displays linked in-game character data from `/members/{lodestoneId}`: full character name, FC rank, and avatar URL. Discord username, global display name, and Discord avatar are not used for app display.

## Client Surfaces

- The sidebar uses the reusable `AuthUserMenu` component. Logged-out users see "Coming soon for all" and "Login with Discord"; clicking starts OAuth.
- Logged-in users see their linked in-game character name and FC rank. The account popover says `Welcome, {characterName}` and includes logout.
- The `/admin` page uses a reusable access-state component. Password auth is deprecated and no password gate is rendered.
- Logout calls `logoutAdminSession`, shows a Sonner toast, clears the local token, and redirects to the home page.
- Future bypass support is intentionally not implemented.

## Protected Admin Operations

All admin mutations must include `adminSessionToken` and call `requireAdminSession` before writing:

- `deleteMember`
- `upsertMember`
- `refreshMemberSource`
- `triggerFFLogsRefresh`
- `triggerTomestoneRaidStatsRefresh`
- `importLodestoneMembers`
- `triggerFCCollectionRefresh`
- `updateMemberProfileAdmin`
- `upsertEasterParticipantAdmin`
- `deleteEasterParticipantAdmin`

The admin UI uses `callAdminFunction` to attach the session token to callable payloads. Stub mode keeps direct local writes for UI development only because `firebaseApp` is null.

## Database Rules

Public reads remain available where the app needs them. Client writes are denied for admin-owned paths:

- `/members`
- `/membersLastUpdated`
- `/memberProfiles`
- `/events/easter2026/participants`
- `/adminOAuthStates`
- `/adminSessions`

Functions write these paths through the Admin SDK after server-side role authorization.

## Local Emulator Development

Local development should run against the Firebase emulators when testing admin auth, RTDB rules, Functions, Discord OAuth, or imported production-shaped data. Stub mode remains available as an explicit offline fallback.

Recommended root `.env.local` or local `.env` values:

```bash
VITE_USE_STUBS=false
VITE_USE_DATABASE_EMULATOR=true
VITE_DATABASE_EMULATOR_HOST=127.0.0.1
VITE_DATABASE_EMULATOR_PORT=9000
VITE_USE_FUNCTIONS_EMULATOR=true
```

The normal `VITE_FIREBASE_*` web app config is still required. The Firebase SDK uses it to identify the project and RTDB instance, even when the app connects to the local emulator.

Recommended Functions local files:

- `functions/.env.local`: set `ADMIN_APP_ORIGIN=http://localhost:5173`.
- `functions/.secret.local`: set local Discord and API secrets, including `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_GUILD_ID`, `DISCORD_ADMIN_ROLE_IDS`, `DISCORD_BOT_TOKEN`, FFLogs secrets, and Tomestone token as needed.

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
- Missing Boss or Underpaw role: `Boss or Underpaw Discord role required.`

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

- Boss role ID can login and use admin actions.
- Underpaw role ID can login and use admin actions without Discord Administrator permission.
- Discord Administrator permission alone does not grant access unless the user also has Boss or Underpaw role ID.
- Allowed-role user without `/discordLinks/{discordUserId}` sees the link-first message.
- Linked user whose member record was deleted sees the missing tracked character message.
- No-role user sees "Boss or Underpaw Discord role required."
- A user outside the guild is denied.
- Sidebar authenticated state displays in-game character name and rank, not Discord username.
- Missing, tampered, expired, revoked, or role-removed sessions are rejected by admin callables.
- Logout deletes the server session.
- Direct browser RTDB writes fail for admin-owned paths.
- Public members, collection, raid stats, and Easter scoreboard reads still work.
- Discord friend signup and profile slash commands still work.
