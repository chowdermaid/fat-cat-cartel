# Fat Cat Cartel — Claude Instructions

## Project overview
Website for the FFXIV Free Company "Fat Cat Cartel" (The Meowfia). Hosts FC event pages (e.g. Easter 2026 social with live scoreboard), an admin panel for managing scores, and a home page.

Live data comes from Firebase Realtime Database. Local dev uses an in-memory stub — no credentials required.

---

## Tech stack
- **React 19 + TypeScript**, Vite 8
- **Tailwind CSS v4** via `@tailwindcss/vite` — `@theme inline` + oklch color tokens in `src/index.css`
- **TanStack Router** — code-based routing, no file-based routing
- **Firebase Realtime Database v12**
- **shadcn/ui pattern** — Radix UI primitives + CVA + tailwind-merge, components live in `src/components/ui/`
- **Lucide React** for icons, **Embla Carousel** for carousels
- **Google Fonts**: Nunito Sans (body), Nunito (`font-serif` headings), JetBrains Mono (mono)
- **Dark mode**: `.dark` class on `<html>`, persisted in `localStorage` via `useDarkMode` hook

---

## File structure

```
src/
├── app/
│   └── router.tsx            # All route definitions — add new routes here
├── assets/                   # Static images organised by feature (carousel/, easter26/, hidenseek/)
├── components/
│   ├── layouts/
│   │   └── RootLayout.tsx    # App shell: nav, dark mode toggle, footer
│   └── ui/                   # shadcn components — do not edit directly
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
│   ├── db.ts                 # DB abstraction — always import from here
│   ├── db.stub.ts            # In-memory stub for local dev
│   ├── firebase.ts           # Firebase app init (skipped when VITE_USE_STUBS=true)
│   └── utils.ts              # cn() helper
└── types/
    └── index.ts              # Shared types: Participant, Scores, ScoreCategory
```

---

## Coding conventions
- **No comments** unless the WHY is non-obvious — a hidden constraint, subtle invariant, or workaround for a specific bug
- **No premature abstraction** — three similar lines beat an early helper
- **No error handling for impossible cases** — trust internal guarantees; only validate at system boundaries (user input, external APIs)
- **No extra features** — don't add things beyond what's asked; no cleanup or refactors alongside a bug fix
- **Tailwind only** for styling — no CSS modules, no inline styles
- **shadcn components** from `src/components/ui/` — don't reinvent what's already there
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

## Database / Firebase pattern
- **Always** import db functions from `src/lib/db.ts` — never directly from `firebase/database`
- `.env` controls the mode: `VITE_USE_STUBS=true` (stub) or `false` (real Firebase)
- The stub ships with seeded test participants; real DB uses Firebase Realtime Database
- Firebase config lives in `.env` (gitignored) — never commit credentials

---

## Deployment
```bash
npm run build && firebase deploy
```
`.env` must have real Firebase credentials before building. Firebase Hosting config is in `firebase.json`.

---

## Key architectural notes
- Layout container is `max-w-screen-2xl` in `RootLayout` — needed to fit 3-column Easter layout with side images
- Side decorative images use a 3-column flex with `sticky bottom-0 self-end`, not fixed positioning
- Dynamic asset arrays use `import.meta.glob` with `eager: true` (carousel images, hide & seek instruction images)
- Dark mode flash prevention: inline `<script>` in `index.html` sets `.dark` on `<html>` before React mounts
