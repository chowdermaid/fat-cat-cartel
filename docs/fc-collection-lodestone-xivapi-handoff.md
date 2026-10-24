# FC Collection: Lodestone + XIVAPI migration handoff

Status: **ON HOLD — investigation only; no implementation authorized.**

Recorded: 24 October 2026 (Australia/Sydney).

The user paused this proposal so it can be revisited later. Do not treat this document as an instruction to begin implementation, migrate data, trigger refreshes, or deploy. No application code, database data, schedules, or deployed Functions were changed during this investigation.

## Objective and proposed approach

Investigate removing the FFXIV Collect dependency while preserving FC Collection features wherever practical:

- **XIVAPI v2:** shared game-data catalogs and metadata for mounts, minions, achievements, and titles.
- **Public Lodestone pages:** per-character ownership and earned achievements.
- **Firebase Functions and RTDB:** normalize, validate, and cache results for the existing frontend and shared consumers.

This proposal supersedes the earlier idea of using Lodestone alone. Character ownership pages do not establish a complete game-wide catalog; XIVAPI supplies the independent catalog needed for items nobody in the roster owns.

This is a feasible architecture, not a completed design. Title coverage, identifier mapping, release/source metadata, catalog eligibility, and rarity behavior remain open.

## Why this was investigated

The user reported recurring disappearance of collection values, including Chow Chow appearing with zero achievement points after previously having values.

Static inspection found a concrete defect in `functions/src/refresh-fc-collection.ts`:

1. A non-success HTTP response from a member's ownership endpoint logs a warning and becomes `null`.
2. `parseOwned(null)` returns an empty array.
3. That empty array replaces previously saved ownership for the affected category.
4. The member receives a new `lastFetched` and is considered successfully refreshed.

Thrown failures, such as network exceptions or invalid JSON, take a different path that preserves previous ownership. An unexpected successful JSON object without an expected list can also become an empty list. The docs' general claim that failed fetches preserve data therefore does not describe every failure case.

The helper used for single-member refresh also discards its internal `refreshed` result. Its caller can mark a preserved fallback snapshot as a successful refresh.

These are confirmed code behaviors. The specific production incident affecting Chow Chow was **not** confirmed against production logs or RTDB. Switching data sources alone will not fix unsafe failure handling.

## Current implementation and relevant files

| Area | Files / behavior |
|---|---|
| Main implementation documentation | [fc-collection-implementation.md](fc-collection-implementation.md) |
| Firebase ownership and cost rules | [firebase-data-and-costs.md](firebase-data-and-costs.md) |
| Collection refresh | `functions/src/refresh-fc-collection.ts` |
| Scheduling and admin callable | `functions/src/index.ts`: `dailyMaintenance`, `triggerFCCollectionRefresh` |
| Per-member refresh orchestration | `functions/src/member-source-refresh.ts` |
| Frontend loader | `src/features/fc-collection/api/useFCCollection.ts` |
| Types and configuration | `src/features/fc-collection/types.ts`, `constants.ts` |
| Ownership normalization | `src/features/fc-collection/utils/collectionData.ts` |
| Overview | `src/features/fc-collection/components/overview/CollectionOverviewCards.tsx`, `FCStats.tsx` |
| Comparison matrix and details | `src/features/fc-collection/components/detail/CollectibleGrid.tsx`, `CollectibleDetailDialog.tsx` |
| Rankings | `src/features/fc-collection/components/leaderboard/LeaderboardTable.tsx` |
| Existing XIVAPI integration | `functions/src/meowket-board.ts` already uses `https://v2.xivapi.com`; inspect relevant conventions before adding another integration |

Current behavior to account for:

