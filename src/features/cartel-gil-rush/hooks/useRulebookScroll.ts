import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { chapters } from "../presentation";
import type { RulebookChapter } from "../types";
import { getActiveChapter, getChapterScrollTop } from "../utils/rulebookScroll";

const viewportSelector = "[data-radix-scroll-area-viewport]";

export function useRulebookScroll(active: boolean) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef(0);
  const [activeChapter, setActiveChapter] = useState<RulebookChapter>("board-overview");

  useLayoutEffect(() => {
    if (!active) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(viewportSelector);
    const content = contentRef.current;
    if (!viewport || !content) return;

    viewport.tabIndex = 0;
    viewport.setAttribute("role", "region");
    viewport.setAttribute("aria-label", "Rulebook reading pane");
    const resizeReadingSpace = () => {
      const height = `${viewport.clientHeight}px`;
      if (content.style.getPropertyValue("--rulebook-viewport-height") !== height) content.style.setProperty("--rulebook-viewport-height", height);
    };
    resizeReadingSpace();
    viewport.scrollTop = savedScrollTop.current;
    let frame = 0;
    let disposed = false;

    const update = () => {
      frame = 0;
      if (disposed || !viewport.clientHeight) return;
      resizeReadingSpace();
      const origin = viewport.getBoundingClientRect().top;
      const positions = chapters.flatMap(({ id }) => {
        const heading = content.querySelector<HTMLElement>(`#rulebook-${id} h2`);
        return heading ? [{ id, top: heading.getBoundingClientRect().top - origin + viewport.scrollTop }] : [];
      });
      savedScrollTop.current = viewport.scrollTop;
      setActiveChapter(getActiveChapter(positions, viewport.scrollTop, viewport.clientHeight, viewport.scrollHeight));
    };
    const schedule = () => {
      if (disposed || !viewport.clientHeight) return;
      savedScrollTop.current = viewport.scrollTop;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    viewport.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(content);
    update();

    return () => {
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [active]);

  const navigateToChapter = useCallback((id: RulebookChapter) => {
    if (!active) return;
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(viewportSelector);
    const heading = contentRef.current?.querySelector<HTMLElement>(`#rulebook-${id} h2`);
    if (!viewport || !heading) return;
    const headingTop = heading.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    heading.focus({ preventScroll: true });
    viewport.scrollTo({
      top: getChapterScrollTop(headingTop, viewport.clientHeight, viewport.scrollHeight),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [active]);

  return { scrollAreaRef, contentRef, activeChapter, navigateToChapter };
}
