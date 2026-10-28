# Keybound Brawler revision QA

Date: 28 October 2026. Preview: `http://127.0.0.1:5174/keybound-brawler`, using existing offline roster fixtures and development personas. Nothing was deployed.

## Visual sources and current target

- Original approved mockup: conversation attachment, 1487 x 1058 pixels.
- Current user revisions override its eyebrow, subtitle, search, maintenance footer and global editing controls. Those elements are removed.
- Supplied artwork: `src/assets/icons/keybound-laurel-single`, an unchanged 334 x 791 SVG. The left branch is displayed as supplied; the right uses horizontal CSS mirroring. Both loaded in the browser, with computed scale `none` and `-1 1` respectively.
- Header reference: FC Collection's 30px bold serif heading, 28px feature icon, spacing and theme-aware amber colors; Keybound retains its Gamepad2 icon.
- Crown artwork: supplied gold, silver and bronze crown SVGs, unchanged. Actual shared rank selects the asset in both podium and table.
- Latest source: conversation's 1353 x 1163 reference mockup plus written instructions. It is layout guidance, not a pixel-copy target. This pass changes the podium and rank colors only: transparent background, crowns resting on avatar rims, lower first-place laurels, larger first-place score, and matching score/avatar colors in the table. The existing header, table structure, editing behavior and viewport fit remain.
- Editing reference: Cartel Gil Rush's player gil popover. Authorized admins press a ranking score for a field, current saved value, Cancel and Save/Retry. Ordinary visitors receive plain score text.
- Confirmed layout choice: fit the viewport; long rosters scroll inside rankings. The latest revision removes the table caption and column-header row, retaining an accessible table name.

## Evidence

- [Current desktop dark](docs/design-assets/keybound-brawler/podium-desktop-dark.jpg)
- [Current desktop light](docs/design-assets/keybound-brawler/podium-desktop-light.jpg)
- [Current mobile light](docs/design-assets/keybound-brawler/podium-mobile-light.jpg)
- [Current mobile dark](docs/design-assets/keybound-brawler/podium-mobile-dark.jpg)
- [Current 320px mobile](docs/design-assets/keybound-brawler/podium-mobile-320-dark.jpg)

Desktop captures are 1487 x 1058; mobile captures are 390 x 844 and 320 x 844, at CSS pixel density 1. The reference omits the app sidebar and uses a taller frame; comparison concerns the podium region and written changes rather than full-page pixel alignment. The supplied crowns visibly overlap each avatar rim, and laurels align with the lower portrait half. First-place scores measure 36px on desktop, 20px on standard mobile and 18px at narrow mobile widths, versus 28px/16px for the sides. A focused browser comparison confirmed medal colors in read-only table scores as well as admin controls.

Latest QA iteration: first capture at 320px wrapped 64,095 onto two lines (P2). Reduced the narrow first-place score to 18px with normal tracking, retaining its size advantage. The revised 320px capture shows the complete score on one line and no document overflow. No actionable P0/P1/P2 findings remain. Fonts, copy, supplied asset quality and existing controls remain unchanged; only requested spacing, hierarchy and rank colors differ. The prior header/crown screenshots remain as `crowns-*` evidence.

The following evidence records the previous popover/fitting revision before the header and crown update:

- [Desktop dark](docs/design-assets/keybound-brawler/revisions-desktop-dark.jpg)
- [Desktop light](docs/design-assets/keybound-brawler/revisions-desktop-light.jpg)
- [Desktop score popover](docs/design-assets/keybound-brawler/revisions-popover-desktop.jpg)
- [Mobile light](docs/design-assets/keybound-brawler/revisions-mobile-light.jpg)
- [Mobile dark](docs/design-assets/keybound-brawler/revisions-mobile-dark.jpg)
- [Mobile score popover](docs/design-assets/keybound-brawler/revisions-popover-mobile.jpg)
- [320px mobile](docs/design-assets/keybound-brawler/revisions-mobile-320-dark.jpg)

