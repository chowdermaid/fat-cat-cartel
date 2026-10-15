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
