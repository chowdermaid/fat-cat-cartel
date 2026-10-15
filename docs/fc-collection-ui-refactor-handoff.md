# FC Collection UI redesign handoff

Prepared 15 October 2026 from the local repository at `C:\Projects\fat-cat-cartel`.

This is a source-based implementation inventory for another chatbot or developer. It is not a live-site visual audit. No FC Collection implementation was changed while preparing it. Source files remain authoritative if the project changes after this snapshot.

## 1. The request and product context

The owner wants a full visual redesign of FC Collection because the current page feels generic. No specific visual direction has been selected yet. The immediate goal is a distinctive, usable interface that fits Fat Cat Cartel while retaining existing collection functionality.

Fat Cat Cartel is a Final Fantasy XIV Free Company website, also branded as The Meowfia. Its tone is playful, social, cat-themed, and occasionally cheeky. It serves an existing community with member profiles, collection tracking, mount roulette, raid stats, calendar, crafting and trading tools, and administration. Collection should feel like part of that community, with useful character and collectible imagery, rather than a generic business dashboard.

The feature has three connected screens. Treat the overview as the primary redesign target, and account for its matrix and leaderboard destinations when defining a coherent design. The owner has not explicitly selected which of those secondary screens to rebuild first.

Users can currently:

- See what the FC collectively owns and which members specialize in different activities.
- Browse mounts, minions, titles, and selected achievements.
- Compare item ownership across a chosen set of members.
- Identify items nobody owns or everybody owns.
- Inspect collectible metadata and sources.
- Compare member rankings and achievement specialties.
- Include tracked Friends alongside FC members.

This is a public, read-only collection interface. Collection ownership is imported; users do not tick off owned items themselves. Admin refresh and roster management are separate workflows.

## 2. Stack and application shell

Versions below are declared package ranges at the time of inspection, not a claim about the latest upstream releases.

| Area | Existing implementation |
| --- | --- |
| UI | React `^19.2.4`, React DOM `^19.2.3`, TypeScript `~5.9.3` |
| Build | Vite `^8.0.1`, React Vite plugin, ESM package |
| Styling | Tailwind CSS `^4.2.2` through `@tailwindcss/vite` |
| Routing | TanStack Router `^1.168.8`, manually registered routes |
| Primitives | Local shadcn-style components built on Radix, CVA, clsx, tailwind-merge |
| Icons | Lucide React |
| Motion | AnimeJS `^4.3.6` |
| Backend | Firebase JS SDK `^12.11.0`, Realtime Database, Firebase Functions v2, Node 22 Functions |
| Notifications | Sonner |
| Available elsewhere | ECharts, Recharts, Embla Carousel; FC Collection currently uses none of these for charts/carousels |
| State | React hooks and localStorage; this feature does not use a query/state-management library |

Relevant shell files:

- `src/main.tsx`: entry point and RouterProvider.
- `src/app/router.tsx`: routes.
- `src/components/layouts/RootLayout.tsx`: shared sidebar, header, main content, toasts.
- `src/components/layouts/AppSidebar.tsx`: global navigation and theme toggle.
- `src/index.css`: theme tokens, typography, global styles.
- `src/lib/utils.ts`: `cn()` helper.

The current shell main area uses `min-w-0 flex-1 overflow-x-hidden px-6 py-8`. Wide collection content must manage its own scrolling; overflowing the page can cause clipping. Do not add a duplicate application sidebar or header inside the feature.

Theme and typography:

- Dark mode is the default unless the stored theme is light. Both must work.
- Primary accent is warm gold/amber: `oklch(0.7686 0.1647 70.0804)`.
- Dark background is `oklch(0.2046 0 0)`; dark cards are `oklch(0.2686 0 0)`.
- Light mode uses a white background with neutral muted surfaces.
- Body: Nunito Sans. `font-serif` actually maps to Nunito, a rounded sans-serif. Mono: JetBrains Mono.
- Base radius token is `0.375rem`; prefer the existing compact radius scale.
- Use semantic Tailwind colors such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-primary`.

Available local primitives include Button, Badge, Avatar, Card, Dialog, Sheet, Input, Label, Select, Checkbox, Command, Popover, Tooltip, Progress, Skeleton, Table, ScrollArea, Separator, Sidebar, Carousel, and Chart. There is no local `tabs.tsx` in the inspected component directory; do not assume every shadcn component is already installed.

The local ScrollArea supports `viewportClassName` and includes both horizontal and vertical scrollbars.

## 3. Routes and source map

| URL | Component | Purpose |
| --- | --- | --- |
| `/fc-collection` | `FCCollectionPage` | Overview |
| `/fc-collection/mounts` | `CollectiblePage` | Mount matrix |
| `/fc-collection/minions` | `CollectiblePage` | Minion matrix |
| `/fc-collection/titles` | `CollectiblePage` | Title matrix |
| `/fc-collection/achievements` | `CollectiblePage` | Achievement matrix |
| `/fc-collection/leaderboard` | `LeaderboardPage` | Rankings |

The four type pages use the dynamic route `/fc-collection/$type`. These routes are siblings under the root layout. There is no separate collection parent layout or authentication gate on these route definitions.

```text
src/features/fc-collection/
  index.tsx                         Exports the three route pages
  types.ts                          Catalog, ownership, scope, state types
  constants.ts                      Types, expansions, achievements, cache keys
  api/
    useFCCollection.ts              Shared cached collection loader
  hooks/
    useCollectionScope.ts           FC / FC and Friends preference
  utils/
    collectionData.ts               Catalog normalization and ownership sets
    collectionScope.ts              Friend detection and scope filtering
    collectionDisplay.ts            Sync timestamp formatting
  components/
    FCCollectionPage.tsx            Overview page shell
    scope/CollectionScopeToggle.tsx
    overview/
      FCStats.tsx                   Coverage, rarest items, specialty leaders
      CollectionOverviewCards.tsx   Four collection entry cards
    detail/
      CollectiblePage.tsx           Type page and loading/empty states
      CollectibleGrid.tsx           Filters, state, matrix, ownership bars
      MemberPicker.tsx              Draft/apply member selection dialog
      MemberHeader.tsx              Matrix avatar/name/count column header
      CollectibleDetailDialog.tsx   Item metadata dialog
    leaderboard/
      LeaderboardPage.tsx           Ranking page shell
      LeaderboardTable.tsx          Scoring, sorting, category filters, rows
```

## 4. Current overview

Current order:

1. Library icon, “FC Collection” title, “I love data” subtitle, scope toggle.
2. Eight achievement specialty cards plus The Hoarder and Rarest Collection, in a responsive grid reaching five columns on large screens.
3. Three secondary panels: rarest owned item, collection coverage, and leaderboard link.
4. Lodestone privacy explanation.
5. Four category navigation cards, reaching four columns on large screens.

This repeated card treatment is the existing structure, not a requirement for the redesign.

Each category card shows catalog size, rounded average owned count, scoped member/person count, and a link to that matrix. Achievement average here is an item count, even though the achievement leaderboard uses points.

Specialty leaders are ranked by achievement points within these pools:

| Card | Categories |
| --- | --- |
| Arcade Goer | Gold Saucer |
| PVP Enthusiast | Frontline, The Wolves' Den |
| Grass Toucher | Miner, Botanist, Fisher |
| Quest Enjoyer | Main Scenario, Allied Society Quests, General |
| Sweat | Trials, Raids, Dungeons, Duty |
| The Deep Diver | Deep Dungeon Weapons, Phantom Weapons |
| The Artisan | All eight crafting disciplines, Cosmic Tools, All Disciplines |
| The Explorer | Field Operations, Treasure Hunt |

Each shows the leader's avatar/name, points, percentage of that pool's available points, and a small progress bar. Ties select the first encountered member. Every specialty card currently links to the general achievements matrix, without selecting its specialty filter.

Other calculations:

- **The Hoarder:** largest sum of owned mount, minion, and title counts. Achievements are excluded. Links to leaderboard.
- **Rarest Collection:** member with the lowest arithmetic mean of public ownership percentages for their known owned mounts. No minimum collection size or weighting. Links to mounts.
- **FC/Group's Rarest Item:** lowest public ownership percentage among all four catalog types, provided at least one scoped member owns it. Links to its type page.
- **FC/Group Coverage:** distinct catalog items owned by at least one scoped member divided by catalog size, separately for each type. This is a union of ownership, not average member completion.
- **Leaderboard panel:** link to rankings, currently with a playful Axo-related description.

Privacy notice: Lodestone Achievements, Mounts, and Minions should be public, set to “Everyone”. It links to `https://na.finalfantasyxiv.com/lodestone/my/setting/account/`. Preserve discoverable guidance for missing data; wording and placement may change.

