# Dragonwilds server implementation and operations

Updated: 29 September 2026.

Status: **Host provisioned according to the operator; Phases 2?5 implemented locally and Phase 6 local verification extended. Live behavior and browser acceptance remain unverified.** Phase 1 and automatic-stop readiness remain incomplete. The current backend deliberately provides unknown Dragonwilds player counts and no automatic idle shutdown.

Related plans: [phased checklist](../DRAGONWILDS_PHASED_IMPLEMENTATION.md) and [implementation investigation](../DRAGONWILDS_IMPLEMENTATION_PLAN.md). Existing data ownership and operational costs are described in [Firebase data and costs](firebase-data-and-costs.md).

## 1. Scope and evidence status

The selected deployment is a separate Dragonwilds EC2 host with an imported, password-protected world. Palworld keeps its instance, world, application behavior and access records. The original handoff was documentation-only. Phase 2 now adds backend code and tests described below; live Firebase configuration/data, `.env`, secrets and infrastructure remain untouched by the agent.

Evidence labels used below:

- **Proposed:** a requirement or default selected for this deployment; not yet tested.
- **Documented:** behavior described by the vendor; must still be checked against the installed release.
- **Pending:** an operator input or live observation not available yet.
- **Operator-reported:** setup progress supplied by the operator, not independently inspected by the agent.
- **Verified:** reserved for a dated result with the installed build and supporting sanitized evidence. No live results currently have this status.

