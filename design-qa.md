# Compact navigation and shorter Quick start

final result: passed

Reduced navigation panel/link padding and desktop icon gaps while preserving 44px link targets. Removed the requested Blue, Violet and tile-activation explanations from Quick start, leaving the round-4 mood note, roll-once instruction and numbered-path instruction. Desktop and 390px browser checks confirmed compact spacing, readable steps and active Quick start navigation. Evidence: `.codex/cartel-gil-rush/quick-start-trimmed.png` and `quick-start-trimmed-390.png`. Seven focused page tests and feature/test ESLint pass; Graphify refreshed.

---

# Rulebook references, mood backgrounds and scroll navigation

final result: passed

Removed the requested Tiles & movement notice, landing note and five movement paragraphs. Removed Rewards' earned-gil reminder and changed all three prize panels to the existing muted surface. Mood cards now use yellow/blue/violet/red tinted backgrounds and show only their mood names. Inline Lucide dice, movement arrows and the site's existing Coins icon mark rule references; violet examples show the corresponding dice faces. Original commands, amounts and gameplay effects remain unchanged.

Fixed the final-chapter navigation clamp by sizing the last chapter from the reading viewport height. This provides enough trailing reading space for Board moods and Rewards to align separately with the existing reading line. The height is synchronized before restoring hidden-view scroll position, and recalculated on resize. Existing focus, reduced-motion, passive tracking and local scroll behavior remain.

Evidence: `.codex/cartel-gil-rush/rulebook-mood-colours.png`, `rulebook-tile-icons.png`, `rulebook-muted-rewards.png` (1440 × 1000); `rulebook-mood-colours-390.png` (390 × 844); `rulebook-tile-icons-320.png` (320 × 844). Browser checks confirmed Board moods active with a 16px heading inset, and Rewards independently active with a 17px inset. Both phone widths retain equal reading viewport/scroll widths, with no page horizontal overflow. Cards, inline references and wrapped tile descriptions remain readable. No actionable visual findings remain; physical touch testing remains unverified.

Fourteen focused page/scroll/hook tests, feature/test ESLint and production build pass. New checks cover removed copy, tinted cards, inline icons, muted prizes, viewport-height sizing and independent final-chapter activation. Implementation notes and Graphify refreshed. No generated artwork, event-state or Firebase changes.

---

# Gold start landmark

final result: passed

Tile 1 now shares tile 90's #FFD451 gold face and dark ink, with a Lucide Flag. The starting arrow and exact caption "Start here, moving horizontally across" are gold in dark mode and amber in light mode. Caption wrapping is balanced below the arrow and stays inside the horizontally scrolling board. Desktop and 320px browser checks confirmed the matching RGB values, readable flag, distinct arrow and fully visible two-line instruction. Evidence: `.codex/cartel-gil-rush/board-start-desktop.png` and `board-start-320.png`. Five board tests, focused ESLint and production build pass; Graphify updated. No gameplay/data/Firebase changes.

---

# Board Overview: alternating rows and clean layout

final result: passed

Source: latest user-supplied inline board mockup and accompanying corrections. Written removals take precedence over the mockup's subtitle and footer sentence. Numbering and connections continue to come from existing board data, including 14 → 45 and 74 → 13; generated reference numbering is ignored.

Ordinary panels now alternate by numbered row: 1–15, 31–45 and 61–75 are slate grey; the other three rows are snow white. Existing special-role colours override those rows. Removed the white grout surface, fixed charcoal canvas, outer frame, dimension subtitle, destination labels/dots, caption, route-chip groups, visible status, Clear selection and non-chaining footer. Board and legend are centred; gaps inherit the website background. Direction cues are higher-contrast theme-aware angular paths around the edges, with a straight starting arrow below tile 1. Straight red falls and lime ladders retain inset endpoints. Supplied icons/crown are reused; no assets generated.

Evidence: `.codex/cartel-gil-rush/board-row-panels-desktop.png` (1440 × 1000), `board-row-panels-390.png` (390 × 844), `board-row-panels-320.png` (320 × 844). Full-view review confirms alternating rows, preserved special placements, borderless layout and removed controls. Live endpoint measurements checked all eight connections against the actual tiles, within 0.003px of their intended centre-line insets. Exact row RGB values were checked in-browser. Origin selection dims seven other paths; Escape restores them, with a screen-reader-only selection announcement. At 390px only the nested board viewport pans (840px scrollWidth / 294px clientWidth), while the reading pane retains scrollLeft 0. At 320px the page remains 320px wide, and the reading pane has equal 240px width/scrollWidth. Minimum origin-button width is 46.5px. Physical touch-device testing remains a manual follow-up.

Verification: 13 focused board/geometry/selection/page tests, feature/test ESLint and production build pass. Tests protect row colours, special overrides, exact 25 placements/eight routes, straight fall geometry/open arrowheads, angular cues, removed content and local selection behavior. Implementation notes updated. No auth, event state/storage, gameplay rules or Firebase operations changed. No actionable layout issues remain.

---
# Board Overview: connected React board

final result: passed

Subsequent user correction: the ladder starts at **14 → 45**. Tile 13 is solely the destination of **74 → 13**. Updated the placement data, accessible descriptions, route-selection tests and implementation notes; all 11 affected tests pass. The original screenshots and dual-role observations below record the earlier placement and are superseded by this correction.

