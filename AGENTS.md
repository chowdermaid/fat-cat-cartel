# Fat Cat Cartel: Codex Instructions

## Project Overview

Website for the FFXIV Free Company "Fat Cat Cartel" (The Meowfia). The app includes the FC home page, recruitment, member directory and profiles, FC collection tracking, mount roulette, raid stats, archived event pages, and an admin panel.

Frontend reads live data from Firebase Realtime Database. Local development can run against the in-memory stub with `VITE_USE_STUBS=true`, which avoids Firebase credentials for ordinary UI work. Scheduled and callable Firebase Functions refresh FFLogs, FFXIV Collect, and Lodestone data.

## Tech Stack

- React 19 + TypeScript, Vite 8
- Tailwind CSS v4 via `@tailwindcss/vite`
- TanStack Router with code-based routing in `src/app/router.tsx`
- Firebase Realtime Database v12 for app data
- Firebase Functions v2, Node 22, TypeScript under `functions/`
- shadcn/ui pattern: Radix UI primitives + CVA + tailwind-merge in `src/components/ui/`
- Lucide React for icons
- Embla Carousel for carousel UI
- ECharts via `echarts` and `echarts-for-react` for raid stats charts
- AnimeJS v4 for lightweight UI animation
- Sonner for toasts
- Google Fonts: Nunito Sans body, Nunito via `font-serif`, JetBrains Mono mono
- Dark mode defaults to dark unless `localStorage.theme` is `"light"`

## Commands

- Install app dependencies: `npm install`
- Run local dev server: `npm run dev`
- Build app: `npm run build`
- Lint app: `npm run lint`
- Preview app build: `npm run preview`
- Build functions: `cd functions` then `npm run build`
- Deploy: `npm run build && firebase deploy`

Use real Firebase credentials in `.env` before deploying or testing real Firebase mode. Firebase Hosting serves `dist`, rewrites all app routes to `index.html`, and sets `index.html` to no-cache.

## App Entry And Shell

- `src/main.tsx` is the active entry point. It mounts `RouterProvider` and imports `src/index.css`.
- `src/App.tsx` and `src/App.css` are leftover Vite demo files and are not used by the current app entry.
- `src/components/layouts/RootLayout.tsx` is the app shell. It wraps content in `SidebarProvider`, renders `AppSidebar`, a small top banner, `Outlet`, `Toaster`, and footer.
- `src/components/layouts/AppSidebar.tsx` owns global navigation and the dark mode toggle.
- Add global nav links in `AppSidebar`, not `RootLayout`.

## Current Routes

Routes are manually registered in `src/app/router.tsx`.

- `/`: `HomePage`
- `/members`: `MembersPage`
- `/members/$lodestoneId`: `MemberProfilePage`
- `/fc-collection`: `FCCollectionPage`
- `/fc-collection/$type`: `CollectiblePage`
- `/fc-collection/leaderboard`: `LeaderboardPage`
- `/mount-roulette`: `MountRoulettePage`
- `/raid-stats`: `RaidStatsPage`
- `/jointhemeowfia`: `RecruitmentPage`
- `/pastevents`: `PastEventsPage`
- `/pastevents/easter2026`: `Easter2026Page`
- `/admin`: `AdminPage`

When adding a page, create `src/features/<name>/index.tsx`, register it in `src/app/router.tsx`, and add a sidebar item only if it belongs in global navigation.

## File Structure

```text
src/
  app/router.tsx
  assets/
    carousel/              Recruitment carousel images.
    easter26/              Easter event side art.
    fatcat/                Fat cat expressions and icons.
    hidenseek/             Hide-and-seek instruction images.
    jobs/                  FFXIV job icons.
  components/
    layouts/               RootLayout and AppSidebar.
    ui/                    shadcn-style primitives. Reuse before inventing.
  features/
    admin/                 Admin login, event participants, members, refresh triggers.
    easter2026/            Archived Easter event page and live scoreboard.
    fc-collection/         Collection dashboard, collectible pages, leaderboard.
    home/                  Home page sections.
    member-profile/        Member detail page.
    members/               Member directory.
    mount-roulette/        Mount farming roulette.
    pastevents/            Archived events list.
    raid-stats/            FFLogs-derived stats dashboards.
    recruitment/           Recruitment page.
  hooks/                   Shared hooks: dark mode, members, mobile.
  lib/
    db.ts                  Database abstraction. Import RTDB helpers from here.
    db.stub.ts             In-memory Realtime Database stub.
    firebase.ts            Firebase app init, disabled in stub mode.
    utils.ts               `cn()` helper.
  types/index.ts           Shared base types for members and Easter scores.

functions/
  src/index.ts             Function exports.
  src/refresh-fflogs.ts    FFLogs refresh into `/raidStats` and member FFLogs IDs.
  src/refresh-fc-collection.ts
  src/scrape-lodestone.ts
  src/zones.ts             Raid zone config.
```

