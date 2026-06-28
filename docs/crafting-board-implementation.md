# Crafting Board Implementation

The crafting board is a lightweight recipe preview page at `/craftingboard`. It lets users search craftable FFXIV item outputs, add selected items to a local board, and scale recipe material totals by quantity.

## Current Scope

- Search and preview craftable item recipes, including direct materials, crystals, clusters, and nested precrafts.
- Crafting request dashboard read helpers and member create/accept/complete mutations exist.
- Requesters who choose "I have some of the materials" can add an optional 100-character materials note for Discord.
- Creating a request posts one Discord bot message and stores the returned channel/message IDs.
- Accepting and completing a request edit the existing Discord message without posting duplicates.
- Selected preview items live in React state for the current browser session.

## XIVAPI Usage

The page calls XIVAPI v2 directly from the browser:

```text
GET https://v2.xivapi.com/api/search
```

Query parameters:

- `sheets=Recipe`
- `query=ItemResult.Name~"<term>"`
- `limit=10`
- `fields=ItemResult.Name,ItemResult.Icon,AmountResult,CraftType.Name,RecipeLevelTable.ClassJobLevel,Ingredient[].Name,Ingredient[].Icon,AmountIngredient`

The API response is normalized into local recipe types in `src/features/craftingboard/api/xivapi.ts`.

- Output item id comes from `fields.ItemResult.row_id`.
- Output item name and icon come from `fields.ItemResult.fields`.
- Recipe id comes from result `row_id`.
- Crafter comes from `CraftType.fields.Name`.
- Craft level comes from `RecipeLevelTable.fields.ClassJobLevel`.
- Ingredients are built by zipping `Ingredient[]` with `AmountIngredient[]`, then dropping empty row `0`, missing names, and zero amounts.
- Selecting a recipe resolves a stable app-owned recipe snapshot with `/api/sheet/Recipe/{recipeId}` and the same minimal field list.
- Precraft lookup uses `/api/search?sheets=Recipe&query=+ItemResult=<itemId>&limit=1` for non-crystal direct ingredients, with a bounded recursive walk and in-memory recipe caches.
- `CraftType.Name` values are mapped to player-facing crafter jobs, for example `Smithing` to `Blacksmith`.
- Item names containing `Shard` or `Crystal` are grouped under crystals and shards; item names containing `Cluster` are grouped separately.

Icons use XIVAPI's asset endpoint:

```text
GET https://v2.xivapi.com/api/asset?path=<icon path>&format=png
```

`path_hr1` is preferred when present, otherwise `path` is used.

## Recipe Preview Cost And Traffic

Recipe search and preview do not read or write Firebase data. Request dashboard and create/lifecycle costs are covered below.

XIVAPI traffic is kept low by requiring at least 2 search characters, debouncing searches by about 300 ms, aborting stale requests, limiting search results to 10, using minimal fields, bounding precraft recursion, and caching repeated recipe and output-item lookups in memory.

## Request Extension Hook

The selected item model separates item identity, quantity, and recipe data so request persistence, member accept states, and Discord notifications can use app-owned snapshots without changing the XIVAPI normalization layer.

## Crafting Request Data Model

These paths and types define the persisted request workflow.

App-owned TypeScript request types live in `src/features/craftingboard/types.ts`.

Request statuses:

- `open`
- `in_progress`
- `completed`
- `cancelled`

Material statuses:

- `requester_has_all_materials`
- `requester_has_some_materials`
- `crafter_to_provide_materials`

Canonical request records should be written by Firebase Functions only:

```text
/craftingRequests/{requestId}
```

Dashboard indexes should stay compact and be written from the same Function mutations:

```text
/craftingRequestIndexes/open/{requestId}
/craftingRequestIndexes/inProgress/{requestId}
/craftingRequestIndexes/completedRecent/{requestId}
/craftingRequestIndexes/cancelled/{requestId}
```

`completedRecent` is for the dashboard only. It should include completed requests from the last 30 days and drop older entries during completion writes or a small scheduled cleanup. Canonical `/craftingRequests/{requestId}` records can remain available for detail/history views unless a future retention policy changes that.

All-time dashboard stats live separately:

```text
/craftingRequestStats/completedTotal
```

`completedTotal` is an integer counter for completed requests. It is incremented only after a successful `in_progress` -> `completed` transaction, so the compact Done metric can outlive the 30-day dashboard index.

Per-member fulfillment totals live under:

```text
/craftingRequestStats/memberTotals/{lodestoneId}
```

Each member total stores `fulfilledRequests`, `fulfilledItems`, and `updatedAt`. A completed or closed request credits the verified member who performed the action.