Desktop was inspected at 1487 x 1058 CSS pixels; the document measured exactly 1487 x 1058. Mobile at 390 x 844 and 320 x 844 also measured exactly their viewport dimensions. Long rosters remain inside the rankings region rather than expanding the page. Viewport captures are compared at their actual CSS size, not by fitting a long full-page export into the reference frame. No automated pixel-diff claim is made.

## Fidelity review

- Typography: existing Nunito/Nunito Sans and JetBrains Mono remain. The title now matches FC Collection at 30px with its feature icon; mobile popover fields are 16px. At 320px the title wraps to two lines without page overflow.
- Layout: compact second/first/third podium and a flexible ranking panel. Removing the caption and column-header row leaves more room for scores. Container-width breakpoints retain compact proportions beside the tablet sidebar.
- Colors: existing charcoal-and-amber dark theme and light theme remain. Supplied metal crowns, avatar rims and top-three scores distinguish gold, silver and bronze; editable scores retain subtle pencil/hover/focus affordances. Light mode uses darker text shades for contrast.
- Assets: supplied SVG branches replace the approximate wheat icons. Portraits and identities still come from the shared roster. Offline fixtures reuse six real portrait URLs from the existing local snapshot. Their names/order/outfits are data differences rather than hardcoded copies of the mockup.
- Copy: all requested removals are absent. Only relevant empty/error states and editing instructions inside the popover remain.

No actionable P0/P1/P2 visual issues remained in the inspected states. The previous laurel approximation is resolved by the supplied asset.

## Interaction checks

- Desktop and mobile layouts were inspected in light and dark modes, including 320px mobile width.
- Both SVG branches rendered; the right branch is mirrored.
- Score click opens the popover and focuses the existing value. Mobile collision handling kept a 300px popover inside the 390px viewport (left 78, right 378, top 340, bottom 562).
- Fractions disable saving. Whole numbers save correctly; a manual 70,000 score moved its member to first place only after success.
- Outside dismissal/Escape preserves an unsaved draft for reopening. Cancel restores the saved value without a request.
- Clearing a zero score made its member unranked; explicitly saving zero made it ranked again.
- Save closes the popover after successful confirmation. Other score triggers are locked while a save is pending.
- Member persona rendered zero editing triggers. Original live backend authorization and rules remain unchanged.
- End/Home scrolling was verified in the preceding revision. This update removes the table header and leaves the same keyboard-accessible scrolling region in place.
- Failed-save preservation/retry and ignored late responses were verified with the actual hook/popover component test harness, rather than breaking the browser's stub database.

## Validation and costs

- `npm run build`: passed; existing large-bundle warning remains.
- Changed-feature/test ESLint: passed.
- `node --test tests/keybound-brawler.test.mjs tests/keybound-brawler-editor.test.mjs`: 19 passed.
- `git diff --check`: passed.
- `graphify update .`: passed after retrying a transient Windows file lock; generated code graph refreshed.
- Backend and RTDB rules were not changed in this revision. Their original implementation checks passed previously and were not rerun for this frontend-only change.
- Each popover Save sends one changed record through the existing protected callable. Several members now mean several separate Save calls instead of one batch submission. Each has existing live authorization work, one member-existence read and one atomic score/timestamp update. Opening, cancelling, or dismissing popovers adds no Firebase work. No new listeners or polling.

## Revision history

The earlier implementation used batch editing, approximate wheat decoration and a maintenance footer. Subsequent revisions applied supplied laurels, viewport-filling rankings and per-member popover saves, then matched the FC Collection heading, replaced trophies with supplied crowns and removed the table caption/header row. The latest pass removes the podium frame, seats crowns on portraits, lowers laurels, increases first-place score size and applies medal colors to scores/avatar rims. Desktop and mobile were re-inspected in both themes, plus 320px dark mode; document dimensions still match each viewport. `podium-*` files show the current UI; earlier screenshots remain for history. This visual-only update adds no Firebase reads, writes or Function calls.

final result: passed
