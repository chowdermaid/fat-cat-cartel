# Frontend Patterns

Use this doc when changing UI layout, navigation, components, styling, assets, or animation.

## General UI Taste

- Build the real app surface first. Do not replace app pages with marketing landing pages unless asked.
- Match the FC tone: playful, FFXIV-specific, polished, and practical.
- Use compact operational layouts for dashboards and admin tools.
- Preserve dark mode support on every new surface.
- Keep text fitting in buttons, cards, sidebar items, and responsive grids.
- Use stable dimensions for boards, grids, charts, toolbars, counters, and roulette controls to avoid layout shift.
- Avoid decorative gradient orbs, bokeh blobs, and one-note palettes.
- Avoid nested cards and page sections styled as floating cards.
- Cards can be used for repeated items, dialogs, and framed tools.
- Keep cards at the existing radius scale, usually `rounded-lg` or smaller.

## Components And Styling

- Use Tailwind classes for styling.
- Do not add CSS modules.
- Avoid inline styles except for computed visual transforms or canvas-adjacent positioning already used in the app.
- Use shadcn UI components from `src/components/ui/` when available, especially for repeated controls, dialogs, menus, tabs, form fields, scrollable panels, and buttons.
- Use the shadcn `Button` component for clickable commands instead of native `<button>` when the control is visible UI. Native `<button>` is acceptable only for tiny local primitives inside a reusable component, third-party integration constraints, or cases where the existing local pattern already requires it.
- Wrap constrained scrollable content in the shadcn `ScrollArea` component instead of relying on raw `overflow-auto` when the region is part of the designed UI, such as dialogs, side panels, dropdown content, long lists, tables, member grids, timeline panes, and dashboard widgets.
- Keep native overflow utilities for page-level scrolling, simple responsive clipping, carousels, or one-off layout containment where a styled scrollbar is not visible or not part of the component surface.
- Use Lucide icons for controls when available.
- Use icons inside buttons for tools, icon plus text for clear commands, and tooltips for unfamiliar icons.
- Match display text to its container. Use smaller headings inside compact panels, cards, sidebars, dashboards, and tool surfaces.
- Use tabs for view switches, menus for option sets, toggles or checkboxes for binary settings, sliders, steppers, or inputs for numeric values, and swatches for colors.

## Navigation And Shell

- `src/components/layouts/RootLayout.tsx` owns the app shell structure.
- `src/components/layouts/AppSidebar.tsx` owns global navigation and dark mode toggle.
- Add global nav links in `AppSidebar`, not `RootLayout`.
- New pages live at `src/features/<name>/index.tsx` and must be registered in `src/app/router.tsx`.

## Feature Notes

- Members: `useMembers` reads `/members`, caches it, and `MembersPage` groups by rank order: Boss, Underpaw, Housecat, Stray, Friend.
- Member profiles: read member identity, profile, collection data, collectible names, and raid parse or activity data.
- FC collection: supports mounts, minions, titles, achievements. Config lives in `constants.ts`.
- Mount roulette: consumes FC collection mount data, filters by expansion, source, ownership, and selected members.
- Raid stats: `ZONE_TABS` and zone metadata live under `src/features/raid-stats`.
- Easter 2026: scoreboard listens live to `/events/easter2026/participants`; admin participant manager writes scores and totals.
- Calendar: combines birthdays from `/memberProfiles` with Raid Helper events from `/calendarEvents`.
- Admin auth: Discord OAuth and Firebase Functions authorize access. See `docs/admin-auth-implementation.md`.

## Assets

- Prefer existing assets in `src/assets`.
- Dynamic asset collections use `import.meta.glob(..., { eager: true, import: "default" })`.
- Job icons are shared by raid stats, member profiles, and admin profile editing.

## Animation

- Import AnimeJS with `import { animate, stagger } from "animejs";`.
- Use mount-time stagger animations from a `ref` for page sections, cards, member grids, and skeletons.
- For loading states, prefer skeleton blocks with `animate-pulse` and a `.sk` class only on elements that should individually cascade.
- For table or list refreshes, animate only visible rows and cap long lists.
- For progress bars or meters, keep JSX at the base value and animate the changed property.

## UI Verification

- Run the dev server and inspect mobile and desktop when changing layout.
- Use `VITE_USE_STUBS=true` when Firebase credentials or emulators are not needed.
- Use emulator mode when validating production-shaped RTDB data, rules, or callable admin refreshes.