Source visual truth: the user-supplied 1555 × 1011 final-board image in the Board Overview request, together with the accepted React-board plan and authoritative placement list. The source is a standalone illustrated board, not an app screenshot; the approved design deliberately adapts it to the existing Rulebook with cream faces, supplied artwork, practical web sizing and selectable connectors. Comparison covers snake orientation, numbered placements, ladder/fall endpoints and icon roles, rather than reproducing the source's blue poster background or footer graphics.

Implementation evidence: `.codex/cartel-gil-rush/board-overview-desktop.png` and `board-overview-light.png` (1440 × 1000 CSS/PNG pixels), `board-overview-390.png` (390 × 844), and `board-overview-320.png` (320 × 844). Native browser viewport captures use CSS-pixel sizing; no density resampling or 1:1 poster scaling was applied. State: Underpaw stub session, existing five-player event, Rulebook selected, Board Overview at the top, all eight routes visible. Both dark and light themes were inspected. The source layout and the rendered full board agree on 1 bottom-left, 90 top-left, all 25 special locations, both ladders and six falls. Focused endpoint checks confirmed tile 13 keeps its ladder origin and incoming-fall marker; six SVG fall endpoints were within 0.00004px of their measured cell centers, and exactly aligned after sidebar resizing.

Findings and comparison history:
- [P2, fixed] The initial Radix reading-content table inherited the 840px board minimum width on phones. This widened the entire reading pane and clipped the legend/caption. A feature-scoped block override now bounds the reading content; the nested board viewport alone scrolls horizontally. Post-fix screenshots at 390px and 320px show contained board frames, wrapped captions and a stationary icon rail. At 320px, page width is 320px, reading width/scrollWidth are both 240px, and the nested board width is 222px with 840px scrollWidth. No actionable P0/P1/P2 findings remain.

Primary interactions verified: origin tile and route-chip selection, seven other paths dimmed, selected endpoints, same-route toggle, Escape, Clear selection, keyboard horizontal panning, wheel scrolling over the board into the reading pane, chapter navigation, and Game/Rulebook switching. Reading position restored exactly at 5728px with Rewards still active; Game retained its five-player order, round 1 and selected first mood. Phone navigation links measured 47 × 48px. All supplied images decoded. Sidebar expansion/collapse remeasured connectors without page overflow. Browser logs contain the previously observed extension message-channel errors; no board-specific rendering or asset errors were observed.

Implementation checks: 28 focused tests passed serially; feature/test ESLint and production build passed. Build retains the existing large-chunk advisory. Tests cover all cell positions, exact placements/routes, derived arrivals, geometry at two sizes, resize/cleanup, local selection and five-chapter scroll behavior. Implementation notes and project reference updated; no Firebase operations, event storage changes or new artwork. Physical touch-device testing remains a follow-up; mouse and keyboard behavior was checked in the browser.

---
# User-supplied tile artwork

final result: passed

Replaced tile-reference library icons with the user's supplied SVGs for Shark, Moogle, Mushroom, Chocobo, Ladder and Red arrow. Fatcat uses the requested existing `fatcathi.png`. Tiles & movement and Game quick references share one artwork mapping, with 40px and 56px object-contained slots respectively. Removed the mushroom placeholder. Crown/finish and the informational alert retain library icons because no corresponding replacement was supplied. No new images generated.

Five provided `.png` files actually contained SVG markup. Corrected their extensions to `.svg` and updated imports without changing source artwork. Browser checks confirmed all seven images decoded successfully in both views; phone quick reference showed no horizontal overflow. Evidence: `.codex/cartel-gil-rush/supplied-tile-artwork.png` and `.codex/cartel-gil-rush/supplied-game-artwork.png`. All 22 focused tests, feature ESLint and production build pass. No gameplay, storage or Firebase changes.

---

# Uniform challenge tile rows

final result: passed

Corrected the interpretation of the previous move: Fatcat and Chocobo now use the same 40px icon/name/effect row renderer and dividers as the other tiles, immediately after Mushroom and before Ladder. Removed the standalone challenge-card component. Procedures, 200,000-gil outcomes and the concise landing note remain. Desktop browser verification and the rendering regression test confirm the exact order: Shark, Moogle, Mushroom, Fatcat, Chocobo, Ladder, Red arrow, Crown/finish. Evidence: `.codex/cartel-gil-rush/uniform-challenge-tile-rows.png`. All 22 tests, focused ESLint and production build pass. No data or asset changes.

---

# Challenge tile move and Rewards rename

final result: passed

Moved the existing Fatcat/Chocobo cards, including their procedures, 200,000-gil payouts and landing note, into Tiles & movement after the movement-reference list. Renamed the fourth chapter/component/anchor to Rewards. Rewards retains earned gil, the three prize placeholders and pick-order copy; both quoted paragraphs are removed rather than relocated. The continuous document, fixed navigation and responsive card styling remain intact.

Browser checks confirmed both challenge headings belong to `special-tiles`, four navigation links ending with Rewards, three prize cards under `rewards`, correct desktop Rewards highlighting and no phone horizontal overflow. Evidence: `.codex/cartel-gil-rush/folded-challenge-tiles.png` and `.codex/cartel-gil-rush/rewards-only.png`. All 22 focused tests, feature/test ESLint and production build pass. Rendering tests check placement, renamed anchors and removed text. No event storage, assets or Firebase behavior changed.

---

# Shark rule update

final result: passed

Updated Shark from a fixed three-space setback to a standalone `/random 10`: even moves forward by the rolled amount; odd moves backwards by the rolled amount. Updated the Game quick reference, Rulebook summary, shared tile-card definition and tile-roll/finish eligibility notes. Existing board bounds, non-chaining movement and normal-roll-only mood rules remain. All 22 focused tests, feature ESLint and production build pass; rendering assertions cover the revised command/directions and absence of the old tile-card rule. No movement automation, assets, event storage or Firebase changes.

