import type { WheelEvent } from "react";
import { SCROLL_AREA_VIEWPORT_SELECTOR } from "../constants";

export function handleNestedScrollAreaWheel(event: WheelEvent<HTMLDivElement>) {
  const viewport = event.currentTarget.querySelector<HTMLElement>(
    SCROLL_AREA_VIEWPORT_SELECTOR,
  );
  if (!viewport) return;

  const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
  if (maxScrollTop <= 0) return;

  let deltaY = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) deltaY *= 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    deltaY *= viewport.clientHeight;
  }

  const nextScrollTop = Math.min(
    Math.max(viewport.scrollTop + deltaY, 0),
    maxScrollTop,
  );

  if (nextScrollTop === viewport.scrollTop) return;

  viewport.scrollTop = nextScrollTop;
  event.preventDefault();
  event.stopPropagation();
}