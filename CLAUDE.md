# Fat Cat Cartel: Claude Instructions

## Project overview
Website for the FFXIV Free Company "Fat Cat Cartel" (The Meowfia). Hosts FC event pages (e.g. Easter 2026 social with live scoreboard), an admin panel for managing scores, and a home page.

Live data comes from Firebase Realtime Database. Local dev uses an in-memory stub; no credentials required.

---

## Tech stack
- **React 19 + TypeScript**, Vite 8
- **Tailwind CSS v4** via `@tailwindcss/vite`: `@theme inline` + oklch color tokens in `src/index.css`
- **TanStack Router**: code-based routing, no file-based routing
- **Firebase Realtime Database v12**
- **shadcn/ui pattern**: Radix UI primitives + CVA + tailwind-merge, components live in `src/components/ui/`
- **Lucide React** for icons, **Embla Carousel** for carousels
- **Google Fonts**: Nunito Sans (body), Nunito (`font-serif` headings), JetBrains Mono (mono)
- **Dark mode**: `.dark` class on `<html>`, persisted in `localStorage` via `useDarkMode` hook

---

## File structure

```
src/
├── app/
│   └── router.tsx            # All route definitions; add new routes here
├── assets/                   # Static images organised by feature (carousel/, easter26/, hidenseek/)
├── components/
│   ├── layouts/
│   │   └── RootLayout.tsx    # App shell: nav, dark mode toggle, footer
│   └── ui/                   # shadcn components; do not edit directly
├── features/                 # One folder per page / feature
│   ├── home/
│   │   ├── components/       # Components private to this feature
│   │   └── index.tsx         # Page component exported and imported by router
│   ├── easter2026/
│   │   ├── api/              # Data-fetching hooks (useScoreboard.ts)
│   │   ├── components/
│   │   └── index.tsx
│   └── admin/
│       ├── components/
│       ├── hooks/            # Feature-scoped hooks (useAdminAuth.ts)
│       └── index.tsx
├── hooks/                    # Global reusable hooks (useDarkMode.ts)
├── lib/
│   ├── db.ts                 # DB abstraction; always import from here
│   ├── db.stub.ts            # In-memory stub for local dev
│   ├── firebase.ts           # Firebase app init (skipped when VITE_USE_STUBS=true)
│   └── utils.ts              # cn() helper
└── types/
    └── index.ts              # Shared types: Participant, Scores, ScoreCategory
```

---

## Coding conventions
- **No em dashes** in code, comments, or strings; use a colon, comma, semicolon, or period instead
- **No comments** unless the WHY is non-obvious: a hidden constraint, subtle invariant, or workaround for a specific bug
- **No premature abstraction**: three similar lines beat an early helper
- **No error handling for impossible cases**: trust internal guarantees; only validate at system boundaries (user input, external APIs)
- **No extra features**: don't add things beyond what's asked; no cleanup or refactors alongside a bug fix
- **Tailwind only** for styling: no CSS modules, no inline styles
- **shadcn components** from `src/components/ui/`: don't reinvent what's already there
- Use **relative imports within a feature**, `@/` alias for cross-feature imports
- Prefer editing existing files over creating new ones

---

## Adding a new page / feature
1. Create `src/features/<name>/index.tsx` (the page component)
2. Add sub-folders `components/`, `api/`, `hooks/` as needed
3. Register the route in `src/app/router.tsx`:
   - `createRoute({ getParentRoute: () => rootRoute, path: '/<name>', component: <Page> })`
   - Add to `routeTree`
4. Add a `<Link>` in `src/components/layouts/RootLayout.tsx`
5. Drop static assets in `src/assets/<name>/`

---

## Firebase cost sensitivity
The project is on the Blaze plan but usage must stay within free-tier limits. **Always optimise for minimal reads, writes, downloads, and function invocations.**

- Prefer `once` / `get` reads over persistent `onValue` listeners unless real-time sync is genuinely needed
- Cache data in React state or `localStorage` rather than re-fetching on every render or navigation
- Avoid polling; use listeners only where live updates are a core feature (e.g. the scoreboard)
- Keep Realtime Database payloads small: never store redundant or derived data that can be computed client-side
- Avoid triggering Cloud Functions unnecessarily; batch writes where possible
- Static assets (images, fonts) go through Firebase Hosting CDN; no extra cost concern there
- When suggesting new features that touch Firebase, flag the read/write/function cost implications