---

# Challenges & rewards paired-card update

final result: passed

Matched the user's latest inline reference at practical web scale: amber heading ampersand, two equal-height challenge cards with icon/name above the procedure and bottom-aligned payout sections, crown-led Grand prizes heading, and three neutral item placeholders. Copy now states first/second/third pick order; the former gold/silver/bronze place labels are removed. The continuous Rulebook header/navigation remain, without reintroducing the reference's removed chapter footer.

Desktop CSS viewport 1440 × 1000: both cards begin at the same y coordinate and measure 355.5px high. At 390 × 844 they stack at the same x coordinate without horizontal overflow; all three prize placeholders remain present. Evidence: `.codex/cartel-gil-rush/challenges-two-cards.png` and `.codex/cartel-gil-rush/challenges-two-cards-mobile.png`. The full-view captures show readable 14–16px body text, 20px challenge titles and 28–32px payouts; standard library icons are retained and no image assets generated. No actionable layout findings remain. All 22 focused tests, ESLint and production build pass. No event-state or Firebase changes.

---

# Rulebook content revisions QA

final result: passed

Quick start now places Finishing directly below its heading with the exact requested text: "The first three to reach the crown can choose a prize. Game stops after 3 finishers". Removed its old subtitle, standalone violet-example callout and footer. Removed the Ordinary tile note and the entire Host guide chapter/component/navigation entry. The continuous document and icon rail now contain four chapters; bottom-of-document highlighting selects Challenges & rewards. Board moods' own examples remain unchanged.

Desktop (1440 × 1000) and phone (390 × 844) browser checks confirmed the revised order/text, four links, removed content and no phone horizontal overflow. Evidence: `.codex/cartel-gil-rush/rulebook-revisions.png` and `.codex/cartel-gil-rush/rulebook-revisions-mobile.png`. All 22 focused tests, ESLint and production build passed. No event state, assets or Firebase operations changed.

---

# Continuous Rulebook QA

final result: passed

## Behavior and evidence

- Implements the accepted continuous-document plan. Five chapter components render together; the shared header and left navigation stay stationary while the reading pane scrolls. Chapter tabs, dropdown and Previous/Next buttons are removed. Quick start's finishing text/fixed-order note remain inside its chapter; Host guide's existing rules are extracted without rewriting.
- Desktop capture: `.codex/cartel-gil-rush/continuous-rulebook-desktop.png`; phone captures: `.codex/cartel-gil-rush/continuous-rulebook-390.png` and `.codex/cartel-gil-rush/continuous-rulebook-320.png`; light theme: `.codex/cartel-gil-rush/continuous-rulebook-light.png`.
- Tested CSS viewports: 1440 × 1000, 390 × 844, 320 × 740 and short-screen 390 × 400. At desktop the document height equals the 1000px viewport; the reading pane is 799px high with 4957px of chapter content. Header top stays at 48px and navigation top at 201px during keyboard scrolling. Short-screen rail content (288px) scrolls within its 155px viewport. No horizontal overflow was observed in the document or reading pane at 390px/320px.
- Navigation uses accessible links, one `aria-current="location"`, mobile icon targets at least 44px and tooltips. Board moods navigation landed at 15.5px below the reading viewport top, focused the correct heading and left the URL hash empty. PageDown changed the active chapter to Challenges & rewards without moving the header/rail; Control+End selected Host guide. Passive reading did not move focus in the hook tests.
- Switching Game/Rulebook restored the exact tested reading offset (1638px) and active chapter. Fresh navigation starts Quick start at offset zero. Repeated chapter links, wheel scrolling, sidebar collapse/expansion and light/dark themes were checked. Event roster/order and manual controls remain available in Game; persistence/access tests pass.

## Findings and verification

- Resolved: the 320px icon rail made mood-rule text too narrow in the second card column. Rules now span the full card width below the icon/name on narrow layouts; post-fix phone captures show readable wrapping. Existing compact typography, cards, payout copy and placeholders remain intact.
- Twenty-two focused tests pass, including all-chapter server rendering, scroll boundaries/bottom handling, 16px offsets, focus, reduced motion, frame coalescing, hidden-view restoration and cleanup. Feature/test ESLint and production build pass. No authentication, route, event-storage, asset or Firebase changes.
- Browser logs still show extension message-channel errors, with no observed feature error. One automated click immediately after a viewport resize navigated away; returning to the preview and repeating sidebar checks at settled dimensions passed. This required no app workaround.
- Physical touch-device gestures remain unverified; scrolling uses the native touch-capable ScrollArea viewport. No custom touch interception is introduced. No unresolved desktop/mobile layout findings remain.

---

# Quick start overview removal

final result: passed

Removed the separate Board moods summary panel and its now-unused component. Quick start steps use the available content width. The dedicated Board moods chapter remains available in the left menu. Desktop browser verification confirmed the panel is absent and the steps/footer fit cleanly; evidence: `.codex/cartel-gil-rush/quick-start-without-mood-panel.png`. Focused ESLint passed. No event-state or data-access changes.

---

# Board moods card update

final result: passed

Replaced the horizontal row separators and desktop column rules with four bordered, rounded cards matching the existing challenge-panel surface. Kept compact typography, mood colours/icons, copy, examples and navigation. Desktop (1440 × 1000) and phone (390 × 844) inspected; no phone horizontal overflow. Evidence: `.codex/cartel-gil-rush/board-moods-cards.png` and `.codex/cartel-gil-rush/board-moods-cards-mobile.png`. Focused ESLint and diff checks pass. Styling only; no data, state, assets or Firebase changes.

