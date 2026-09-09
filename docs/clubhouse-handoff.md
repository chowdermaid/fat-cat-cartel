# Cartel Clubhouse handoff

## Resume context

Workspace: `C:\Projects\fat-cat-cartel` (Windows, PowerShell).

Read root `AGENTS.md` before working. Use `docs/project-reference.md` for the Clubhouse implementation notes and `docs/frontend-patterns.md` for UI conventions. Keep changes surgical and preserve the user's other homepage edits. Do not touch `.env`, secrets, production records, or expand Firebase traffic. The user prefers concise Caveman-style communication and autonomous implementation without unnecessary confirmation.

The latest requested implementation is complete. The user is moving to a new chat; wait for their next change request rather than rebuilding the feature or implementing superseded plans.

At handoff, HEAD is `f52f3e8` (`feat: Enhance clubhouse functionality with new geometry and member management features`). Before creating this document, the working tree had only one untracked file: `src/assets/clubhouse/clubhouse-bg-night.png`. That is a user-added asset; preserve it. It has not been inspected or integrated. The active background still imports `clubhouse-bg.png`. Do not infer a request to switch backgrounds.

## Current product behavior

- Clubhouse lives in the **homepage hero**, not the `/members` directory. Desktop grid is `minmax(0,2fr) minmax(0,3fr)` (40% introduction / 60% Clubhouse, excluding gap); mobile stacks.
- No visible Clubhouse heading, Pause/Resume button, or “Tap a troublemaker to meet them” text. The section retains its accessible name.
- Show **15 members on both desktop and narrow layouts**, or everyone when the roster has fewer than 15. The queue's hard cap also uses `CLUBHOUSE.maxVisible`; do not restore the old hardcoded cap of 10.
- Portraits are **52px desktop / 44px below 640px scene width**. Hats scale with the portrait. Names remain visible underneath; fallback uses the existing User icon. Faces and names stay upright; no feet.
- Fedora SVG is `src/assets/clubhouse/fat-cat-cartel-fedora.svg`. Width is 1.4 times portrait diameter, left/top offsets -0.2/-0.6 diameters. Each ID gets a stable pseudorandom final tilt from -25° to +10°. CSS compensates for the SVG's embedded -15° rotation and pivots around its brim. No continuous spinning.
- Portraits are TanStack links to `/members/$lodestoneId`. Click, tap, or Enter navigates directly. Plain-text biography appears in a portaled shadcn tooltip on hover/keyboard focus after 250ms; missing biography says “No biography yet.” Long text uses ScrollArea. Escape dismisses the tooltip. No biography dialog or selection state.
- Hover, focus, and open tooltip independently pause/protect the member, including pointer travel onto the tooltip. Hidden-tab and offscreen state pause movement and transitions. Reduced motion disables wandering, bobbing, fades, and automatic rotation; “Show other members” performs an immediate fair replacement on the carpet.

## Background, carpet, and door motion

Active artwork: `src/assets/clubhouse/clubhouse-bg.png`, 1983 × 793. It renders as a decorative image with `object-cover` and **left/bottom alignment**. Scene height is at least 520px desktop / 480px narrow and grows to the artwork aspect ratio on wider scenes.

`getClubhouseGeometry` uses the same cover scale and crop offsets as the image. Artwork coordinates are normalized to the original image:

```ts
carpet: [
  { x: 0.132, y: 0.605 },
  { x: 0.868, y: 0.605 },
  { x: 1.04, y: 0.96 },
  { x: -0.04, y: 0.96 },
]
door: { x: 0.09, y: 0.475 }
carpetEntry: { x: 0.17, y: 0.67 }
```

The legal wandering polygon reserves the full ground shadow on the carpet and keeps hats/names inside the scene. “On the carpet” means the ground shadow; portraits extend above their ground position. Initial members spawn distributed on the carpet.

Rotation walks one eligible outgoing member through the carpet entry to the door, fades them out at the door, removes them, then mounts their replacement at the same door. The incoming member fades in and walks through the carpet entry onto the carpet. These journeys are the exception to carpet-only movement. Entering/leaving members count toward the 15-member cap. This retains 15 roster slots, with the intended brief fade during a doorway exchange.

The shuffled waiting queue gives all waiting members a turn before outgoing members repeat. The next random 15–25 second interval starts after arrival; doorway walking time is additional. Walking speed is 18–28px/s, doorway speed 38–48px/s, idle 1.5–4 seconds, bob 2px, fades 300ms.