The [official Jagex dedicated-server guide](https://runescapedragonwilds.help.jagex.com/hc/en-gb/articles/45365343055249-Dedicated-Servers-How-to-Guide), reviewed on 29 September 2026, documents 64-bit Linux/Windows hosting, Steam application `4019830`, default UDP port `7777`, and exact case-sensitive world-name discovery in the Public tab. Its six-player/8 GB guidance is explicitly tied to version 0.11; neither capacity nor memory suitability is verified for the future installation.

## 2. Provisioning requirements and deployment inventory

| Item | Required or proposed configuration | Actual value / evidence |
| --- | --- | --- |
| AWS account | Existing project account; separate Dragonwilds resources | Pending account identification |
| Region | `ap-southeast-2` | Proposed; confirm before provisioning |
| EC2 instance | Dedicated to Dragonwilds; never reuse Palworld instance ID | Pending instance ID, type and price |
| OS/runtime | x86-64 Linux; record distribution, version and required server runtime | Pending installed-build compatibility check; do not assume a compatibility layer is required or supported |
| Memory/CPU | Target 16 GiB RAM for headroom; size CPU against release requirements and observed load | Pending instance selection and load check |
| Persistent storage | Encrypted EBS for config, world and logs; preserve world volume during host replacement | Pending volume IDs, capacity, mount paths, ownership and retention settings |
| Supervision | Dedicated unprivileged service user and supervised service that starts on host boot | Pending service name, unit/config, executable, arguments, working directory and environment source |
| Steam/build | Dedicated application `4019830`; record build ID and game version | Pending installation and matching-client verification |
| Management | SSM-managed instance; private local status command, no public telemetry endpoint | Pending instance role and successful management check |
| Network | Start with UDP `7777`; permit only verified game traffic and required management/service connectivity | Pending effective bind address, port and security-group rules |
| Capacity | Read effective configuration and confirm against installed release | Pending; do not hard-code six as verified capacity |
| Config/save/logs | Persistent paths readable only by appropriate service/operator identities | Pending resolved absolute paths and permissions |
| RAM metrics | CloudWatch agent namespace and `InstanceId` dimension isolated to this host | Pending namespace, metric name and successful observation |
| Shutdown | Supported save/exit sequence, service stop timeout and host-shutdown integration | Pending; EC2 stop alone is not evidence of clean saves |
| Backup destination | Encrypted off-instance destination with restricted access | Pending destination, encryption/access configuration and restore evidence |

### Operator-reported setup progress

- Separate EC2 host provisioned; actual instance ID, type and region still need recording.
- Runtime uses Docker Compose and the indifferentbroccoli image; exact repository/tag/digest and installed server build remain pending.
- Persistent files are under `/srv/dragonwilds`; verify EBS backing, container bind mounts and actual config/save/log locations before marking storage verified.
- UDP 7777 and 8888 are configured on the host. Their effective use and end-to-end joining remain unverified; this does not establish a player-query protocol on either port.
- Configuration resides in a private host `.env`. Record required variable names from a sanitized operator-supplied inventory; do not read or copy secret values into this repository.
- Existing world downloaded for import. Replacement of active saves and loading of intended progress are not yet confirmed.

This progress supersedes the original no-host handoff assumption, but does not turn proposed inventory values or live acceptance rows into verified results.

Before provisioning, record the selected instance and storage sizes plus estimated running and stopped costs. Ensure the data mount is available before the service starts; a missing mount must fail startup rather than create a new world on the root disk. Configure bounded log retention without discarding history still required by the telemetry reader.

SSM management must work without opening a public administration port. Record both permission surfaces: the host role for SSM/metrics and the later Functions caller's narrowly scoped Dragonwilds access. Do not alter Palworld permissions or deploy new Functions during this handoff. For later configuration, non-sensitive IDs and namespace values use `defineString`; only real credentials use `defineSecret` when Functions actually need them.

### Inputs required from the operator

| Input | Handling |
| --- | --- |
| AWS account, instance type, storage sizes and budget | Record non-secret selections in the inventory before provisioning |
| Owner Player ID | Supply through host configuration; record completion without copying account identifiers into fixtures |
| Server name and imported world's exact name | Record their distinct values after confirming the imported world loads |
| Existing world save and provenance | Identify source/build, source timestamp and protected backup location; preserve the original |
| Admin password and separate world/join password | Supply through secure host configuration; never paste values into Markdown, source, fixture output or command history |
| Runtime, service and backup destination | Resolve during installation, then replace pending inventory entries with observed values |

The vendor guide lists Linux config under `RSDragonwilds/Saved/Config/Linux/DedicatedServer.ini`, saves under `RSDragonwilds/Saved/Savegames`, and logs under `RSDragonwilds/Saved/Logs/RSDragonwilds.log`. Treat these as discovery hints, not verified absolute paths. It also describes owner/server/default-world/admin configuration and an optional world password. This deployment requires a world password; website access grants alone do not protect game joining.

## 3. Import, joining and lifecycle runbook

These are operator procedures to execute after provisioning. Record timestamps, build and results in the evidence register below.

### Import the private world

1. Confirm the target is the separate Dragonwilds host. Stop its service and verify the game process has exited before editing config or saves.
2. Back up existing target saves/config and the supplied source save to the protected off-instance destination. Verify copies can be read and record checksums. Never overwrite the only copy.
3. Stage the supplied save separately and confirm its provenance/build. Move existing target saves into a backup directory outside the active save directory; install the intended save with the service user's ownership and permissions.
4. Configure the owner, server name, separate admin password and required world password through secure host configuration. Keep unrelated saves out of the active directory: Jagex documents that the server loads the latest `.sav` present.
5. Start the service. Confirm the intended imported world, existing progress and exact world name in game. A running process or EC2 address is insufficient proof of readiness.
6. If import fails, stop the service, preserve failure evidence and restore the backed-up config/save set. Do not repeatedly overwrite the source save or modify Palworld.

### Verify joining

Use a matching game client, open the Worlds screen's Public tab, search the exact case-sensitive imported world name, then join with the world password. Record successful joining and rejection with missing/incorrect password. Confirm world name rather than assuming it equals server name or default-world configuration. Direct-address joining remains unsupported unless separately demonstrated on this release.

### Verify boot and clean shutdown

1. Establish the installed build's supported save/exit mechanism. Record the exact command or service action, completion indicator, measured duration and configured stop timeout. Do not invent a console command, signal or API.
2. Integrate that mechanism with service stop and host shutdown. Wait for save completion and process exit; forced termination or timeout counts as a failed test.
3. In the imported world, make an identifiable test change and exit cleanly. Restart the service and confirm both the original progress and recent change persist.
4. Repeat with a controlled EC2 stop/start of Dragonwilds. Confirm persistent volume mount, automatic service startup, intended world loading and successful joining.
5. Record whether normal OS shutdown is sufficient or a game-specific pre-stop step is required for Phase 2. Until verified, graceful shutdown is unresolved and automatic stop is not ready.

### Backup and restore

- Take an encrypted off-instance backup before each import or upgrade and daily while the world is active. Retain seven daily copies; preserve pre-change recovery points until the change is verified.
- Capture a consistent save/config set using the verified save-and-stop procedure. Until a safe online-backup method is demonstrated, daily backup requires a controlled service pause. Record schedule, destination, permissions, checksums and success/failure reporting.
- Protect backed-up config as credential-bearing data. Do not commit archives or raw saves. A copy elsewhere on the same host is not the required off-instance backup.
- Test restore into an isolated location/service with production discovery and game ingress disabled. Restore config securely, validate the expected world/progress, and record the recovery point and elapsed recovery time.
- Preserve production data while testing. Only a successful restore establishes recoverability; upload success alone does not.

## 4. Player-status contract for Phase 2

### Source selection and execution boundary

Inspect the installed build and its supported interfaces for an authoritative current-player query. Record the query, response example and release-specific evidence if one exists. The reviewed Jagex guide does not document a player-query API; this is not proof that none exists. Do not reuse Palworld REST endpoints or invent a Dragonwilds query port.

If no supported query is available, evaluate a private local log reader invoked through one fixed SSM command. It must reconstruct membership from complete current-process history or retain demonstrably continuous state. A short log tail cannot establish membership. Account for duplicate events, stable identity within the reader, reconnects, rotation and collector restart; raw identifiers stay local and never appear in returned player details.

Record the chosen source only after real tests. Helper language, repository location, installation and command remain deferred until the host runtime and actual log format are known. Do not install the community companion as an assumed trusted source. If a helper is needed, its reviewed source and reproducible installation instructions must accompany the later implementation.

The later adapter must bound SSM execution and output within the existing callable deadline, validate JSON and return unavailable telemetry on timeout/error. No public helper, browser AWS access, per-player calls, background browser polling or Firebase player-history collection is introduced by this contract.

### Snapshot schema (proposed interface, not implemented)

| Field | Type | Meaning |
| --- | --- | --- |
| `processState` | `"running" \| "stopped" \| "unknown"` | Observed game-process state, distinct from EC2 state and join readiness |
| `observedAt` | UTC ISO 8601 string or `null` | Time the source was successfully validated; `null` when no validated observation exists |
| `processGeneration` | string or `null` | Opaque identifier stable for one game-process lifetime; changes on restart and is not based on PID alone |
| `complete` | boolean | Current membership is authoritative or fully reconstructed for this generation |
| `playerCount` | non-negative integer or `null` | Independently trustworthy current count; unknown is `null` |
| `capacity` | positive integer or `null` | Verified effective capacity, if available |
| `playerNames` | optional string array | Optional display names; absence or empty array says nothing about count |

Count-only operation is valid: `complete` describes membership/count confidence, not availability of names. Do not infer count from the names array. No raw logs, IPs, owner/account identifiers or credentials belong in this payload. No application API/type changes are made in Phase 1.

### Validation and continuity rules

- Accept a usable count only when the process is running, generation is known, reconstruction/query is complete and observation is fresh. Reject invalid field types, non-integral/negative counts, invalid capacity and count exceeding a known capacity.
- Relative to the Function's current UTC time, reject observations older than 120 seconds or more than 30 seconds in the future. Exact boundary values are allowed. These are proposed defaults, not measured host characteristics.
- Advance `observedAt` only after successful current-source validation. Re-reading an unchanged cache or merely receiving an SSM response must not refresh an old observation. A quiet log requires verified process identity and complete history through a current read; silence alone proves nothing.
- Missing/truncated history, malformed membership events, inaccessible logs, failed query, unknown/stopped process or collector restart without reconstruction makes count unknown. Discard protected player rows when telemetry is unusable.
- A process-generation change invalidates the previous snapshot and idle continuity. New-generation data may become usable only after fresh complete validation. Reconstructing across rotation is allowed only when continuity can be proven; otherwise report unknown.
- Preserve the planned ten-minute checks and 30-minute idle threshold in later phases. Freshness applies to each observation, not continuous collection between checks. Positive/unknown data, generation changes and missed observation windows reset idle eligibility. Define scheduler window handling in Phase 2; do not claim it is implemented here.
- If only reliable counts are available, select count-only presentation. If no trustworthy count is possible, keep player count unavailable and auto-stop inactive; Phase 1 telemetry acceptance remains open.

## 5. Fixture capture and live acceptance

No real telemetry fixtures exist yet. Do not create placeholder data presented as production evidence. Any synthetic contract example must be labelled synthetic and cannot satisfy a live acceptance gate.

For each capture, record scenario, installed build, source/parser version, UTC time, process generation, independently observed player count, sanitized source excerpt, expected snapshot and actual result. Remove passwords, tokens, IPs and account identifiers; replace names/identity correlations consistently when needed for replay. Keep raw captures in a restricted operator location, outside this repository. Commit only reviewed sanitized fixtures with the eventual helper/adapter tests.

| Scenario | Required evidence / expected behavior | Status |
| --- | --- | --- |
| Startup | Running/readiness distinguished; count unknown until complete validation | Pending |
| Confirmed empty | Real empty current generation reports zero only with complete fresh evidence | Pending |
| Join and simultaneous players | Independent in-game observation matches count; names optional | Pending |
| Leave and reconnect | No stale membership, duplicate counting or false zero during reconnect | Pending |
| Count-only source | Reliable count displayed without fabricated names/capacity | Pending |
| Game-process restart | New generation; old data/idle continuity invalidated before new validation | Pending |
| Collector restart with players present | Reconstruct full membership or return unknown, never default zero | Pending |
| Log rotation with players present | Preserve proven continuity or return unknown | Pending |
| Missing/truncated/malformed data | Unknown count; no false empty state | Pending |
| Stale/future observation | Test 120-second age and 30-second future boundaries and values just outside | Pending |
| Query/SSM timeout or failure | Unknown telemetry; failure does not establish zero | Pending |
| Password-protected joining | Correct password succeeds; absent/incorrect password fails | Pending |
| Service and EC2 stop/start | Clean exit evidence, automatic boot and same world/recent changes | Pending |
| Backup restore | Isolated restoration recovers expected world/progress | Pending |

For lifecycle tests, retain sanitized save timestamps/checksums, shutdown completion evidence and in-game observations. A changed checksum by itself does not establish successful persistence. Each result needs an operator, date, build, evidence location and pass/fail explanation before its status changes to verified.

## 6. Costs, handoff checks and remaining gates

The original documentation handoff added no Firebase usage or AWS resources. Record the provisioned host's selected EC2 runtime, EBS capacity, encrypted backup storage/retention, network transfer/public IPv4, management connectivity and any applicable SSM/CloudWatch costs. Record pricing date, currency and running/stopped assumptions; stopping EC2 does not remove persistent-resource charges. Existing site estimates remain approximate compute-only values, not a complete AWS bill. Backend runtime cost changes are listed below; nothing has been deployed by the agent.

Handoff review checks:

- Local Markdown links resolve; requirements agree with the Phase 1 checklist.
- Proposed settings, vendor-documented behavior and pending evidence are clearly separated.
- No credential values, real owner/account identifiers or raw logs are included.
- The original documentation-only handoff needed no build; later implementation checks are recorded by phase below.

Outstanding gates: remaining operator inputs and verified host inventory; installed-build/runtime details; verified private-world import/joining; clean shutdown/boot/persistence; backup restoration; source selection and sanitized player-status fixtures. Documentation of the contract is complete, but its live validity is not established. Keep Phase 1 incomplete and automatic-stop readiness blocked until these gates pass. Independent later-phase work may proceed under the phased plan without treating fixtures or this runbook as live proof.

## 7. Phase 2 backend groundwork

### Implemented boundaries

The backend accepts explicit `palworld` or `dragonwilds` IDs and resolves configuration only after the existing authorization and availability checks. Palworld requests do not load Dragonwilds configuration. Dragonwilds configuration reads Palworld's non-secret instance ID solely to reject accidental host reuse. Client-supplied instance IDs are ignored.

**Historical Phase 2 authorization, superseded by Phase 5:** both games originally used shared `/gameServerAccess` grants and live admin fallback. Per-game settings, actions, audit and compute estimates use separate RTDB branches. Settings/event/admin-audit reads preserve omitted-ID Palworld compatibility; explicit invalid IDs are rejected. Missing Dragonwilds availability is disabled, while Palworld retains its existing default.

| New Functions parameter | Kind | Default / handling |
| --- | --- | --- |
| `DRAGONWILDS_INSTANCE_ID` | `defineString` | Empty; never falls back to Palworld |
| `DRAGONWILDS_GAME_PORT` | `defineString` | `7777`; existing integer/range parser falls back on invalid input |
| `DRAGONWILDS_WORLD_NAME` | `defineString` | Empty; returned only in enabled authorized detail/action responses |
| `DRAGONWILDS_CLOUDWATCH_NAMESPACE` | `defineString` | `CWAgent`; metric query selects the Dragonwilds instance |
| `DRAGONWILDS_CAPACITY` | `defineString` | Empty/invalid means unknown; supply only verified positive integer capacity |

These are Functions deployment parameters, not a claim about the container image's environment variable names. Existing backend AWS credential secrets and region configuration are reused. No new credential parameter or password response is introduced; Dragonwilds admin/join passwords remain host-managed. Existing Palworld credential handling is unchanged.

Dragonwilds telemetry returns `playerCount: null`, `players: []`, optional configured capacity and best-effort CloudWatch RAM. It performs no SSM player query. The shared CloudWatch HTTP request has a five-second timeout. `telemetryCheckedAt` records the API attempt, not a trustworthy membership observation from the deferred snapshot contract. Running EC2 produces a readiness-unverified message plus the public `IP:7777` connection address when AWS supplies one. The authorized page also displays intentionally public join password `123`; neither indicates that the game is ready to join.

The scheduler retains one ten-minute schedule and isolates each game's errors. Disabled/unconfigured games skip AWS work. Configured/enabled Dragonwilds clears any existing idle eligibility, then skips automatic stop regardless of count/capacity settings. Status never displays a Dragonwilds idle countdown. Palworld retains its 30-minute zero-player policy. A future verified adapter and continuity implementation are required to remove this explicit Dragonwilds gate.

Start/stop use the selected EC2 instance with existing state checks, audit results and idle resets. Dragonwilds manual stop skips optional telemetry entirely. This implements EC2 control, not a verified game save/exit mechanism: keep availability disabled until Phase 1 establishes safe shutdown. No live start/stop, config mutation or deployment was performed.

### Runtime cost impact after deployment

- Catalog: one callable; up to two fast EC2 describes for enabled/configured games, separate settings/cost reads and Palworld idle read. No SSM or CloudWatch calls. Running supported instance types retain small monthly compute-estimate updates.
- Dragonwilds detail: status performs one EC2 describe plus settings/cost work; separate running telemetry performs one EC2 describe and one bounded CloudWatch query. Events remain a separate bounded-result read. No player SSM query or history storage.
- Actions: selected-game EC2 describe/control, cost work, one idle reset and audit append/retention work. Dragonwilds stop adds no telemetry requests; Palworld behavior is retained.
- Scheduler: still approximately 4,320 invocations per 30-day month. Adds one Dragonwilds settings read per invocation, plus one idle-state read when configured/enabled and a reset write only when old eligibility exists. No Dragonwilds EC2, SSM or metric calls in this deferred-auto-stop version.
- No client listeners, per-player calls, grant migration, database rules change or new secret binding. Audit retention remains 50 entries per game; user/admin responses remain five/25 entries.

### Validation and release limits

Functions build and targeted ESLint pass. The new test suite plus existing authorization suite pass 20 tests with mocked Firebase/AWS/Discord boundaries: target isolation, settings defaults, rejected IDs, disabled behavior, catalog failures, unknown telemetry, audit limits, Palworld idle behavior, direct grants, revoked access and live admin checks.

No frontend changes are included. The current catalog UI renders every result with Palworld components, so release of the new two-game catalog must wait for the client/catalog phases. Live player parsing, stale/generation snapshot tests, automatic idle shutdown and authorized join-password delivery are deferred from this implementation slice; do not mark those original acceptance items complete. Independent Phase 3 work can proceed with these explicit limitations.

## 8. Phase 5 independent authorization (local implementation)

Palworld grants remain at `/gameServerAccess/{discordUserId}`; Dragonwilds grants use `/dragonwildsServerAccess/{discordUserId}`. No copying, seeding or production migration occurred. Live Boss/Underpaw admins retain bypass; ordinary membership grants neither game. Both roots explicitly deny all browser reads/writes. Existing entries without expiry remain valid for Palworld.

Selected-game authorization is enforced before status, telemetry, actions and event reads. Services reject a verified authorization scope for the other game. Catalog checks both entries, verifies admin at most once when needed and filters before settings/config/AWS work. The session exposes independent computed capabilities plus aggregate navigation access. Missing capability maps fail closed on detail pages. Grant/access-status APIs retain omitted-ID Palworld compatibility, while explicit invalid IDs fail.

Admin Game Server Access now selects the game's list and availability together. Selection clears old forms and pending read results; mutations lock switching and capture game/session identity. Grant and settings refreshes remain independent. Disabling availability neither stops the EC2 host nor deletes grants. Dragonwilds remains disabled by default, with unknown player counts, readiness unverified and automatic idle shutdown inactive.

Costs: session/bootstrap and catalog add one small Dragonwilds grant-entry read for non-admins; verified-admin session bootstrap skips both grants. Catalog reads two individual entries and at most one live role check, avoiding all status/AWS work for hidden games. Selected detail/action/event calls still read one grant, without duplicate authorization reads. Admin selection loads one list plus one settings record; writes affect one selected branch. No new listeners, polling, per-player calls or scheduled work. Candidate endpoint still reads roster/links plus selected grants, but is not used by this UI.

Validation and exact commands are recorded in [Phase 5 implementation record](../DRAGONWILDS_PHASED_IMPLEMENTATION.md#phase-5-implementation-record---29-september-2026). Browser inventory returned no apps or browsers; desktop/mobile, themes, keyboard/focus, real mounted persona switching, clipboard, Stop/delete dialogs and visual regressions remain unverified. No deploy, live grant/infrastructure change or AWS action occurred. Coordinated backend/rules/frontend rollout remains future work: never release the new UI against the old shared-auth backend, and never roll back to shared authorization while Dragonwilds is exposed.

## 9. Phase 6 local verification and release handoff

Phase 6 adds fail-closed Palworld parsing: any malformed player row invalidates the whole response, so a partial or malformed list cannot manufacture zero players or trigger idle shutdown. Controlled-time tests cover malformed/failed queries and independent Dragonwilds handling. Valid Palworld player fields and valid empty lists retain their behavior. No Dragonwilds telemetry adapter, infrastructure, live grant change or deployment is included.

Mocked callable tests verify credential/raw-output/IP exclusion from responses and audits. Source inspection found no frontend AWS credential or backend admin-password references. The existing Palworld join-password UI constant remains client-visible: it must not be treated as a secret or as server authorization. This is distinct from backend admin credentials. No password value is recorded here.

See the [Phase 6 record](../DRAGONWILDS_PHASED_IMPLEMENTATION.md#phase-6-local-implementation-record---29-september-2026) for exact commands and limits. The unchanged client build and 48 offline client tests passed in Phase 5; updated Functions build and 32 tests pass in Phase 6, as do 20 rules tests. These do not prove live joining, clean saves, backups or reliable player telemetry.

### Operator evidence needed before release

Use sections 2?5 for setup, import, joining, clean shutdown and isolated restore. Do not substitute guessed Compose service names, mount paths or save commands. Fill each pending inventory value from sanitized host observations, then record each acceptance result with date, operator, build/image digest, evidence location, expected/observed result and rollback recovery point. Keep credentials and raw logs outside this repository.

| Gate | Required acceptance evidence | Current state |
| --- | --- | --- |
| Host isolation/setup | Distinct instance; verified persistent mount, boot supervision, SSM/IAM and metrics dimensions | Operator-reported provisioning only |
| Import/join | Intended world/progress; exact discovery name; correct password accepted and incorrect/missing password rejected | Pending |
| Save/shutdown | Supported save/exit and measured timeout; service and EC2 restart preserve recent in-game changes | Pending |
| Backup/restore | Consistent encrypted off-instance copy; isolated restoration demonstrates expected progress and recovery time | Pending |
| Player source | Sanitized zero/nonzero/count-only/failure fixtures; process/collector restart, rotation, freshness and generation continuity | Pending; no adapter implemented |
| Browser | Both games/admin selections, late responses, access combinations, mobile/desktop, themes, keyboard, copy and confirmations | Blocked: no available browser surface |
| Cost | Actual region/type/storage/backup/network/metrics inputs with dated running and stopped totals | Pending; formulas documented, no price quoted |

### Troubleshooting and rollback sequence

1. For access denial, check the selected grant root and expiry or current Boss/Underpaw role. Browser capabilities are hints, not authority. Changing one game's grant must not change the other. Never broaden RTDB browser rules to fix a denied callable.
2. For an unavailable card, inspect selected availability/configuration through the authorized operational path. A disabled card is expected; enabling availability does not prove host or save readiness. Catalog failures must remain isolated to that game.
3. For unknown players, preserve unknown state and idle reset. Check the validated source privately; do not infer zero from missing names, failed SSM or stale logs. Dragonwilds currently always reports unknown and cannot automatically stop.
4. Before any future rollout, record compatible backend/rules/frontend revisions and current recovery points. Deploy only through a separately authorized Phase 7 release, retaining disabled availability until the live gates pass. Never ship the new frontend against the historical shared-auth backend.
5. If rollback requires compute to stop, use a verified graceful shutdown before disabling normal website controls, or the operator infrastructure path afterward. Disabling availability does not stop a running host; it skips scheduler work. Preserve saves, encrypted backups and diagnostic evidence.
6. Keep both independent grant roots and private rules through rollback. A compatible UI rollback may hide Dragonwilds; do not restore shared authorization. Verify Palworld access, controls and world remain independent.

No release-ready or telemetry-ready claim is made until these gates have evidence. Phase 7 remains untouched.

## 10. Phase 7 catalog bridge and gated release

The subsequent [Phase 7 handoff](../DRAGONWILDS_PHASE_7_HANDOFF.md) records the locally implemented compatibility bridge, exact targeted deployment sequence, evidence gates, verification results and compatible rollback. No deployment occurred. Earlier statements that Phase 7 is untouched describe the prior handoff date/state.

Legacy catalog requests omit `includeDragonwilds` and remain Palworld-only. Current frontend sends `includeDragonwilds: true`; backend validates the boolean and limits selection before grant/status work. Independent game authorization remains authoritative. Keep the bridge after rollout so already-open old clients remain safe. When a running Dragonwilds instance has a public IP, authorized users receive its `IP:7777` address and can copy it from the page; the page also displays its intentionally public hard-coded join password. This does not make the password a credential and it must not be reused for host administration.

Full release still requires the verified host/source/idle/browser/cost evidence above. Current Dragonwilds telemetry remains unknown and automatic stop remains explicitly disabled. New bridge tests do not close those gates. No host configuration, world, grant, IAM or secret was changed.