---

# Cartel Gil Rush Challenges & rewards QA

final result: passed

- Source: the user's inline Challenges & rewards screenshot. The approved practical web scale, existing shared header, full available workspace and left chapter rail are preserved. No new image generation.
- Evidence: `.codex/cartel-gil-rush/challenges-rewards-desktop.png` and `.codex/cartel-gil-rush/challenges-rewards-mobile.png`, captured at requested CSS viewports 1440 × 1000 and 390 × 844. Native screenshot bounds differ slightly from CSS viewport bounds; no normalization to the reference's larger text is intended.
- Full-view comparison: two challenge panels use icon/name, procedure and payout columns. The three placement cards use gold/silver/bronze accents and explicit item placeholders. Ordinary page scrolling accommodates the retained rule notes and footer. On phones, challenge contents and prize cards stack without horizontal document overflow.
- Typography/layout: existing Nunito/Nunito Sans, 28–32px page heading, 20px challenge names, 14–16px body, 28–32px payout amounts, 48px icons, compact padding and consistent rounded borders. Standard Cat/Bird/Crown/help icons replace illustration needs; user-supplied artwork can replace them later.
- Content: one attempt per landing, remaining on the tile, both 200,000-gil rewards, loss/incorrect/no-answer outcomes, suggested 15-second trivia procedure, repeat visits, separate host payment, retained gil and host-announced placement choices are preserved. Prize items are explicitly unannounced. No prize-selection or payout-tracking controls are introduced.
- Focused review: payout labels/amounts and prize-placeholder text remain readable; the three-column desktop layout fits at the checked size. No separate magnified crop was needed because those details are readable in the full screenshot. No actionable P0/P1/P2 findings remain. Optional polish: replace simple icons and prize placeholders when the host supplies assets/items.
- Interactions: Previous opens Board moods; Next opens Host guide & finishing. Browser inspection confirmed all three prize cards and no horizontal overflow at 390px. Feature ESLint and production build pass. All 16 focused tests pass with `--test-concurrency=1`; the first parallel run encountered a Windows Vite cache-file lock. No application fix was needed. No Firebase operations or cost changes.

---

## Previous Board moods QA

# Cartel Gil Rush Board moods QA

final result: passed

- Source: the user's inline Board moods screenshot, 1505 × 1045, with explicit overrides for compact web scale, simple icon substitutes, no generated artwork, no secondary subtexts and "Begins from round 4". The established shared header and left menu take precedence over the reference's alternate header.
- Evidence: `.codex/cartel-gil-rush/board-moods-desktop.png` and `.codex/cartel-gil-rush/board-moods-mobile.png`. CSS test viewports: 1440 × 1000 and 390 × 844; native captures differ slightly from CSS viewport bounds. No scaling to the source's oversized typography is intended.
- Composition: four separated rows follow the source's icon, colour/name and rule columns. Yellow, blue, violet and red keep their semantic colours. Desktop columns become stacked rows on phones, with no horizontal overflow. Previous/Next remain in the content column; the workspace retains its full available width.
- Typography: existing Nunito/Nunito Sans, 28–32px page title, 20px mood names, 16px main rules, 12px colour labels and 48px icons. These deliberately retain the user's practical web scale. All four moods and desktop navigation fit at the checked viewport.
- Copy: begins from round 4; three individual player turns per mood; Lucky Sixes, 50,000-gil underdog bonus, violet higher-roll rule and 200,000-gil red-arrow compensation remain. Exclusion notes, explanatory bullet lists and the suggested mood-selection paragraph are removed here. Violet keeps only two compact examples. Game rules/state are unchanged.
- Assets: standard library die, trophy, dice and hard-hat icons stand in for artwork the user may supply. No images were generated or downloaded.
- Review: desktop full-view and readable row details were compared against the inline reference and approved simplifications. Tight violet example spacing was improved with explicit gaps; the redundant red explanatory sentence was removed. Final desktop/phone captures show the corrected rows. No unresolved P0/P1/P2 findings. User-supplied icon replacement remains optional polish.
- Interactions: Previous opens Tiles & movement; Next opens Challenges & rewards. Responsive chapter dropdown remains available on phones. Sixteen focused tests, feature ESLint and production build passed; no Firebase cost or data-access changes.

---

## Previous Tiles & movement QA

# Cartel Gil Rush Tiles & movement QA

final result: passed

## Source, scope and evidence

- Source: the user's inline Tiles & movement screenshot (1505 × 1045). The user's instructions supersede literal scaling: compact web sizes, shared Rulebook-style header, left rail, available page width, no generated images, and exclusion of Fatcat/Chocobo from this chapter.
- Implementation: `/cartel-gil-rush`, Rulebook → Tiles & movement, local stub Underpaw session. Desktop CSS viewport 1440 × 1000; phone 390 × 844. Native screenshot images are 1425 × 990 and 375 × 812 respectively. Native capture bounds differ from the requested CSS viewport. Screenshots are reviewed at their native display density; no normalization to the source screenshot's larger typography is intended.
- Desktop: `.codex/cartel-gil-rush/tiles-movement-desktop.png`; phone: `.codex/cartel-gil-rush/tiles-movement-mobile.png`; light theme: `.codex/cartel-gil-rush/tiles-movement-light.png`.

## Comparison and findings