The overview currently does not consume the loader's `loading` or `lastFetched` values. It can briefly render zero-count category cards, while `FCStats` renders nothing until members exist.

## 5. Current collection matrix and detail dialog

The type page shows title, catalog item count, scoped member count, sync timestamp, and scope toggle. It supports an animated loading skeleton, unknown-type message, and an empty-catalog message directing users to admin refresh.

Matrix:

- Rows are collectibles; columns are selected members.
- First column contains icon and item name, opening a detail dialog.
- Member headers show avatar or initial fallback, name, ownership count over full catalog size, and progress bar.
- In FC and Friends scope, Friend badges appear on applicable member headers and picker entries.
- Cells show a green check for owned and a muted minus for missing.
- Last column shows ownership count and bar for the **currently visible members**.
- Column headers and the first column are sticky.
- ScrollArea height is currently `calc(100vh - 22rem)`.
- All filtered rows are rendered. There is no pagination or virtualization. Only the first 80 rows receive the filter-change entrance animation.

Filters and exact semantics:

| Control | Behavior |
| --- | --- |
| Search | Case-insensitive item-name substring |
| Expansion | One of All, ARR, HW, SB, ShB, EW, DT |
| Expansion mapping | Numeric patch ranges `[2,3)`, `[3,4)`, `[4,5)`, `[5,6)`, `[6,7)`, `[7,8)` |
| Sources | Multi-select chips derived from catalog source types; match ANY selected source |
| Quick filter | All; Nobody has; Everyone has |
| Quick filter population | Selected visible members after scope/member filtering |
| Sort | Ascending numeric patch by default, or ascending name |
| Member picker | Multi-select dialog with Select all, Clear all, Cancel, Apply |

Filters combine with AND across search, expansion, source, and quick-filter conditions. The result count shows filtered items out of the full catalog. Search, expansion, sources, quick filter, and sort are component state, not URL query parameters or persisted settings.

Member selection persists separately per type. An **empty selected-ID set means all members** in this matrix. Applying every member also normalizes to an empty set. Consequently, Clear all then Apply returns to all members; the current model cannot represent an explicitly empty displayed group. Cancel discards draft edits. Selection IDs outside the current scope are pruned.

Member-header totals use the entire catalog and owned set, not the currently filtered row count. Keep this distinction clear if redesigning the headers.

The item dialog includes:

- Name, optional larger image, optional description.
- Patch and public ownership percentage.
- Optional achievement points.
- For mounts detected by the `seats` field: movement and seat count.
- Source type and explanatory text.

It has no ownership editing, wishlist, acquisition timeline, item comments, or external item-link workflow.

## 6. Current leaderboard

