# Prompt Playbook

Use these prompts when asking Codex to work in this repo. Paste one, fill the brackets, and add any files or screenshots that matter.

## New Feature

```text
Task: Add [feature].

User goal:
- [What should the user be able to do?]

Scope:
- Touch likely area: [route/component/function/docs].
- Use existing project patterns.
- Read docs only if they match the touched area.
- Keep Firebase read/write/download and Function cost low. Call out any cost impact.

Acceptance:
- [Expected behavior]
- [Empty/loading/error states]
- [Mobile/desktop needs if UI]

Verification:
- Run the smallest relevant check.
- For UI layout, run local app and inspect if feasible.
```

## Improve Existing Component

```text
Task: Improve [component/page] in [file/path].

Problem:
- [What feels bad, slow, confusing, ugly, or incomplete?]

Keep:
- [Behavior/design/data that must stay]

Change:
- [Specific improvements wanted]

Constraints:
- Match existing UI patterns.
- Avoid unrelated refactors.
- Preserve dark mode and responsive layout.
- Keep Firebase behavior unchanged unless explicitly needed.

Verification:
- Run the smallest relevant check.
- Inspect affected viewport states if layout changed.
```

## Refactor Existing Code

```text
Task: Refactor [file/component/module].

Goal:
- [Why refactor? readability, duplication, bug risk, testability, performance]

Before editing:
- Inspect current exports, imports, route usage, and nearby docs.
- Summarize the files that matter and the behavior that must be preserved.
- Propose a phased extraction order if the file is large.

Rules:
- Keep behavior identical unless listed below.
- Do not change routes, DB paths, cache keys, or public props unless needed.
- Do not change API, auth, or Firebase behavior unless listed below.
- Prefer local helpers over broad abstractions.
- Avoid unrelated cleanup.
- Keep stateful behavior in hooks only when it makes the page/component thinner.
- Update structure docs if this feature has docs that name files or ownership.

Allowed behavior changes:
- [None, or list exact changes]

Verification:
- Run build or targeted check after the refactor, or after each large extraction.
- Summarize behavior preserved and risk areas.
```

## Refactor Feature To Standard Structure

```text
Task: Refactor [feature folder] to the standard feature structure.

Goal:
- Make the route entry thin and group code by responsibility, like `src/features/meowket-board`.
- Preserve behavior exactly unless listed below.

Before editing:
- Inspect current feature files, route imports, public exports, API calls, hooks, utils, docs, and tests.
- Identify current behavior that must not change.
- Summarize the target file tree before moving code.

Target structure:
- `index.tsx`: thin route/page export only.
- `types.ts`: feature-owned API, UI, and state types.
- `constants.ts`: stable feature constants.
- `api/`: callable wrappers, fetchers, stubs, and API-local mapping.
- `hooks/`: stateful orchestration and reusable feature behavior.
- `utils/`: pure formatting, math, merging, display, parsing, and sorting helpers.
- `components/`: page shell plus UI grouped by domain subfolder.

Rules:
- Keep route path, public exports, props, Firebase paths, cache keys, auth checks, and API behavior unchanged unless explicitly allowed.
- Move pure helpers before stateful hooks, then leaf components, then larger components, then page shell.
- Do not create broad shared abstractions unless another feature already uses the same pattern.
- Avoid barrel files except the feature `index.tsx`.
- Keep imports explicit and prefer `@/` for cross-feature imports.
- Update feature docs if they name files, ownership, auth, API behavior, or structure.

Allowed behavior changes:
- [None, or list exact changes]

Verification:
- Run `npm run build`.
- If Functions changed, also run `cd functions && npm run build`.
- Summarize preserved behavior, new structure, and any risk areas.
```

## Bug Report

```text
Bug: [short title].

Observed:
- [What happens now?]

Expected:
- [What should happen?]

Repro:
1. [Step]
2. [Step]
3. [Step]

Context:
- Route/page: [path]
- Files likely involved: [optional]
- Console/network error: [paste exact error if any]
- Stub, emulator, or real Firebase: [which mode]

Do:
- Find root cause.
- Make smallest safe fix.
- Add or update focused tests only if useful.
- Run smallest relevant check.
```

## Something Does Not Work

```text
Something does not work: [short description].

What I tried:
- [Command/click/action]

What happened:
- [Output/error/UI result]

What I expected:
- [Expected output/UI result]

Environment:
- [dev server/build/emulator/stub/production]
- [browser or terminal if relevant]

Do:
- Investigate before changing code.
- Explain likely cause briefly.
- Fix if local code issue.
- If blocked by config, missing secrets, or external service, tell me exact next step.
```

## Firebase Or Data Change

```text
Task: Change Firebase/data behavior for [feature].

Data paths:
- [Known paths, or ask Codex to identify them]

Rules:
- Read `docs/firebase-data-and-costs.md`.
- Read any matching feature doc.
- Import RTDB helpers only from `src/lib/db.ts` in frontend code.
- Prefer cached `get` reads.
- Avoid new live listeners unless realtime is core.
- Explain read/write/download/Function invocation cost impact.
- Preserve or invalidate affected localStorage cache keys.

Verification:
- Prefer stub mode first when useful.
- Use emulator mode for rules, Functions, or production-shaped data.
- Run app and/or Functions build as relevant.
```

## UI Layout Change

```text
Task: Update UI for [page/component].

Goal:
- [What should feel better or become possible?]

Design constraints:
- Read `docs/frontend-patterns.md`.
- Use Tailwind and existing shadcn components.
- Use Lucide icons where useful.
- Preserve dark mode.
- Avoid nested cards, decorative blobs, and one-note palettes.
- Keep text fitting on mobile and desktop.

Verification:
- Run dev server if feasible.
- Inspect mobile and desktop states.
- Run build if TypeScript changed.
```

## Admin Or Auth Change

```text
Task: Change admin/auth behavior for [area].

Rules:
- Read `docs/admin-auth-implementation.md`.
- Browser must not decide authorization by itself.
- Protected mutations must use callable Functions and server-side session checks.
- Do not touch secrets or `.env`.
- Call out security and Firebase cost impact.

Verification:
- Build Functions if Functions changed.
- Build app if frontend changed.
- List manual auth checks needed.
```

## Useful Add-Ons

Add these lines when relevant:

```text
Before editing, summarize the files you think matter.
```

```text
Before editing, state assumptions, success criteria, and the smallest relevant verification.
```

```text
Keep final answer short: changed files, verification, risks.
```

```text
Do not implement yet. Only inspect and propose options.
```

```text
Use caveman mode. Be terse but keep technical details exact.
```