- Full view: the source's heading, amber notice, icon/name/effect rows, thin dividers, Crown/finish and Previous/Next chapter navigation are implemented. The established shared header and global app chrome are retained intentionally. Six reference rows replace the source's eight because the two challenges are excluded as requested. Full movement exceptions follow the rows, so the page may scroll on shorter screens.
- Typography: existing Nunito/Nunito Sans; 28–32px heading, 16px row labels, 14px effects, 40px icons. This is intentionally smaller than the screenshot, following the user's scale preference. Phone row descriptions wrap beneath their names without horizontal overflow.
- Colour/layout: amber notice and navigation; blue shark, pink moogle, violet mushroom placeholder, green ladder, red arrow and amber crown. Theme-aware colours remain readable in light/dark captures. Left menu remains available on sufficiently wide workspaces.
- Asset quality: standard library icons match the outlined visual direction. Mushroom uses an explicitly labelled image placeholder; the user will provide missing artwork. No generated assets or custom illustration code were added.
- Content: tile 90, no exact roll, red compensation of 200,000 gil, standalone tile-roll restrictions, bounds, repeated landings and non-chaining exceptions are retained. Fatcat and Chocobo are absent from the row list; their existing Challenges & rewards text and Game quick references are unchanged.
- Focused row review found initially repetitive long effects. Condensed the rows to the source's short summaries and retained exceptions in the notes. Post-fix desktop/mobile/light captures show readable rows; no actionable P0/P1/P2 findings remain. Detailed row typography and copy were readable in the full screenshots, so a separate magnified crop was unnecessary.

## Interactions and verification

- Previous opens Quick start; Next opens Board moods. Chapter selection and responsive phone fallback work. Browser DOM inspection confirmed exactly six row labels and no document overflow at 390px.
- Sixteen focused tests, feature ESLint and production build passed. No Firebase or event-state operations changed. Browser logs contain extension message-channel errors; no tile-component error was observed.
- Remaining polish: replace the mushroom placeholder when the user supplies artwork. Challenges & rewards redesign is explicitly deferred.

---

## Previous compact layout QA

# Cartel Gil Rush compact layout and shared header QA

final result: passed

Latest layout adjustment: removed the centred 1280px cap so the Rulebook menu stays against the left edge of the workspace and content uses the available width. The workspace fills the viewport below the existing app toolbar without enlarging typography. The left rail appears from 640px of available workspace; the 768px check with global navigation collapsed showed a 180px rail and no overflow. The 390px phone check retained the chapter dropdown without overflow. Desktop evidence: `.codex/cartel-gil-rush/full-width-rulebook.png`. Earlier capped-layout notes below describe the prior iteration.

- The user's latest direction supersedes the earlier screenshot-scale comparison below. Screenshot references guide layout; practical web sizing takes precedence.
- Quick start now uses a 28–32px heading, 14–16px copy, 40px step badges, 48px mood icons, smaller spacing and a 1280px maximum reading layout. At 1440px with the app sidebar open, the steps and mood panel fit side by side; narrow screens stack them.
- Game and Rulebook share the Rulebook-style branding and tab layout. View-specific header branches caused the previous difference and have been removed. Header height and title/tab positions remain the same when switching views on desktop and mobile. Host dialogs remain mounted to preserve forms and roster loading behavior.
- Desktop capture: `.codex/cartel-gil-rush/compact-rulebook.png`. Mobile capture: `.codex/cartel-gil-rush/compact-rulebook-mobile.png`. The 390px mobile check showed no horizontal document overflow.
- No image assets were generated. Future missing artwork uses labelled placeholders for the user to replace; existing assets remain in place. This preference is recorded in `docs/frontend-patterns.md`.
- Sixteen focused event/storage/access tests, feature ESLint and production build passed. No Firebase operations or event-state behavior changed.

---

## Previous screenshot-scale Rulebook QA (superseded)

# Cartel Gil Rush Rulebook QA

final result: passed

## Source and evidence

- Source visual truth: the user's inline Quick start / Board moods screenshot, 1505 by 1045 pixels. The reference was supplied in the conversation without a local file path and was reviewed directly.
- Approved wording change: "Board moods apply from round 4." The screenshot's alternative wording about earlier rounds was not copied.
- Final desktop capture: `.codex/cartel-gil-rush/rulebook-desktop.png`; normalized event-canvas view: `.codex/cartel-gil-rush/rulebook-comparison.png`.
- Focused mood-panel capture: `.codex/cartel-gil-rush/rulebook-moods-detail.png`; mobile capture: `.codex/cartel-gil-rush/rulebook-mobile.png`.
- Desktop CSS viewport 1520 by 1093, yielding a 1505px content canvas beside the scrollbar. The retained app toolbar occupies 48px above the event. Native capture was 1505 by 1082; normalized uniformly to CSS width and cropped below the toolbar to 1505 by 1045 for comparison. Mobile CSS viewport was 390 by 844, with 375px document width and no horizontal overflow.
- State: existing development Underpaw session, Rulebook / Quick start, dark theme. The global app sidebar was collapsed for the desktop reference comparison. It remains available as part of the existing app shell.

## Full-view and focused comparison

The source and implementation were reviewed at the overall page level and in the mood panel / numbered-step regions. Header, rail, title, amber notice, connected three-step sequence, violet example, mood summary and full-width finishing footer follow the reference hierarchy. The chapter rail occupies 220px; the mood panel measured approximately 515px wide, beginning at x=970, close to the reference x=973. Quick start aligns near x=272 and the content begins at the reference's approximate y=169 after excluding the global app toolbar.