## Coding Conventions

- No em dashes in new code, comments, strings, or docs.
- Avoid comments unless the reason is non-obvious: hidden constraint, subtle invariant, or workaround for a specific bug.
- Avoid premature abstraction. Prefer local, direct code until a helper removes real complexity.
- Do not add unrelated cleanup or features while fixing a bug.
- For complex implementations, update the relevant documentation in `docs/` as part of the change. If the work touches an existing documented domain, read the matching implementation doc first and use it as the reference for data shape, refresh behavior, cache keys, and verification.
- Validate at system boundaries: user input, external APIs, Firebase, callable functions.
- Prefer editing existing files over creating new files.
- Use Tailwind classes for styling. Do not add CSS modules. Avoid inline styles except for computed visual transforms or canvas-adjacent positioning already used in the app.
- Use `@/` imports for cross-feature imports. Relative imports inside a feature are fine.
- Use shadcn UI components from `src/components/ui/` and Lucide icons for controls when available.
- Keep route paths, DB paths, localStorage keys, and cache invalidation behavior explicit.

## Frontend Taste

- Build the real app surface first. Do not replace app pages with marketing landing pages unless asked.
- Match the FC tone: playful, FFXIV-specific, polished, and practical.
- Use compact operational layouts for dashboards and admin tools.
- Avoid nested cards and page sections styled as floating cards.
- Cards can be used for repeated items, dialogs, and framed tools.
- Keep cards at the existing radius scale, usually `rounded-lg` or smaller.
- Avoid decorative gradient orbs, bokeh blobs, and one-note palettes.
- Keep text fitting in buttons, cards, sidebar items, and responsive grids.
- Use stable dimensions for boards, grids, charts, toolbars, counters, and roulette controls to avoid layout shift.
- Preserve dark mode support on every new surface.

## Data Access Rules

- Always import Realtime Database helpers from `src/lib/db.ts`.
- Do not import from `firebase/database` in feature code.
- `src/lib/db.ts` switches between real Firebase and `db.stub.ts` based on `VITE_USE_STUBS`.
- Direct Firebase app access is only needed for callable Functions. Existing pattern: import `firebaseApp` from `src/lib/firebase`, guard when null, then dynamically import `firebase/functions`.
- Treat `.env` as secret and gitignored. Never commit Firebase credentials.

## Firebase Cost And Read Rules

The project is on Blaze, but design for free-tier headroom.

- Prefer `get` reads plus local React state or localStorage cache.
- Use `onValue` only where live updates are core: admin active management and Easter scoreboard.
- Avoid polling.
- Keep RTDB payloads small. Do not store derived data that can be computed client-side unless it avoids a larger external API or function cost.
- Batch multi-path updates in Functions when refreshing large data sets.
- When proposing or implementing a Firebase feature, call out read, write, download, and function invocation impact.
- Existing client caches mostly use 3-hour TTLs. Preserve or invalidate matching keys when changing data writes.

Known cache keys:

- `fcc_members_v3`: shared member list, 3-hour TTL.
- `fcc_collection_v2`: FC collection aggregate, 3-hour TTL.
- `fcc_raidstats_v2_<zoneId>`: raid stats per zone, 3-hour TTL.
- `fcc_collectibles_v1`: member profile collectible lookup, 24-hour TTL.
- `theme`: dark mode preference.
- `admin_authed`: session-only admin auth flag.

## Database Shape And Ownership

Important RTDB paths:

- `/members/{lodestoneId}`: canonical member records keyed by Lodestone ID. Fields include `name`, `server`, `fflogsId`, `avatarUrl`, and `fcRank`.
- `/memberProfiles/{lodestoneId}`: editable profile fields: `bio`, `birthday` as `MM-DD`, and `mainJobs`.
- `/fcCollection/collectibles/{mounts|minions|titles|achievements}`: FFXIV Collect item data keyed by item ID.
- `/fcCollection/collectibles/lastFetched`: collection refresh timestamp.
- `/fcCollection/memberData/{lodestoneId}`: avatar, owned collectible IDs, previous counts, and `lastFetched`.
- `/raidStats/lastUpdated`: global FFLogs refresh timestamp.
- `/raidStats/zones/{zoneId}`: zone meta, parses keyed by Lodestone ID, histograms, recent kill, first kills.
- `/events/easter2026/participants/{participantId}`: archived Easter event scores and totals.

Ownership boundaries:

- Lodestone sync writes member names and avatar URLs.
- FFLogs refresh writes member `name`, `server`, `fflogsId`, raid stats, and removes stale FFLogs-linked members. It should not clobber `avatarUrl`.
- FC collection refresh writes collectibles and member collection data.
- Admin UI can edit Easter participants, member profiles, `fcRank`, and manual member entries.
- Manual member adds may be overwritten by the next Lodestone or FFLogs sync.

`database.rules.json` currently allows public reads and selected public writes for members, memberProfiles, and Easter participants. Treat that as a current implementation detail, not a security model to expand casually.

## Firebase Functions

Functions are exported from `functions/src/index.ts`.

- `refreshFFLogs`: scheduled every 3 hours, uses `FFLOGS_CLIENT_ID` and `FFLOGS_CLIENT_SECRET`.
- `triggerFFLogsRefresh`: callable admin refresh.
- `importLodestoneMembers`: callable Lodestone roster and portrait sync.
- `refreshFCCollection`: scheduled every 3 hours.
- `triggerFCCollectionRefresh`: callable admin refresh.

Function code uses `firebase-admin` and direct Admin SDK RTDB writes. App feature code should still use `src/lib/db.ts`.

## Feature Notes

- Members: `useMembers` reads `/members`, caches it, and `MembersPage` groups by rank order: Boss, Underpaw, Housecat, Stray, Friend.
- Member profiles: read member identity, profile, collection data, collectible names, and zone 73 parse data.
- FC collection: supports mounts, minions, titles, achievements. Config lives in `collectibleConfig.ts`; achievement filters are duplicated in the function refresh config and must stay aligned.
- Mount roulette: consumes FC collection mount data, filters by expansion, source, ownership, and selected members.
- Raid stats: `ZONE_TABS`, `DEFAULT_ZONE_ID`, and zone metadata live under `src/features/raid-stats`. Visual components expect parse entries keyed by Lodestone ID.
- Easter 2026: scoreboard listens live to `/events/easter2026/participants`; admin participant manager writes scores and totals.
- Admin auth: `useAdminAuth` is a simple sessionStorage password gate, not Firebase Auth.

## Assets

- Prefer existing assets in `src/assets` before adding new ones.
- Use `import.meta.glob(..., { eager: true, import: "default" })` for dynamic asset collections, as used by carousel, hide-and-seek images, and job icons.
- Job icons are used in raid stats, member profiles, and admin profile editing. Keep job name to slug maps aligned if adding jobs.

## Animation Patterns

Import AnimeJS v4 like this:

```tsx
import { animate, stagger } from "animejs";
```

Use mount-time stagger animations from a `ref` for page sections, cards, member grids, and skeletons.

```tsx
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!ref.current) return;

  animate(ref.current.querySelectorAll(".anim-section"), {
    opacity: [0, 1],
    translateY: [16, 0],
    delay: stagger(80),
    duration: 350,
    easing: "easeOutQuad",
  });
}, []);
```

For loading states, prefer skeleton blocks with `animate-pulse` and a `.sk` class only on elements that should individually cascade.

For table or list refreshes, animate only visible rows and cap long lists to avoid sluggish dashboards.

For progress bars or visual meters, keep JSX at the base value and animate the changed property.

## Testing And Verification

- For doc-only changes, no build is required.
- For TypeScript or route changes, run `npm run build`.
- For lint-sensitive changes, run `npm run lint`.
- For functions changes, run `cd functions` then `npm run build`.
- When changing UI layout, run the dev server and inspect mobile and desktop states if feasible.
- When changing Firebase data paths, test with `VITE_USE_STUBS=true` first unless the real backend is specifically required.