- Four collection type controls; default is mounts.
- Achievements additionally offer All, Battle, PvP, Exploration, Crafting, Gathering, and Story groups.
- Switching collection type resets the achievement group to All.
- Mounts, minions, and titles rank by descending owned-set size.
- Achievements rank by sum of points for owned IDs in the selected achievement pool.
- Completion denominator is catalog count for count-based types and available pool points for achievements.
- Ranks are sequential `index + 1`; ties do not share a rank.
- First three rows receive medal labels and distinct background tints.
- Rows show avatar/name, optional Friend badge, score, completion percentage/bar, positive delta, and rarest owned item.
- Rarest-item details are currently hidden below the `lg` breakpoint.
- Rarest item is selected from the active catalog/pool using lowest public ownership percentage.
- Empty-member state exists. Loading is currently a plain text message.

**Delta is an item-count change**, calculated as current owned-set size minus the previous owned count for that type. This remains true on achievements and achievement subgroup views. It is not a points gain, subgroup-specific gain, daily gain, or ranking movement. Only positive values render a badge; zero and negative values show a dash.

Group membership is in `ACHIEVEMENT_GROUPS` in `constants.ts`. It overlaps the specialty pools above, but Exploration includes Gold Saucer, and Battle includes Deep Dungeon Weapons and Phantom Weapons. These groupings are product logic, not merely display labels.

## 7. Data contract and ownership

Source flow:

```text
Canonical /members roster + external FFXIV Collect
  -> server-side refresh Functions
  -> /fcCollection/collectibles and /fcCollection/memberData
  -> useFCCollection + localStorage cache
  -> scope filtering + client-side derived statistics
  -> overview / matrix / leaderboard
```

The browser never calls FFXIV Collect APIs directly. Catalog images and member avatars are URLs supplied through the stored data; the browser loads those images normally.

Key client types, abbreviated from `types.ts`:

```ts
type CollectibleKey = "mounts" | "minions" | "titles" | "achievements";
type CollectionScope = "fc" | "all";

interface Collectible {
  id: number;
  name: string;
  description?: string;
  icon: string;
  image?: string;
  patch: string;
  owned: string;
  points?: number;
  sources?: { type: string; text: string }[];
}

interface Mount extends Collectible {
  seats: number;
  movement: string;
  image: string;
}

interface MemberCacheData {
  avatar: string;
  owned: Record<CollectibleKey, number[]>;
  previousOwned: Record<CollectibleKey, { count: number; asOf: number }>;
  lastFetched: number;
}
```

`Collectible.owned` is FFXIV Collect's public ownership/rarity value, consumed as a string and parsed numerically for comparisons. It is not a member's ownership flag and not the FC ownership percentage. Do not label it as an independently verified percentage of every FFXIV player.

Normalized `MemberWithMounts` records contain `id`, `name`, `lodestoneId`, `fcRank`, `isFriend`, `avatar`, ownership Sets for **all four types**, and previous counts for all four types. The historical name does not mean mount-only data. Missing member cache yields empty owned sets and an empty avatar; this is not proof that the character owns nothing.

`useFCCollection()` returns:

```ts
{
  members,
  allCollectibles,
  membersWithMounts,
  memberData,
  lastFetched,
  loading
}
```

There is currently no `error`, retry, refetch, or mutation function in that contract. `lastFetched` comes from the catalog timestamp; raw `memberData` has individual timestamps. The normalized member type does not include those timestamps.

Database boundaries:

| Path | Ownership/purpose |
| --- | --- |
| `/members/{lodestoneId}` | Canonical tracked identity and FC rank |
| `/fcCollection/collectibles/lastFetched` | Catalog refresh timestamp |
| `/fcCollection/collectibles/{type}/{itemId}` | Catalog objects keyed by numeric item ID represented as a key |
| `/fcCollection/memberData/{lodestoneId}` | Avatar, owned IDs, previous counts, member refresh timestamp |
| `/memberSyncStatus/{lodestoneId}/collection` | Admin-facing synchronization metadata; collection pages do not fetch this |
| `/memberExclusions/{lodestoneId}` | Prevents deleted members being reimported |
| `/friendRefreshQueue/{jobId}` | Server-side Friend signup work |

Catalog normalization accepts both arrays and ID-keyed objects and discards null/non-item entries. Owned arrays may also arrive as Firebase object-shaped values and are converted to Sets.