Each `/craftingRequests/{requestId}` record should include:

- `id`
- `status`
- `materialStatus`
- `materialNote`: optional 100-character requester note, stored only when the requester has some materials.
- `requester`: Lodestone ID, Discord user ID, character name, FC rank, and avatar URL.
- `acceptedBy`: optional assigned crafter with the same member fields plus `acceptedAt`.
- `completedBy`: optional member that completed or closed the request, with the same member fields plus `completedAt`.
- `items`: selected requested items, quantities, selected recipe ID, and recipe snapshot.
- `commission`: optional `{ offered, gil }` object. `gil` is nullable when a member wants to commission but does not enter an amount.
- `discordMessage`: Discord channel ID, message ID, and optional message URL.
- `createdAt`
- `updatedAt`
- `completedAt`
- `cancelledAt`, only for cancelled requests.

Recipe snapshots are stored on request creation so older requests do not change when XIVAPI data changes. A snapshot includes the output item, selected recipe ID, crafter job, recipe level, result amount, direct ingredients, crystals, clusters, precrafts, eligible FC crafters, `snapshottedAt`, and `source: "xivapi"`.

Eligible crafters are derived from `/members/{lodestoneId}/jobLevels`, which Lodestone sync already writes with canonical crafter job names such as `Carpenter`, `Blacksmith`, `Armorer`, `Goldsmith`, `Leatherworker`, `Weaver`, `Alchemist`, and `Culinarian`. The create Function stores the derived eligible crafter list in each recipe snapshot so request detail views do not need to recalculate historical eligibility.

The dashboard also has a read-only fallback: when an older request has no snapshotted eligible crafter list, it reuses the cached `useMembers()` data and computes eligibility from the same `/members` job levels. If no synced level exists for the required crafter job, the UI shows eligibility as unknown instead of guessing.

## Request Read Layer

The request read and mutation layer lives in `src/features/craftingboard/api/craftingRequests.ts`. Hook state lives in `src/features/craftingboard/hooks/useCraftingRequests.ts`.

It exposes:

- `CRAFTING_REQUEST_PATHS`: explicit RTDB paths for canonical requests and dashboard indexes.
- `readCraftingRequestDashboard()`: one-time reads for open, in-progress, and recent completed dashboard data.
- `readCraftingRequest(requestId)`: one-time detail read from `/craftingRequests/{requestId}`.
- `useCraftingRequests()`: hook state with grouped dashboard data, `loading`, `error`, and `isEmpty`.

The route entry at `src/features/craftingboard/index.tsx` is a thin export. Page, dialog, request dashboard, and shared UI components live under `src/features/craftingboard/components`, while stateful orchestration lives under `src/features/craftingboard/hooks` and pure display/data helpers live under `src/features/craftingboard/utils`.

The hook does not use live listeners. Completed dashboard records are filtered client-side to `completedAt` values from the last 30 days even though the future writer should also keep `/craftingRequestIndexes/completedRecent` pruned.

Stub mode includes open, in-progress, recent completed, old completed, and cancelled request data. The old completed stub is intentionally present under `completedRecent` so the read helper's 30-day filter can be exercised.

## Create Request Flow

`/craftingboard` opens request creation in one dialog from the Request item button. Members search craftable items, expand recipe snapshots, add one or more selected recipes to a request, choose one material status, optionally offer commission gil, then submit.

The form blocks:

- Empty request item lists.
- Missing material status.
- Quantities below `1`.
- Invalid commission gil values.
- Top-level gil, tip, and estimated material cost fields are not rendered or accepted.

Production persistence uses callable Function `createCraftingRequest`. The Function requires a verified Discord-backed member session with `requireMemberSession`, validates the payload, derives requester identity from the session, derives eligible FC crafters from `/members`, posts one Discord bot message to `DISCORD_DON_CHANNEL_ID`, stores the returned `channelId`, `messageId`, and message URL under `discordMessage`, then writes the canonical request plus open dashboard index with one multi-path Admin SDK update.

The Discord message includes requester mention and character name, material status, optional commission, item quantities, recipe job/level summaries, direct materials, crystals, clusters, precrafts, eligible crafters, and a link to `/craftingboard`. The link uses `ADMIN_APP_ORIGIN` when configured, otherwise the production web app URL.

If Discord posting fails, the Function throws and does not write the crafting request. If Discord posting succeeds but the Firebase write fails after retrying the same idempotent multi-path update, the Function attempts to delete the posted Discord message before throwing. Users should retry after seeing the error; automatic request resubmission is not enabled because repeated create calls can create new requests.

