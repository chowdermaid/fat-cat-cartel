import { useEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";

export function useHomeAnimations(
  ref: RefObject<HTMLElement | HTMLDivElement | null>,
  selector: string,
  translateYFrom: number,
  translateYTo: number,
  delayMs: number,
  durationMs: number,
) {
  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(selector), {
      opacity: [0, 1],
      translateY: [translateYFrom, translateYTo],
      delay: stagger(delayMs),
      duration: durationMs,
      easing: "easeOutQuart",
    });
  }, [delayMs, durationMs, ref, selector, translateYFrom, translateYTo]);
}