The screenshot's round-4 rule was explicitly confirmed by the user. Game now presents a neutral banner before round 4, retaining the preselected first mood; round 4 enables its coloured active banner. Returning to an earlier round retains that selection while making it inactive. The event schema, saved order, roster, auth and Firebase operations are unchanged.

## Findings and iteration history

1. [P2, resolved] Initial finishing footer fell below the reference-sized viewport. Removed redundant bottom padding and tightened the example/footer spacing. Final capture includes the finishing description and Next action, without clipping controls.
2. [P2, resolved] Long chapter labels wrapped unnecessarily. Reduced local rail padding/text sizing so all five labels fit while preserving accessible button targets and chapter selection.
3. [P2, resolved] Initial mobile header squeezed the event title beside Back to game. Made the brand occupy its own mobile row; the corrected mobile capture shows the complete title and usable navigation.
4. [P2, resolved] Game and host instructions initially still implied a mood applied at the start. Added the shared round-4 threshold, neutral early-round banner and consistent setup/host wording. Browser and regression tests verify the boundary and retained selection.

Post-fix evidence is the final desktop, focused mood-panel and mobile captures above. No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- Typography: existing Nunito/Nunito Sans retained. Quick start uses a 56px wide-desktop heading; supporting body text scales from 18px desktop to readable mobile sizes. Number badges, uppercase step headings and mood names reproduce the intended hierarchy.
- Spacing/layout: two-column content beside the persistent rail, one framed mood summary, light row dividers, connected step badges and an open footer. Mobile stacks content, replaces the rail with the chapter selector and keeps Next reachable.
- Colours/tokens: theme-aware dark/light surfaces, bright amber selected navigation/notice/icons and yellow, blue, violet, red mood accents. No global theme-token changes.
- Image/icon quality: existing cat artwork reused; the reference's standard symbols use the repository's Lucide icons. No new raster assets, placeholder images, CSS illustrations or custom SVG drawings were added. Connector lines and badge borders are normal UI decoration.
- Copy/content: the exact approved round-4 message appears in Rulebook and Game. Tile rewards, non-chaining movement, fixed order, three finishers and retained gil remain documented. The screenshot's /Random capitalization is normalized to the actual /random command.

## Interaction and checks

- Desktop and 390px mobile inspected. Next: Tiles & movement opens the correct chapter; the cream tile cards remain intact. Switching Game / Rulebook preserves the selected chapter and event data.
- Browser verified neutral round 1, selected yellow becoming active at round 4, then moving back to round 1 without losing it. No player-turn selection or turn-progression controls were introduced.
- Sixteen focused tests, feature ESLint and production build passed. No new network operations or Firebase cost impact.
- The old verification tab stopped responding during responsive capture; a fresh tab in the same browser recovered verification. This did not require an application workaround or code change.

## Follow-up polish

- [P3] Standard Lucide dice/star/user shapes differ slightly from the screenshot's illustrated or filled symbols; layout, colour and meaning are preserved.
- [P3] The screenshot's finishing/footer spacing differs by roughly a dozen pixels, partly because approved copy differs. All content and controls fit at the reference size.

---

## Previous Game view QA (preserved)

# Cartel Gil Rush reference implementation QA

final result: passed

## Source and evidence

- Source visual truth: the user's inline Cartel Gil Rush screenshot in this conversation, 1586 by 992 pixels. No filesystem path was supplied for the attachment; it was reviewed directly as the visual reference.
- Implementation: `/cartel-gil-rush` in the existing React app, run locally with stub data and the development Underpaw persona. No production event state was used.
- Desktop screenshot: `.codex/cartel-gil-rush/reference-layout-final.png`.
- Normalized event-canvas screenshot: `.codex/cartel-gil-rush/reference-layout-comparison.png`.
- Focused mood-banner evidence: `.codex/cartel-gil-rush/reference-layout-banner.png`.
- Mobile evidence: `.codex/cartel-gil-rush/reference-layout-mobile.png`, plus the corrected mobile header and banner screenshots displayed during verification.
- Desktop CSS viewport: 1601 by 1040. The 15px page scrollbar leaves a 1586px event canvas; the existing global toolbar occupies 48px above the event. Native capture was 1586 by 1030; normalized to the CSS viewport, then cropped below that toolbar to 1586 by 992. Source and implementation were compared at the event-canvas level rather than treating the retained app chrome as design drift.
- State: dark theme, live solo event, yellow Lucky Sixes, round 1, five saved test participants including an unusually long guest name. The reference's ten names and inconsistent three-player header count are illustration data, not the current saved event.

## Comparison and intentional differences

The supplied source and rendered captures were reviewed for the full composition and focused banner/roster/header details. The final desktop has the source's compact header and tabs, left roster rail, large main heading, dominant yellow mood banner, upper-right round/mood context and illustrated seven-tile reference row.

The user explicitly excluded selecting whose turn it is. Existing agreed scope also keeps only mood and round editable during play. Therefore no roster entry is highlighted as current, and there is no named current-player prompt, turn-progress timeline, remaining-turn counter, Finish turn action or next-player card. An event heading and manual-host guidance occupy that area. These are intentional product differences, not missing controls. The existing app sidebar remains available; collapsing it exposes the wider event canvas shown in the reference.

## Findings and fixes