- The canonical roster is `/members`, keyed by Lodestone ID. `fcRank === "Friend"` controls FC versus FC-and-Friends scope.
- The full collection refresh attempts all members concurrently, with five external requests per member, then commits results with catalogs in one atomic root update. Individual request failures can still produce different outcomes within that update.
- The initial FFXIV Collect FC refresh POST is best effort; its HTTP status is not checked and there is no readiness confirmation for upstream character refreshes.
- `dailyMaintenance` runs at **8 AM Australia/Sydney daily** in the inspected code. The collection docs' cost section saying every three hours is inconsistent with that source.
- An uncached collection load reads `/members`, `/fcCollection/collectibles`, and `/fcCollection/memberData` using one-time reads.
- `fcc_collection_v3` caches the frontend snapshot for three hours. An already-open loader does not automatically refetch when the TTL elapses.
- Full admin collection refresh does not clear that browser cache. Single-member admin refresh clears collection and profile catalog caches.
- The header's `Catalog synced` timestamp does not guarantee every member's ownership was fetched successfully.
- Missing ownership becomes empty sets in the frontend and can display as zero rather than unknown.

## Evidence collected from Lodestone

Public requests without signing in succeeded for character `20439006`, Chow Chow on Sophia [Materia]. These are observations from the investigation date, not permanent expected totals or proof that every member is publicly readable.