Achievements are an allowlisted subset of FFXIV achievements. Frontend config and backend refresh duplicate the allowlist. Keep them aligned if categories are ever deliberately changed. Achievement catalog fetch limit is 5,000. Their categories are normalized into `sources` for shared filtering.

Lodestone job levels, Tomestone totals, raid data, and profile biographies have separate ownership and loaders. Do not replace these collection values with superficially similar totals from another source.

## 8. Scope, caching, refresh, and cost constraints

Scope:

- `fc` is default and excludes only records whose `fcRank` is exactly `"Friend"`.
- `all` includes FC and Friends.
- Null/other ranks are retained in FC scope.
- This controls the population for overview statistics, matrix, and leaderboard.
- Friends are normal `/members` records, not a separate membership database.

Persistence:

| localStorage key | Meaning |
| --- | --- |
| `fcc_collection_v3` | Aggregate members, catalogs, member data, timestamps; 3-hour TTL |
| `fcc_collection_scope_v1` | `fc` or `all` preference |
| `fc-member-filter-mounts` | Selected matrix member IDs |
| `fc-member-filter-minions` | Selected matrix member IDs |
| `fc-member-filter-titles` | Selected matrix member IDs |
| `fc-member-filter-achievements` | Selected matrix member IDs |
| `fcc_collectibles_v1` | Separate member-profile mount/minion lookup; 24-hour TTL |

A fresh aggregate cache satisfies the collection loader without Firebase reads. On a cache miss, it performs three parallel `get` operations: `/members`, `/fcCollection/collectibles`, `/fcCollection/memberData`. These download the full roster, all catalogs, and all ownership arrays. Scope and display filters run locally and do not narrow those downloads.

Do not turn filtering or switching tabs into backend requests. Keep the shared loader at the page/orchestration level rather than calling it independently in every new panel. It has no shared in-flight request deduplication. Do not add live listeners, polling, per-item reads, per-member reads, or automatic refresh callables as part of a visual redesign. New large imagery can also increase transfer cost.

Backend implementation is `functions/src/refresh-fc-collection.ts`; exports/scheduling are in `functions/src/index.ts`.

- `dailyMaintenance` runs at **08:00 Australia/Sydney daily**, including collection refresh alongside other maintenance.
- `triggerFCCollectionRefresh` is an admin callable for a full refresh.
- `refreshMemberSource` with source `collection` supports admin per-member refresh.
- Friend signup can trigger an immediate member collection refresh via its queue worker.
- Full refresh uses canonical `/members`, catalog fetches, and each tracked character's profile plus four owned lists; it writes a multipath update.
- Full external request count is approximately `5 + 5 * trackedMemberCount`: FC refresh request, four catalogs, then profile plus four ownership lists per member.
- A single-member refresh updates member data, not catalogs.
- Collection access to FFXIV Collect needs no API secret. Protected admin callables still use the project's Discord session authorization.
- RTDB collection data is public-readable and not client-writable. Writes belong to Functions/Admin SDK.

Important existing caveats:

- One Cost Notes paragraph in `docs/fc-collection-implementation.md` still says scheduled refresh is every three hours. The actual schedule and earlier doc section say daily at 08:00 Sydney. Three hours is the frontend cache TTL.
- Full admin collection refresh currently does not invalidate `fcc_collection_v3`. A fresh client cache can remain stale afterward.
- Single-member refresh clears aggregate and profile collectible caches. Profile/rank edits clear the aggregate cache. The delete path still clears legacy `fcc_collection_v2` rather than the aggregate v3 key.
- Thrown member-fetch failures retain previous member data. However, an individual owned-list HTTP failure currently becomes an empty list while the overall fetch can still be marked refreshed. Do not promise that every empty/missing value is authoritative or that all upstream failures preserve ownership.

These are existing behaviors to flag, not a request to change backend logic or cache policy during the visual refactor.

## 9. Shared consumers and refactor boundaries

