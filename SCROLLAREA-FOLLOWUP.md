# ScrollArea Follow-Up

## Context

Meowket Board cart scrolling broke inside a popover when Radix ScrollArea was used with only `max-height` on the root. This has happened in other components too.

Current shared `ScrollArea` now supports:

```tsx
<ScrollArea
  className="max-h-64 min-h-0 min-w-0"
  viewportClassName="max-h-64"
>
  ...
</ScrollArea>
```

## Likely Cause

The shared shadcn ScrollArea uses:

```tsx
<Root className="relative overflow-hidden">
  <Viewport className="h-full w-full" />
</Root>
```

When the root only has `max-height`, or lives inside nested grids/popovers/flex layouts without `min-h-0` / `min-w-0`, the viewport may not get a usable scrollable size. Result: clipped content, no vertical scroll, or broken nested scroll.

## Future Cleanup

- Audit ScrollArea usage in popovers, dialogs, side panels, and nested grid/flex layouts.
- Prefer explicit root and viewport constraints for designed scroll regions.
- Add `min-h-0 min-w-0` to parents/scroll roots inside grid or flex containers.
- Avoid relying on root `max-height` alone when the viewport still has `h-full`.
- Keep horizontal scroll intentional; for item rows prefer truncation plus tooltip.

## Known Good Pattern

```tsx
<ScrollArea
  className="max-h-[80vh] min-h-0 min-w-0"
  viewportClassName="max-h-[80vh]"
>
  <div className="min-w-0">
    ...
  </div>
</ScrollArea>
```