1. [P2, resolved] Initial banner was about 208px tall and its summary wrapped unnecessarily. Replaced the display summary with concise rule text and adjusted padding/icon sizing. Final banner is 166px tall, matching the source's approximate 166px.
2. [P2, resolved] Initial mobile toolbar squeezed player count into multiple lines beside the title. Made title and toolbar full-width mobile rows and kept the count together. Corrected 390px screenshots show no horizontal page overflow or clipped controls.
3. [P2, resolved] Initial wide rail was 320px and tabs began too far left. Set the wide rail to 347px and increased header spacing/tab text. Final banner begins at CSS x=379, versus approximately x=380 in the reference, with a 1175px width.
4. [P2, resolved] Full-height round trigger pushed the main heading/banner lower than the reference. Retained mobile touch sizing and compacted the desktop trigger; the banner now begins at event-relative y=312, versus approximately y=310 in the source.

Post-fix evidence is the final normalized desktop capture and banner crop, alongside the mobile captures. No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- Fonts/typography: existing Nunito heading and Nunito Sans body families preserved; the browser confirms Nunito for the title. Header title 32px on wide desktop, mood title 46px, readable 14 to 20px supporting text. Long player names wrap rather than disappear.
- Spacing/layout: 84px desktop feature header, 347px wide roster rail, 32px main inset and 166px yellow banner closely follow source proportions. Source turn-management content is intentionally removed. Mobile uses the horizontal order strip, stacked banner action and a two-column tile grid.
- Colours/tokens: dark app surface and blue-tinted roster/reference headings retained; yellow banner is RGB 255/211/49 with dark text. Other mood backgrounds use readable blue, violet and red tints. Light theme keeps the same coloured banner with dark text and existing theme tokens elsewhere.
- Image quality: six real transparent raster illustrations are bundled at 192px square, used at 48 to 96px; all checked image elements loaded successfully. Brand cat is reused. No generated UI screenshot, custom SVG drawing or CSS illustration is shipped. Standard arrows/controls use the existing Lucide library.
- Copy/content: solo, 90-tile rules retained; payout summaries show challenge wins of 200k. Full mood restrictions remain below the banner and full tile rules remain in Rulebook's cream cards. No player-turn UI is implied.

## Interaction and verification

- Browser checked player order, long-name wrapping, desktop/mobile layout, horizontal keyboard scrolling, manual round popover, yellow/violet mood changes, Game / Rulebook navigation and light/dark theme rendering.
- Saved order, player snapshots, manual round and mood continue using the existing event controller; no schema or Firebase behaviour changes were made by this visual pass.
- Fifteen focused model/storage/access/render/animation tests and feature ESLint passed. App production build passed.
- Console reviewed: repeated browser-extension asynchronous-message-channel errors appeared; no application exception was observed during the tested interactions.

## Follow-up polish

- [P3] Generated illustrations intentionally match the source's subject and sticker style rather than claiming pixel-identical artwork. The red arrow uses the existing icon library.
- [P3] User-supplied screenshot is inline only; an exported source asset could support a future automated pixel-diff comparison. This pass used direct visual comparison and measured implementation geometry.

## Implementation checklist

- [x] Reference layout implemented within existing app shell.
- [x] Turn selection and turn-progression UI omitted.
- [x] Mood and round controls remain independent and functional.
- [x] Cream special-tile rulebook cards preserved.
- [x] Desktop/mobile and themes checked, image assets optimized, checks passed.

---

## Previous QA report (preserved)

# Collection comparison QA

Date: 15 October 2026. Scope: mounts, minions, titles, achievements, and the shared MemberPicker presentation.

## Visual evidence

- Source: `C:/Users/DARWI/.codex/generated_images/01a13d2e-61ff-7722-bd4d-5e68e0ee7c9b/exec-fb614a8c-9e04-4faf-b8b2-4575091f4397.png` (1586 x 992).
- Primary implementation: `.codex/collection-qa/reference-state.jpg` (1571 x 1017 full-page capture; 1586 x 992 CSS viewport, DPR 1). Dark achievements with eight manually selected fictional members. Selection above eight was verified separately.
- Category evidence: `.codex/collection-qa/desktop-dark-{mounts,minions,titles,achievements}.jpg`.
- Responsive evidence: `.codex/collection-qa/mobile-light-{mounts,minions,titles,achievements}.jpg`, `mobile-dark-{mounts,minions,titles,achievements}.jpg`, `mobile-picker.jpg`, and `mobile-320.jpg` in the same directory.
- Scrolling evidence: `desktop-sticky.jpg` and `large-light-end.jpg`; loading evidence: `loading.jpg`.
- Desktop viewport: 1586 x 992. Mobile viewports: 390 x 844 and 320 x 720. Browser captures sometimes omit scrollbar gutters or differ from CSS viewport dimensions. Compared app-owned regions at native CSS scale; no image rescaling or generated assets were used.
- The reference and implementation were opened together for full-view comparison. Toolbar, member headers, first column, and ownership indicators were readable in these images; a separate focused crop was unnecessary. Dedicated mobile-picker and sticky-scroll captures cover the important interaction details.

## Fidelity review

- Typography: retained existing Nunito/Nunito Sans theme. Category heading, compact controls, small member headings, and tabular totals follow the reference hierarchy. Long names wrap rather than being silently truncated.
- Spacing/layout: grouped toolbar, category switching, visible ownership filters, result line, dense bordered matrix, and ownership legend match the approved direction. The existing app sidebar, shared FC Collection heading/navigation/scope, and catalog-sync placement remain intact as required. These intentionally move the matrix lower than the reference.
- Tokens: semantic light/dark surfaces and borders; existing warm primary accent; green checks and visible dashes provide ownership cues with text alternatives. No global tokens changed.
- Assets: real stored item/avatar URLs remain authoritative. Local fixtures used existing fat-cat artwork solely as clearly fictional test data. Missing and broken avatars/icons received fallbacks. No mockup character names, totals, or ownership values were copied.
- Copy: counts come from current catalog/selection. The final column says Owned by selected. Dialog instruction refers to the existing detail dialog; no external-navigation icons or new sorts were added.
- Responsive behavior: controls wrap, all three ownership choices remain visible, and the matrix stays available on narrow screens. The first item column remains sticky while members can scroll horizontally.