Current free-tier headroom (as of 2026-05-07): Realtime DB storage 0.3% used, downloads 0.8% used; Functions invocations 0% used; Hosting storage 4.1% used.

---

## Database / Firebase pattern
- **Always** import db functions from `src/lib/db.ts`: never directly from `firebase/database`
- `.env` controls the mode: `VITE_USE_STUBS=true` (stub) or `false` (real Firebase)
- The stub ships with seeded test participants; real DB uses Firebase Realtime Database
- Firebase config lives in `.env` (gitignored); never commit credentials

---

## Deployment
```bash
npm run build && firebase deploy
```
`.env` must have real Firebase credentials before building. Firebase Hosting config is in `firebase.json`.

---

## Animation patterns (animejs v4)

Import from `animejs`: `import { animate, stagger } from "animejs";`

### Page / section entrance
Stagger top-level sections or hero blocks in on mount. Add a shared class to the elements, query them from a ref, run once in `useEffect([], [])`.
```tsx
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  if (!ref.current) return;
  animate(ref.current.querySelectorAll(".anim-section"), {
    opacity: [0, 1], translateY: [20, 0],
    delay: stagger(100), duration: 450, easing: "easeOutQuart",
  });
}, []);
```
Typical class names: `.anim-section` (page sections), `.hero-item` (hero blocks), `.about-card` / `.collectible-card` / `.perk-card` (card grids).

### Card / list stagger
Same pattern with tighter timing for grids of cards or list items:
```tsx
animate(ref.current.querySelectorAll(".card"), {
  opacity: [0, 1], translateY: [16, 0],
  delay: stagger(80), duration: 350, easing: "easeOutQuad",
});
```
For list items sliding in from the side: `translateX: [-10, 0]`.

### Table row stagger on data/filter change
Fire on the dependency that changes the rows. Cap at 80 rows so long lists don't drag.
```tsx
useEffect(() => {
  const rows = Array.from(tableBodyRef.current.querySelectorAll(".data-row")).slice(0, 80);
  animate(rows, { opacity: [0, 1], translateY: [5, 0], delay: stagger(6), duration: 160, easing: "easeOutQuad" });
}, [filteredData]);
```

### Progress bar (width)
Keep bar width at `0%` in JSX; drive it via animate on mount or value change:
```tsx
animate(barRef.current, { width: `${pct}%`, duration: 600, easing: "easeOutQuart" });
```

### Count / label crossfade
```tsx
useEffect(() => {
  animate(labelRef.current, { opacity: [0, 1], duration: 200, easing: "easeOutQuad" });
}, [value]);
```

### Filter button micro-feedback
```tsx
function animateFilterClick(target: HTMLElement) {
  animate(target, { scale: [0.93, 1], duration: 200, easing: "easeOutCubic" });
}
// Usage: onClick={(e) => { animateFilterClick(e.currentTarget); setState(val); }}
```

### Loading skeleton
Replace plain loading text with stagger-in skeleton rows:
```tsx
function LoadingSkeleton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    animate(ref.current.querySelectorAll(".sk"), {
      opacity: [0, 1], translateY: [8, 0],
      delay: stagger(35), duration: 260, easing: "easeOutQuad",
    });
  }, []);
  return <div ref={ref}>...</div>;
}
```
Use `animate-pulse` on skeleton divs for the shimmer. Add `.sk` only to the elements that should individually cascade; don't nest `.sk` inside `.sk`.

---

## Key architectural notes
- Layout container is `max-w-screen-2xl` in `RootLayout`: needed to fit 3-column Easter layout with side images
- Side decorative images use a 3-column flex with `sticky bottom-0 self-end`, not fixed positioning
- Dynamic asset arrays use `import.meta.glob` with `eager: true` (carousel images, hide & seek instruction images)
- Dark mode flash prevention: inline `<script>` in `index.html` sets `.dark` on `<html>` before React mounts