Mount Roulette directly reuses:

- `api/useFCCollection.ts`
- `hooks/useCollectionScope.ts`
- `utils/collectionScope.ts`
- Collection types
- `components/detail/MemberPicker.tsx`
- `components/scope/CollectionScopeToggle.tsx`

Its MemberPicker passes `defaultToAll={false}`. Preserve this prop and verify roulette if changing the shared picker. Roulette member selection is local React state, not the matrix's per-type persistence.

Member profiles depend on collection types/constants and stored member collection data, plus a separate mount/minion lookup cache. Admin depends on the same data types and cache keys. Global sidebar, homepage links, and member-profile navigation link to `/fc-collection`.

A visual redesign can substantially reorganize feature markup, hierarchy, responsive layout, typography, navigation presentation, imagery, and local interaction affordances. Preserve existing URLs, score definitions, scopes, stored keys, API contracts, shared component contracts, and data ownership unless a behavior change is explicitly agreed.

Prefer feature-local styling over changing global tokens or shared primitives for one page. Do not alter unrelated homepage work or assets. At preparation time the working tree already included homepage scrapbook changes, carousel image additions/deletion, and generated Graphify changes; preserve pre-existing work.

## 10. Existing limitations and useful design considerations

These observations come from source inspection, not a rendered accessibility or usability audit:

- Repeated cards give many metrics similar visual weight; category navigation currently comes after the stats and privacy notice.
- Overview has no dedicated loading/freshness display. The loader's rejected Promise has no catch/error state, so failures can leave detail/leaderboard loading indefinitely.
- Zero ownership and unavailable member data are conflated in the normalized model. Raw member timestamps are already available if a carefully scoped freshness presentation is desired.
- Empty achievement pools can still choose the first member as a zero-point specialty leader.
- The matrix can be very wide and tall, especially for achievements. Preserve comparison access on mobile; do not remove data merely to fit a narrow viewport.
- Current stats use different denominators. Coverage, average owned, individual completion, public rarity, and visible-member ownership must have distinct labels.
- Historical records contain previous counts, not previous item lists or a time series. A real activity feed, acquired-item timeline, points history, streak, or weekly trend cannot be reconstructed reliably from these fields.
- Current source chips, ownership cells, and segmented controls would benefit from explicit accessible labels/selected states. A redesign should support keyboard navigation, focus visibility, meaningful image fallbacks, and non-color ownership indicators.
- Collection animations currently do not consistently handle reduced motion. New motion should respect it and clean up timers/animations.
- New wishlist, personal dashboard, farm-planning, export, or live-refresh features are not already implemented. Clearly identify any such proposal as a scope addition.

Potential design direction is open. Use the FC's identity and actual collection content to explore a stronger hierarchy; do not assume the owner has chosen a newspaper, trophy cabinet, game HUD, or any other specific motif. Keep dense data useful and legible.

## 11. Local development and verification

For a quick offline UI preview in PowerShell, set the variable only in the process environment:

```powershell
$env:VITE_USE_STUBS = "true"
npm run dev:stub
```

Do not edit `.env` or inspect secrets. The database wrapper chooses the stub when this variable is true. For production-shaped collection data, use the project's existing emulator workflow (`npm run dev:emulator`, `scripts/dev-emulator.mjs`, and the collection implementation doc). Use emulators for changes involving data paths, rules, or callable behavior.

Current stub limitations in `src/lib/db.stub.ts`:

- 20 roster entries, including three Friends; many lack member collection data.
- 12 sample mounts and 6 sample minions.
- Empty title and achievement catalogs.
- Only three sample member collection records.
- Empty image/avatar URLs in collection fixtures.
- Placeholder `owned` strings such as `10000`, which are not representative public ownership percentages.

Therefore, stub screenshots alone cannot validate real imagery, achievement rankings, rarity formatting, or realistic matrix scale. Use emulator data or explicitly labeled local fixtures for those states. Do not fetch production data or trigger a live refresh just to obtain a mockup. Older docs describing only one stub Friend are stale.

