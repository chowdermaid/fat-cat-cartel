import { useLayoutEffect, useRef } from "react";
import { animate } from "animejs";
import type { EventView } from "../types";

export function useEventViewAnimation(view: EventView) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>(`[data-event-view="${view}"]`);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!panel || media.matches) return;

    const animation = animate(panel, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 220,
      ease: "outQuad",
    });
    const handleMotionChange = () => { if (media.matches) animation.revert(); };
    media.addEventListener("change", handleMotionChange);
    return () => {
      animation.revert();
      media.removeEventListener("change", handleMotionChange);
    };
  }, [view]);

  return ref;
}