Required Functions config/secrets for crafting create:

- Secret: `DISCORD_BOT_TOKEN`
- Config: `DISCORD_GUILD_ID`
- Config: `DISCORD_DON_CHANNEL_ID`
- Config: `ADMIN_APP_ORIGIN`, optional for local/emulator links

Stub mode writes the same canonical and index paths through `src/lib/db.ts` helpers so the dashboard can be tested without Firebase credentials.

## Lifecycle Actions

Open requests can be accepted from the dashboard. Accept uses callable Function `acceptCraftingRequest`, verifies a member session, and runs a transaction against `/craftingRequests/{requestId}`. The transaction only commits when the request is still `open` and has no `acceptedBy`, which prevents two crafters from accepting the same request. After the transaction commits, the Function removes the open index entry and writes the in-progress index entry with a short retry loop, then edits the existing Discord message to show `accepted by` the verified crafter.

Open or in-progress requests can be completed from the dashboard. Complete uses callable Function `completeCraftingRequest`, verifies a member session, and runs a transaction against `/craftingRequests/{requestId}`. The transaction only commits when the caller is the requester, accepted crafter, or has the existing admin session flag. After commit, the Function removes active index entries, writes the completed-recent index entry, increments `completedTotal`, and edits the existing Discord message to show completed state.

Requesters or admins can close open or in-progress requests with `closeCraftingRequest`; close uses the same completed state and `completedTotal` increment as complete. Requesters or admins can move in-progress requests back to open with `reopenCraftingRequest`; reopen clears `acceptedBy`, removes the in-progress index entry, and restores the open index entry.

Request state in Realtime Database is the source of truth. If a Discord edit fails after accept, complete, close, or reopen, the Function logs a warning and still returns success. Missing `discordMessage` metadata or a deleted Discord message is treated as recoverable and logged instead of rolling back request state.

## Request Cost Impact

Current request flow adds reads only when the dashboard or detail helper runs, and writes only when a member submits the create form.

Read impact:

- Dashboard load: four one-shot reads for `/craftingRequestIndexes/open`, `/craftingRequestIndexes/inProgress`, `/craftingRequestIndexes/completedRecent`, and `/craftingRequestStats`.
- Home page Open Errand: one one-shot read for `/craftingRequestIndexes/open`.
- Request detail: one one-shot read for `/craftingRequests/{requestId}`.
- Member profile craft stats: one one-shot read for `/craftingRequestStats/memberTotals/{lodestoneId}`.
- Eligible crafter fallback: reuses `useMembers()` cache. When cache is cold or stale, that hook reads `/membersLastUpdated` and then `/members`; otherwise it adds no extra Firebase download.
- No live listeners and no polling.

Create write impact:

Current create cost is one callable Function invocation, one Discord API message post, one `/members` read inside the Function for eligible crafter derivation, and one multi-path RTDB update touching:

```text
/craftingRequests/{requestId}
/craftingRequestIndexes/open/{requestId}
```

If a material note is supplied, the same short string is included in the compact dashboard record and Discord embed. This adds no extra Firebase reads or Function calls.

The canonical request and open dashboard index both include Discord message metadata. If the final Firebase write fails after the Discord post and database retry, rollback attempts one extra Discord API delete. No client RTDB writes are used in production.

Lifecycle write impact:

- Accept: one callable Function invocation, one transactional canonical request read/write at `/craftingRequests/{requestId}`, one multi-path index update touching `/craftingRequestIndexes/open/{requestId}` and `/craftingRequestIndexes/inProgress/{requestId}`, then one Discord API message edit when metadata exists. Transient database update failures can retry up to three total attempts.
- Complete or close: one callable Function invocation, one transactional canonical request read/write at `/craftingRequests/{requestId}`, one completed-recent index read for 30-day pruning, one multi-path index/stat update touching active indexes, `/craftingRequestIndexes/completedRecent/{requestId}`, stale completed-recent removals if any, `/craftingRequestStats/completedTotal`, and `/craftingRequestStats/memberTotals/{lodestoneId}`, then one Discord API message edit when metadata exists. Transient database update failures can retry up to three total attempts.
- Reopen: one callable Function invocation, one transactional canonical request read/write at `/craftingRequests/{requestId}`, one multi-path index update touching `/craftingRequestIndexes/open/{requestId}` and `/craftingRequestIndexes/inProgress/{requestId}`, then one Discord API message edit when metadata exists.

Client writes should remain denied in `database.rules.json`; request mutations should use callable Functions with Discord-backed member sessions.