Validation after implementation:

```powershell
npm run build
npx eslint src/features/fc-collection
```

Use `npm run lint` if required by the scope of changes. The build runs TypeScript project checking and Vite. No dedicated collection test file was found in the current `tests/` directory. Add focused calculation tests if extracting/changing meaningful scoring or filtering logic; do not create tests that simply mirror cosmetic markup.

Manually check:

- Overview, all four type pages, leaderboard, and direct route navigation.
- Both scopes, Friend badges, persisted preference, and selection pruning.
- Search, expansion boundaries, multi-source OR behavior, quick filters, and sorting.
- Picker draft/cancel/apply and empty-set semantics, including Mount Roulette if the shared picker changes.
- Item dialogs with missing image/description/source fields and mount-only metadata.
- Count rankings versus achievement points, subgroup denominators, and item-count deltas.
- Loading, empty catalog, empty roster, no matching items, stale/missing member data, and unknown type.
- Light/dark themes, narrow mobile, desktop, long names, many members, and large catalogs.
- Scroll containment, sticky headers/first column, keyboard use, dialog focus, and reduced motion.
- No added Firebase reads/calls while manipulating local controls.

After modifying code, run `graphify update .` when the CLI is available. Generated graph output should not be hand-edited. Deployment is separate from implementing and checking the redesign.

## 12. Repository rules and recommended reading order

Read `AGENTS.md` first. Key rules:

- Keep the change focused and prefer existing patterns and UI primitives.
- Use `@/` imports across features.
- Import RTDB helpers only from `@/lib/db`.
- Use Tailwind; avoid CSS modules and unnecessary abstractions.
- Use shadcn Button for new visible commands and ScrollArea for constrained scrollable feature content.
- Preserve dark mode and stable layout dimensions. Avoid gratuitous gradients, nested floating cards, and unrelated cleanup.
- No `.env` or secret edits. Note any Firebase or asset-transfer cost increases.
- For large refactors, keep a thin `index.tsx`, feature types/constants, API wrappers, hooks, pure utils, and domain-grouped components. Extract pure helpers first, then hooks/leaf components, then the page shell. Avoid new barrels.
- No em dashes in new code, comments, strings, or docs.
- Run the smallest relevant checks. Do not commit, deploy, or change unrelated work without a request.

Read these documents for their respective areas:

1. `docs/fc-collection-implementation.md`: domain and integration behavior; account for the source-confirmed stale statements noted above.
2. `docs/frontend-patterns.md`: visual and component conventions.
3. `docs/firebase-data-and-costs.md`: ownership, caching, cost, and database boundaries.
4. `docs/project-reference.md`: app structure, commands, assets, and verification.
5. `docs/admin-auth-implementation.md` only if touching protected refresh/admin workflows.

For code discovery, use the generated graph before broad searching when available:

```powershell
graphify query "How is FC Collection connected to its views and shared consumers?" --graph graphify-out/graph.json
```

Then inspect `constants.ts`, `types.ts`, `useFCCollection.ts`, and the relevant components before editing. Graph output is a discovery aid, not a replacement for source.

## 13. Starter prompt for the next chatbot

> I want to redesign the FC Collection experience in my existing Fat Cat Cartel FFXIV website because it looks generic. Use this handoff as implementation context, and verify the source if you have repository access. The overview is the primary target; account for the collection matrix and leaderboard as connected screens. First establish a distinctive visual direction and information hierarchy that fits the FC's playful identity, using the real metrics and interactions described here. Keep the existing React/TypeScript/Vite/Tailwind/shadcn stack, public routes, data contracts, cached Firebase reads, collection scopes, ranking semantics, member selection, and shared Mount Roulette dependencies intact. Do not invent historical data, new backend features, or a new design-library dependency. Call out any proposed behavior changes separately. Implement only the agreed UI scope, verify responsive/light/dark and interaction states, and report the exact checks run. Do not deploy as part of the refactor.
