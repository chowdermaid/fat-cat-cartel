# Fat Cat Cartel: Codex Instructions

You are working on Fat Cat Cartel, a React and Firebase FFXIV Free Company website.

## Default Rules

- Make the smallest safe change.
- Read only files needed for the task.
- Prefer existing patterns, feature structure, and UI primitives.
- Use `@/` imports for cross-feature imports.
- Import Realtime Database helpers only from `src/lib/db.ts`.
- Use Tailwind and existing shadcn UI components for UI work.
- Do not refactor unrelated code.
- Do not add abstractions unless they remove real complexity.
- Do not touch `.env` or secrets.
- Do not expand Firebase reads, writes, downloads, or Function calls without noting cost impact.
- Do not use live listeners unless realtime behavior is core to the feature.
- After code changes, run the smallest relevant check.

## Work Discipline

- Surface assumptions and ask only when repo inspection cannot resolve ambiguity.
- Prefer the smallest working implementation; do not add speculative flexibility.
- Keep diffs surgical. Mention unrelated cleanup opportunities instead of doing them.
- Before editing, know the success criteria and the smallest relevant verification.

## Feature Structure

For new feature folders, and for large feature refactors, prefer the current `src/features/meowket-board` shape:

- `index.tsx`: thin route/page export only.
- `types.ts`: feature-owned API, UI, and state types.
- `constants.ts`: stable feature constants.
- `api/`: callable wrappers, fetchers, stubs, and API-local mapping.
- `hooks/`: stateful orchestration and reusable feature behavior.
- `utils/`: pure formatting, math, merging, display, parsing, and sorting helpers.
- `components/`: page shell plus UI grouped by domain subfolder.

Keep imports explicit. Avoid barrel files except the feature `index.tsx`. Move pure helpers before hooks, then leaf components, larger components, and finally the page shell. Do not change route paths, props, auth, Firebase paths, cache keys, or API behavior during structure-only refactors.

## Lazy Docs

Read docs only when the task touches that area:

- Project map, routes, commands, assets, animation, verification: `docs/project-reference.md`
- Firebase data shape, ownership, cost, cache keys, Functions: `docs/firebase-data-and-costs.md`
- UI style and frontend conventions: `docs/frontend-patterns.md`
- Admin auth, Discord OAuth, sessions, protected callables: `docs/admin-auth-implementation.md`
- FC collection, FFXIV Collect, mount roulette collection data: `docs/fc-collection-implementation.md`
- Raid stats, FFLogs, Tomestone, member activity: `docs/raid-stats-implementation.md`
- Calendar events and Raid Helper imports: `docs/calendar-events-implementation.md`
- Database cleanup or live RTDB branch review: `docs/database-cleanup-inventory.md`

## Always-Known Facts

- React 19, TypeScript, Vite, Tailwind v4, TanStack Router.
- Firebase RTDB plus Firebase Functions.
- Stub mode: `VITE_USE_STUBS=true`.
- Main routes: `src/app/router.tsx`.
- App shell: `src/components/layouts`.
- Feature pages: `src/features`.
- Functions code: `functions/src`.
