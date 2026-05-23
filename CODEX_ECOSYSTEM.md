# Codex Ecosystem Recommendations

This file is optional project guidance. Keep durable, always-needed rules in `AGENTS.md`; keep repeatable workflows, domain references, and optional tooling here or in skills.

## Current Local Setup

- Project-level always-on instructions: `AGENTS.md`
- Local Codex config: `C:\Users\DARWI\.codex\config.toml`
- Current model setting: `gpt-5.5`, medium reasoning effort
- Project trust: `c:\projects\fat-cat-cartel` is trusted
- Built-in skills available: `imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`
- Extra discovered skill: `find-skills` under `C:\Users\DARWI\.agents\skills`

## Recommended Layers

1. `AGENTS.md`: small, always-on project constitution.
2. Repo skills: task-specific workflows that should travel with this project.
3. Personal global skills: workflows you want across projects.
4. MCP or plugins: only for external systems that need real tool access, such as GitHub, Firebase, issue trackers, docs, or design tools.
5. Subagents: use for independent review passes, test investigation, accessibility checks, or larger refactors where parallel judgment helps.

## Skills Worth Adding For This Repo

### `fat-cat-feature-builder`

Use for adding event pages, admin tools, scoreboard views, or FC-facing experiences.

Include:

- Route registration pattern for `src/app/router.tsx`
- Feature folder conventions
- Navigation update rules for `RootLayout`
- Asset placement rules
- Firebase cost checklist
- UI and animation expectations

### `firebase-rt-db-cost-guardian`

Use before changing reads, writes, listeners, Cloud Functions, or data shape.

Include:

- When `onValue` is allowed
- Preferred `get` and cache patterns
- Batch write examples
- Payload size rules
- A cost-risk checklist for proposed features
- Current database paths and security rule expectations, when stable

### `fat-cat-admin-workflows`

Use for admin panel changes.

Include:

- Auth assumptions from `src/features/admin/hooks/useAdminAuth.ts`
- Member and score management flows
- Validation boundaries
- Toast and error-state patterns
- Expected behavior when using stubs versus real Firebase

### `ffxiv-event-design`

Use for visual/event work, themed pages, carousels, instruction pages, and minigame-like event UX.

Include:

- Existing event page examples
- Visual tone: playful FC event polish without marketing-page bloat
- Asset sourcing rules
- Animation patterns
- Accessibility and mobile checks

### `react-vite-quality-pass`

Use before finishing non-trivial UI work.

Include:

- `npm run build`
- `npm run lint`
- Optional Playwright visual smoke test workflow if you add Playwright
- Checklist for responsive layout, text fit, dark mode, and Firebase stub mode

## External Skills To Consider

The public skills ecosystem changes quickly, so verify install counts and current package names before installing. As of a quick check on 2026-05-23, skills.sh lists relevant popular areas including React, Tailwind/design-system, TypeScript advanced types, and Playwright best practices.

Good searches:

```bash
npx skills find react
npx skills find tailwind design system
npx skills find typescript
npx skills find playwright
npx skills find firebase
```

Prefer skills from reputable sources with strong install counts and clear source repositories. Avoid installing random low-install skills into global scope until they have been inspected.

## What To Add So Codex Knows Requirements Better

Add these as small reference files or skill references, not all inside `AGENTS.md`:

- Product brief: who uses the site, what the FC cares about, and the tone to preserve.
- Event playbook: how each FC event page is structured, launched, maintained, and retired.
- Firebase schema: stable database paths, object shapes, ownership, and security expectations.
- Admin behavior spec: member lifecycle, scoring rules, permissions, and failure states.
- Design reference: screenshots of good pages, unacceptable patterns, palette notes, and mobile expectations.
- Deployment checklist: env var requirements, build/deploy steps, rollback notes, and production smoke checks.
- Cost budget: updated Firebase free-tier usage snapshots and thresholds that should trigger caution.

## Suggested Next Step

Create the repo skills above only after one or two more real tasks. `AGENTS.md` is enough for normal work now; skills become valuable once a workflow repeats or has fragile project-specific steps.