| Page | Verified data |
|---|---|
| [Achievement history](https://na.finalfantasyxiv.com/lodestone/character/20439006/achievement/) | 12,490 overall points; 1,467 earned achievements over 30 history pages; numeric achievement detail IDs; recorded completion timestamps |
| [Battle achievements](https://na.finalfantasyxiv.com/lodestone/character/20439006/achievement/kind/1/) | Named entries, points, categories, and explicit completion markers in HTML, including `data-achieved` |
| [Achievement detail example](https://na.finalfantasyxiv.com/lodestone/character/20439006/achievement/detail/3945/) | Name, icon, points, requirement text, completion state/date |
| [Mounts](https://na.finalfantasyxiv.com/lodestone/character/20439006/mount/) | 111 distinct owned entries, matching the displayed total; icons and per-entry tooltip references |
| [Minions](https://na.finalfantasyxiv.com/lodestone/character/20439006/minion/) | 249 distinct owned entries, matching the displayed total; icons and per-entry tooltip references |

Three tooltips per collection were sampled. Mount names verified: Company Chocobo, Black Chocobo, Draught Chocobo. Minion names verified: Wayward Hatchling, Black Chocobo Chick, Princely Hatchling.

Tooltips expose names, descriptions, images, and associated item links. Mount tooltips also expose movement and, where shown, passenger capacity. Mount/minion ownership references use opaque Lodestone keys, not the numeric IDs currently stored by the app.

Do not assume all achievement collection work requires traversing the history pages: category pages may offer a better enumeration strategy. Select and validate a complete strategy before implementation. Lodestone notes that recorded achievement dates can reflect synchronization time rather than the exact in-game completion time.

## Evidence collected from XIVAPI v2

Primary documentation:

- [Overview and limitations](https://v2.xivapi.com/docs/welcome/): game-client data, not player or runtime ownership.
- [Reading sheets](https://v2.xivapi.com/docs/guides/sheets/): field selection, relationships, transient data, and enumeration with `after`/`limit`.
- [Version and schema pinning](https://v2.xivapi.com/docs/guides/pinning/): controlled updates rather than depending on changing defaults.

Live requests confirmed:

| Sheet | Fields / relationships inspected | Proposed role |
|---|---|---|
| [`Mount`](https://v2.xivapi.com/api/sheet/Mount/1) | Numeric row ID, `Singular`, `Icon`, `ExtraSeats`; associated transient descriptions | Mount catalog and descriptive metadata |
| [`Companion`](https://v2.xivapi.com/api/sheet/Companion/1) | Numeric row ID, `Singular`, `Icon`, behavior; associated transient descriptions | Minion catalog and metadata |
| [`Achievement`](https://v2.xivapi.com/api/sheet/Achievement/6) | `Name`, `Description`, `Icon`, `Points`, `AchievementCategory`, `Title`, item reward link | Achievement catalog, scoring, grouping, and reward mapping |
| [`Title`](https://v2.xivapi.com/api/sheet/Title/1) | `Masculine`, `Feminine`, `IsPrefix`, `Order` | Title catalog |

Example verified: achievement row `6`, "To Crush Your Enemies VI", links to title row `9`, "The Exterminator". This establishes a path for deriving achievement-awarded titles, but does not prove full title ownership coverage.

Only sample rows and a bounded achievement list were inspected. Complete enumeration, coverage comparisons, and all-member mapping were not performed.

## Feature mapping

The following describes the proposed Lodestone + XIVAPI outcome, not implemented behavior.

| Current feature | Proposed outcome | Remaining condition / visible change |
|---|---|---|
| Overview / Collections / Rankings navigation | Preserve | No route change needed solely for the source migration |
| FC / FC and Friends scope | Preserve | Continue using canonical member ranks |
| Mount and minion ownership | Preserve | Parse public Lodestone entries and verify numeric-ID mapping |
| Achievement ownership and points | Preserve | Retain the selected category allowlist and map category IDs; do not replace the current score with Lodestone's overall total |
| Titles category, comparisons, rankings | Conditional | Verify complete reward-to-title mapping and exceptions before promising parity |
| Overview catalog totals, average ownership, coverage, completion bars | Preserve with a validated catalog | Define eligible entries and treatment of unreadable member data |
| Eight specialty leaders | Preserve with category mapping | Arcade Goer, PVP Enthusiast, Grass Toucher, Quest Enjoyer, Sweat, The Deep Diver, The Artisan, The Explorer |
| The Hoarder | Conditional | Current sum includes mounts, minions, and titles; title coverage affects parity |
| Rarest Collection | Change or replace statistics source | Current metric is average FFXIV Collect public ownership of known owned mounts; proposed alternative is FC/group rarity |
| FC's rarest owned item | Change or replace statistics source | Public profiles and game sheets do not supply global ownership percentages |
| Ownership comparison matrix | Preserve | Add unknown/private/stale handling so unavailable ownership is not shown as a confirmed absence |
| Member picker, saved per-category selection, search, name sorting | Preserve | Existing local UI behavior can remain |
| Expansion filters and patch sorting | Conditional | Need release metadata/history; API version pinning is not itself a collectible release-patch field |
| Acquisition-source filters | Conditional | Need additional sheet joins and potentially curated classification; achievement categories are more directly available |
| All / Nobody has / Everyone has filters | Preserve with full catalog and known ownership | Include items nobody owns; do not classify unreadable members as missing |
| Item detail dialogs | Mostly preserve | XIVAPI supplies names, icons, descriptions, points, and related fields; patch/source metadata still needs work; rarity label must reflect its actual population |
| Count and achievement-point rankings | Preserve for validated categories | Completion percentages need valid denominators; title rankings remain conditional |
| Green `+N` change badges | Preserve | Currently item-count differences even for achievements; compare successful snapshots, not failures |
| Rarest item on each ranking row | Change or replace statistics source | Same rarity decision as overview |
| Sync status | Improve | Distinguish catalog refresh time from member ownership freshness and actual success |

### Shared consumers

| Consumer | Migration impact |
|---|---|
| Member profiles | Preserve collection totals; adjust rarest mount/minion statistics and the `fcc_collectibles_v1` cache as needed |
| Mount Roulette | Preserve ownership comparisons; full candidate catalog and expansion/source metadata are prerequisites for current behavior |
| Discord Friend signup/status | Reuse new refresh pipeline; remove instructions directing members to manually refresh FFXIV Collect |
| Admin source refresh/status | Preserve existing authorization and entry points; report real success/failure and invalidate relevant browser caches |

## Decisions and investigations required before implementation

1. **Catalog eligibility:** decide what completion totals include. Client records can be blank, unused, hidden, future content, legacy, seasonal, or otherwise unavailable. Do not equate every sheet row with an obtainable collectible. Preserve current achievement category scope unless deliberately changed.
2. **Identifier mapping:** establish and validate Lodestone opaque-key to numeric mount/minion ID mapping. Names alone are not a proven durable mapping. Check representative members, localization, duplicates, and newly introduced items. Determine whether existing numeric IDs can remain compatible.
3. **Titles:** enumerate achievement-title reward coverage and identify titles or historical cases not recoverable through public earned achievements. Distinguish verified ownership from inference or unavailable data.
4. **Patch and acquisition metadata:** prove which fields/joins provide the current filters and what needs explicit maintenance. Historical first appearance may help but is not automatically an authoritative release date.
5. **Rarity:** choose FC/group rarity, remove rarity features, or use another statistics source. FC rarity is a changed metric, not a substitute with equivalent values. Define scope, ties, stale data, and denominator; unavailable profiles must not count as confirmed non-owners.
6. **Completeness and failures:** define acceptance criteria for public/private pages, HTTP errors, unexpected HTML, pagination gaps, count mismatches, partial responses, and legitimate empty collections. Preserve prior valid ownership on invalid reads.
7. **Migration and cache compatibility:** decide catalog versioning, ID migration if necessary, browser cache invalidation, existing snapshot preservation, and rollback. Do not change production paths or deploy while these are unresolved.

## Proposed sequence when the user resumes

1. Recheck current source and these observations; continue with read-only validation of catalogs, mappings, title coverage, and metadata gaps.
2. Agree on eligibility rules and any intentional feature changes, especially rarity and incomplete title coverage.
3. Build narrowly scoped catalog and ownership adapters using existing Function patterns, bounded concurrency, timeouts, and appropriate retries. Pin XIVAPI schema/game version and select only required fields.
4. Normalize results into a compatible snapshot shape where practical. Introduce only the status/version fields needed to express actual outcomes. Keep source-specific parsing outside UI components.
5. Validate against fixtures and Firebase emulators. Compare existing and proposed results locally before any production migration; do not run both pipelines in production without accounting for doubled work/cost.
6. Update shared consumers, labels, docs, and cache invalidation. Plan any production rollout and rollback separately after review of concrete results.

## Cost and operational considerations

- Current full refresh external requests are approximately `5 + 5 * trackedMemberCount`.
- Direct mount/minion ownership requires two profile pages per readable member. Achievement enumeration adds multiple pages; the chosen approach is not yet finalized.
- Cache shared catalog/tooltip metadata across members. Do not fetch every tooltip again for every character or on every refresh.
- XIVAPI catalog enumeration must be paginated; row IDs can have gaps. Refresh shared catalogs centrally on controlled updates, not from each browser.
- Scraping, pagination, validation, and retries change Function runtime and external request volume. Measure with a representative roster before setting limits or estimating costs; this is not proven cheaper.
- The existing three frontend snapshot reads and one-time loading model can potentially remain. Additional status/catalog payloads may increase download size; document actual deltas before implementation.
- Avoid new live listeners, browser-side Lodestone scraping, automatic per-user Function calls, extra schedules, or extra Firebase reads without an explicit need and cost assessment.
- No runtime cost changes have been introduced by this investigation or document.

## Verification expected for a future implementation

- Fixture-backed checks for successful ownership, verified empty lists, private pages, HTTP failures, malformed responses, partial pagination/count mismatch, and preservation of old snapshots.
- Mapping checks for mount/minion IDs, achievement categories, title rewards, and catalog-only items nobody in the roster owns.
- Scoring and denominator checks, including unknown members, rarity population, and gains after a failed refresh.
- Emulator checks for full refresh, single-member refresh, Friend signup refresh, status metadata, and existing cache behavior.
- Verify Overview, Collections, Rankings, member profiles, and Mount Roulette against the same normalized data.
- Run `npm run build` for frontend changes and `npm run build` from `functions/` for Function changes, plus focused checks appropriate to the implementation.
- Follow repository Graphify instructions after code changes. This documentation-only handoff does not require an AST graph refresh.

## Resume point

The investigation is paused. The next useful step, if requested, is a **read-only feasibility check of full catalog eligibility, Lodestone-to-XIVAPI ID mapping, title coverage, and missing patch/source metadata**. No refactor or deployment has started.