## Findings and fixes

1. P2: unbroken member names overflowed the mobile picker. Added a constrained dialog width, explicit grid tracks, and wrapping that reduces intrinsic width. Rechecked dialog content width against scroll width (both 356 px at the tested 390 px viewport). Evidence: `mobile-picker.jpg`.
2. P2: growing source-count text could move the toolbar/popover on mobile. Fixed trigger width, explicit checkbox-label association, and mobile toolbar spacing. Rechecked keyboard Space/Escape, multi-source selection, and readable expansion text. Evidence: final dark mobile category screenshots.
3. P2: original matrix sizing could put its horizontal scrollbar below the desktop viewport. Adjusted its bounded height while retaining a 20 rem minimum for mobile. Rechecked both sticky axes and the final catalog row. Evidence: `desktop-sticky.jpg`, `large-light-end.jpg`.

No actionable P0/P1/P2 findings remain. The preserved shared shell and real-data differences are intentional, not reference drift to fix.

## Interaction checks

- Ordinary stubs: case-insensitive search; empty search results; ascending name and patch sorting; ARR/HW expansion selection; Quest/Trial OR matching and Clear; all three ownership filters; all four category links; empty title/achievement catalogs; existing mount detail dialog.
- Browser-local fictional cache: populated catalogs for all four categories, 24 tracked members including three Friends, long and unbroken names, missing/broken images, optional metadata, and a 2,325-row achievement catalog. Shared source and loader files were not modified.
- Member picker: default all in comparison; draft Cancel; partial Apply; reload persistence; Clear then Apply restores all; Select all normalization; ten-member selection succeeds; Friend selection prunes on FC scope switch.
- Denominators: a filtered one-result view retained a full-catalog member total of 17/48. Ownership summaries and quick filters used visible selected members. With an empty roster, both Nobody has and Everyone has retained all 48 rows, preserving existing every/some semantics.
- Matrix: keyboard focus, PageDown, Control+End, horizontal arrow keys, vertical scrolling, opaque sticky first column/header intersection. Large fixture reached scrollTop 95011 (the maximum), scrollLeft 1860, final item 2325, and summary 7/21.
- Dialogs: all categories opened existing metadata dialogs; mount movement/seats, achievement points, optional image/description, missing optional fields, Escape/Close, and focus return were exercised. No external navigation added.
- Mount Roulette: empty initial draft with defaultToAll=false, Cancel, partial Apply, Select all normalization back to an empty stored set, and Clear/Apply all verified.
- Loading: actual CollectiblePage mounted under an isolated collection context with loading=true. Category navigation remained present alongside loading text and skeletons.
- Reduced motion: actual comparison components mounted with a controlled matchMedia preference. Summary bar immediately reached 100%, row transform/count opacity stayed unset, and changing filters remained functional. OS-level CSS preference switching was not exercised.

## Checks and limitations

- `npm run build`: passed; Vite reports chunks larger than 500 kB. No bundle restructuring was included.
- `npx eslint src/features/fc-collection`: passed.
- `node --test tests/fc-collection-routing.test.mjs`: passed, 3 tests.
- `git diff --check`: passed; Git emitted existing LF/CRLF conversion notices.
- `graphify update .`: passed; 2,919 nodes, 5,785 edges, 184 communities. Graphify backed up the curated graph and warned that five JSON/config/data files produced no AST nodes.
- Local preview: `http://127.0.0.1:5175/fc-collection/collections/mounts`, launched with process-only VITE_USE_STUBS=true.
- Browser checks used Chrome because the in-app browser was unavailable. Browser console inspection showed message-channel listener errors on Mount Roulette without a component stack. Their origin was not established; no application exception or failed picker behavior was observed.
- The large unvirtualized matrix caused some browser automation calls to time out; focused DOM selectors and subsequent state reads confirmed filtering and scrolling completed. This is functional scale coverage, not a performance benchmark.
- Production Firebase, upstream imagery, and backend failure handling were not exercised. Loader, Firebase paths, caches, routes, calculations, and request behavior remain unchanged by source inspection; no network-budget instrumentation was added.
- Temporary fixture pages were removed, fictional cache/selection data cleared, and ordinary stubs restored before handoff. Screenshots remain local ignored artifacts under `.codex/collection-qa/`.
- No commit or deployment.

## Compact-header follow-up

- Moved the small category icon, heading, and catalog count to the right of category links in one fixed 40 px row. Removed the tracked-member count from this heading. Narrow-screen category links scroll without wrapping or increasing row height.
- Raised only this matrix's horizontal scrollbar to z-index 40 with an opaque background. Browser computed styles confirmed it is above the sticky corner header at 30.
- Rechecked desktop and 390 px mobile layout, no page overflow, and keyboard category switching to Achievements. Evidence: `.codex/collection-qa/compact-header-desktop.jpg` and `compact-header-mobile.jpg`.
- Production build and targeted lint of CollectiblePage.tsx / CollectibleGrid.tsx passed. Existing bundle-size warning remains. Refreshed Graphify after these changes.

final result: passed
