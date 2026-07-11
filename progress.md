# Game Server Dashboard Progress

## Locked Decisions

- Use Realtime Database for game server access data.
- Key whitelist entries by Discord ID.
- Require current Discord guild membership for game server access.
- Require an existing linked admin/member website session for game server access.
- Allow Boss and Underpaw admins to bypass the game server whitelist.
- Use manual refresh for server status.
- Report EC2 instance state only in v1.
- Do not expose AWS credentials to React.
- Do not implement EC2 terminate or delete operations.
- Do not use a separate game-server Discord OAuth callback or `DISCORD_GAME_SERVER_REDIRECT_URI`.

## Overall Checklist

- [x] Phase 1: Planning scaffold and route shell.
- [x] Phase 2: Game server auth callable stubs. Discord-only OAuth was superseded by existing linked member/admin auth.
- [x] Phase 3: RTDB whitelist model and admin whitelist manager.
- [x] Phase 4: Palworld AWS EC2 callable implementation.
- [x] Phase 5: Audit log, polish, and verification.

## Current Phase

Phase 5 is complete.

## Phase 1 Checklist

- [x] Create root progress tracking file.
- [x] Add `/gameserver` route shell.
- [x] Add `/gameserver/palworld` route shell.
- [x] Add game server feature structure.
- [x] Add sidebar navigation item.
- [x] Run `npm run build`.

## Phase 2 Checklist

- [x] Reuse existing linked admin/member OAuth and session helpers.
- [x] Supersede separate game-server session storage.
- [x] Add game server callable stubs for list, status, start, and stop.
- [x] Keep game server auth wrapped around existing member session state.
- [x] Add local dev persona and callable mock support.
- [x] Keep game server callable mocks on existing dev persona sessions.
- [x] Run `cd functions && npm run build`.
- [x] Run `npm run build`.
- [x] Run `graphify update .`.

## Phase 3 Checklist

- [x] Add `/gameServerAccess/{discordUserId}` whitelist model.
- [x] Enforce game server access through admin bypass or enabled whitelist entry.
- [x] Add admin callables for list, upsert, and delete.
- [x] Add admin whitelist manager UI.
- [x] Add frontend denied state for non-whitelisted game server users.
- [x] Add local dev whitelist mocks.
- [x] Deny direct client access to `/gameServerAccess`.
- [x] Run `cd functions && npm run build`.
- [x] Run `npm run build`.
- [x] Run `graphify update .`.

## Phase 4 Checklist

- [x] Install `@aws-sdk/client-ec2` for Firebase Functions.
- [x] Add AWS region, Palworld instance ID, and AWS credential params.
- [x] Replace Palworld stubs with EC2 describe/start/stop calls.
- [x] Keep game server whitelist and admin bypass enforcement.
- [x] Update `/gameserver` to show live EC2 state.
- [x] Update `/gameserver/palworld` with host, metadata, action gating, and stop confirmation.
- [x] Keep local dev game server mocks AWS-free.
- [x] Run `cd functions && npm run build`.
- [x] Run `npm run build`.
- [x] Run `graphify update .`.

## Phase 5 Checklist

- [x] Add bounded `/gameServerAuditLog/{serverId}/{logId}` model.
- [x] Write audit entries for authorized Palworld start/stop requests.
- [x] Add admin callable for recent audit log reads.
- [x] Add admin UI for recent game server actions.
- [x] Add local dev audit log mocks.
- [x] Deny direct client access to `/gameServerAuditLog`.
- [x] Update Firebase data and cost documentation.
- [x] Run `cd functions && npm run build`.
- [x] Run `npm run build`.
- [x] Run `graphify update .`.

## Deferred Work

- Add more game server definitions after Palworld proves out.