Interacting with a departing member cancels eviction, restores opacity, and pauses them. Once protection clears they return to the carpet. Resize remaps positions and active route waypoints to the new artwork geometry. Reduced motion during transit cancels animations and settles members onto the carpet. Animation handles, positions, timers, and routes stay outside React frame updates; transforms and stacking update directly.

## Files to inspect

| File | Responsibility |
| --- | --- |
| `src/features/home/constants.ts` | All `CLUBHOUSE` tuning defaults |
| `src/features/home/types.ts` | Queue, actor, environment, geometry, layout, protection types |
| `src/features/home/utils/clubhouse.ts` | Pure queue fairness/reconciliation, hat bounds, carpet geometry, sampling and duration |
| `src/features/home/hooks/clubhouseController.ts` | Anime.js movement, doorway routes, fades, rotation, protection, resize and cleanup |
| `src/features/home/hooks/useClubhouse.ts` | React adapter, refs, observers, reduced-motion and visibility handling |
| `src/features/home/components/clubhouse/CartelClubhouse.tsx` | Scene, background, visible roster and reduced-motion control |
| `src/features/home/components/clubhouse/ClubhousePortrait.tsx` | Portrait link, hat, permanent label and biography tooltip |
| `src/features/home/components/hero/HomeHero.tsx` | Homepage integration and 40/60 grid |
| `src/lib/db.stub.ts` | Shared development roster and biographies |
| `tests/clubhouse.test.ts` | Pure queue/geometry, hat, bounds and stub checks |
| `tests/clubhouse-controller.test.ts` | Controller lifecycle tests with mocked Anime.js handles |

## Data and scope

The existing homepage dashboard members/profiles are passed into the Clubhouse. Use the entire roster, including Friends, keyed by Lodestone ID, with member name, `avatarUrl`, and `profile.bio`. No new Firebase reads, writes, listeners, downloads, Functions, route, or store were added for this feature. Portrait URLs load as members appear.

Shared stub roster has 20 members: eight existing entries plus 12 clearly fictional `Stub ...` development entries with stable IDs. Biographies include empty and long examples. Stub `membersLastUpdated` is `Date.UTC(2026, 8, 9)` so old eight-member caches refresh through existing validation; production cache keys and fetching behavior are unchanged. With 15 visible, five members initially wait.

## Verification status

After the latest change to 52/44px portraits and 15 visible members:

- All **28 focused Node tests passed**.
- App build (`tsc -b && vite build`) passed; existing large-chunk warning remains.
- Changed-file ESLint passed for constants, geometry/queue utility, and both test files.
- `git diff --check` passed, with Windows line-ending warnings only.
- Full-repository lint was not rerun for the latest change. Earlier work reported unrelated existing lint failures; do not claim full lint is clean.

Browser verification remains unavailable: the most recent CUA inventory returned `apps: []` and `browsers: []`. Automated controller tests mock Anime.js; they do not establish real visual quality or browser behavior. Still visually verify desktop/mobile crowding with 15 members, background crop, carpet/door alignment, actual transitions, tooltip pointer travel and dismissal, keyboard/touch navigation, reduced-motion control, offscreen/hidden-tab recovery, resize, and React Strict Mode cleanup when a browser becomes available. Destination sampling favors spacing but does not guarantee collision-free paths in a crowded scene.

Graphify CLI was unavailable on PATH. Do not confuse the installed npm `graphify` library with the requested CLI. Run `graphify update .` after future code changes if the CLI becomes available; do not hand-edit generated graph output.

## Commands in this environment

Node/npm and Git were not on the default PATH. These commands worked from the repository root:

```powershell
$env:PATH = 'C:/Program Files/nodejs;' + $env:PATH

& 'C:/Program Files/nodejs/node.exe' --experimental-test-module-mocks --test tests/clubhouse.test.ts tests/clubhouse-controller.test.ts

& 'C:/Program Files/nodejs/node.exe' node_modules/eslint/bin/eslint.js src/features/home/constants.ts src/features/home/utils/clubhouse.ts tests/clubhouse.test.ts tests/clubhouse-controller.test.ts

& npm.cmd run build

# If browser verification becomes available:
& npm.cmd run dev:stub

& 'C:/Program Files/Git/cmd/git.exe' status --short
& 'C:/Program Files/Git/cmd/git.exe' diff --check
```

No deployment or new commit was performed as part of writing this handoff. Recheck working-tree state before the next implementation.
