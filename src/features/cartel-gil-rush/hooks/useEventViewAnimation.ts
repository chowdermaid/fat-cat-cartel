import { useLayoutEffect, useRef } from "react";
import { animate } from "motion/mini";
import { stagger } from "motion";
import type { EventView, Mood } from "../types";

function reveal(elements: HTMLElement[], staggered = false) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!elements.length || media.matches) return;
  const opacity = elements.map(element => element.style.opacity);
  const animation = animate(elements, { opacity: [0, 1] }, {
    duration: 0.2,
    ease: "easeOut",
    delay: staggered ? stagger(0.025) : 0,
  });
  const restore = () => {
    animation.cancel();
    elements.forEach((element, index) => { element.style.opacity = opacity[index]; });
  };
  const handleMotionChange = () => { if (media.matches) restore(); };
  media.addEventListener("change", handleMotionChange);
  return () => { restore(); media.removeEventListener("change", handleMotionChange); };
}

export function useEventViewAnimation(view: EventView, mood: Mood | null = null) {
  const ref = useRef<HTMLElement>(null);
  const previousMood = useRef(mood);

  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>(`[data-event-view="${view}"]`);
    if (!panel) return;
    const visible = Array.from(panel.querySelectorAll<HTMLElement>("[data-event-reveal]")).filter(element => {
      const bounds = element.getBoundingClientRect();
      const clip = element.closest("[data-radix-scroll-area-viewport]")?.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0
        && bounds.bottom > Math.max(0, clip?.top ?? 0)
        && bounds.top < Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight)
        && bounds.right > Math.max(0, clip?.left ?? 0)
        && bounds.left < Math.min(window.innerWidth, clip?.right ?? window.innerWidth);
    }).slice(0, 12);
    return reveal([panel, ...visible], true);
  }, [view]);

  useLayoutEffect(() => {
    const changed = previousMood.current !== mood;
    previousMood.current = mood;
    if (!changed || view !== "game") return;
    const content = ref.current?.querySelector<HTMLElement>("[data-event-mood-content]");
    return content ? reveal([content]) : undefined;
  }, [view, mood]);

  return ref;
}
