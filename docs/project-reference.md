# Project Reference

Fat Cat Cartel is the website for the FFXIV Free Company "Fat Cat Cartel" and "The Meowfia". The app includes the FC home page, recruitment, member directory and profiles, FC collection tracking, mount roulette, raid stats, archived event pages, calendar, and admin panel.

Frontend reads live data from Firebase Realtime Database. Local development can run against the in-memory stub with `VITE_USE_STUBS=true`, which avoids Firebase credentials for ordinary UI work. Firebase Functions refresh FFLogs, FFXIV Collect, Tomestone, Raid Helper, Discord, and Lodestone data.

## Tech Stack

- React 19 and TypeScript, Vite 8.
- Tailwind CSS v4 via `@tailwindcss/vite`.
- TanStack Router with code-based routes in `src/app/router.tsx`.
- Firebase Realtime Database v12 for app data.
- Firebase Functions v2, Node 22, TypeScript under `functions/`.
- shadcn pattern: Radix UI primitives, CVA, and tailwind-merge in `src/components/ui/`.
- Lucide React for icons.
- Embla Carousel for carousel UI.
- ECharts through `echarts` and `echarts-for-react` for raid stats charts.
- AnimeJS v4 for lightweight UI animation.
- Sonner for toasts.
- Google Fonts: Nunito Sans body, Nunito through `font-serif`, JetBrains Mono mono.
- Dark mode defaults to dark unless `localStorage.theme` is `"light"`.

## Commands

- Install app dependencies: `npm install`.
- Run local dev server: `npm run dev`.
- Build app: `npm run build`.
- Lint app: `npm run lint`.
- Preview app build: `npm run preview`.
- Build functions: `cd functions` then `npm run build`.
- Deploy: `npm run build && firebase deploy`.

Use real Firebase credentials in `.env` before deploying or testing real Firebase mode. Firebase Hosting serves `dist`, rewrites all app routes to `index.html`, and sets `index.html` to no-cache.

## App Entry And Shell

- `src/main.tsx` is the active entry point. It mounts `RouterProvider` and imports `src/index.css`.
- `src/App.tsx` and `src/App.css` are leftover Vite demo files and are not used by the current app entry.
- `src/components/layouts/RootLayout.tsx` is the app shell. It wraps content in `SidebarProvider`, renders `AppSidebar`, a small top banner, `Outlet`, `Toaster`, and footer.
- `src/components/layouts/AppSidebar.tsx` owns global navigation and the dark mode toggle.
- Add global nav links in `AppSidebar`, not `RootLayout`.

## Routes

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
    ui/                    shadcn-style primitives.
  features/
    admin/
    easter2026/
    fc-collection/
    home/
    member-profile/
    members/
    mount-roulette/
    pastevents/
    raid-stats/
    recruitment/
  hooks/
  lib/
    db.ts                  Database abstraction.
    db.stub.ts             In-memory RTDB stub.
    firebase.ts            Firebase app init, disabled in stub mode.
    utils.ts               `cn()` helper.
  types/index.ts

functions/
  src/index.ts             Function exports.
  src/refresh-fflogs.ts
  src/refresh-fc-collection.ts
  src/scrape-lodestone.ts
  src/zones.ts
```

## Coding Conventions

- No em dashes in new code, comments, strings, or docs.
- Avoid comments unless the reason is non-obvious.
- Avoid premature abstraction. Prefer local, direct code until a helper removes real complexity.
- Do not add unrelated cleanup or features while fixing a bug.
- For complex work, update the relevant doc in `docs/`.
- If work touches an existing documented domain, read that implementation doc first.
- Validate at system boundaries: user input, external APIs, Firebase, callable Functions.
- Prefer editing existing files over creating new files.
- Keep route paths, DB paths, localStorage keys, and cache invalidation behavior explicit.

## Assets

- Prefer existing assets in `src/assets` before adding new ones.
- Use `import.meta.glob(..., { eager: true, import: "default" })` for dynamic asset collections, as used by carousel, hide-and-seek images, and job icons.
- Job icons are used in raid stats, member profiles, and admin profile editing. Keep job name to slug maps aligned if adding jobs.

## Animation Pattern

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

## Verification

- Doc-only changes need no build.
- TypeScript or route changes: `npm run build`.
- Lint-sensitive changes: `npm run lint`.
- Functions changes: `cd functions` then `npm run build`.
- UI layout changes: run the dev server and inspect mobile and desktop states if feasible.
- Firebase data path changes: test with `VITE_USE_STUBS=true` first unless real backend or emulator behavior is required.
