import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useEntranceAnimation<T extends HTMLElement>(
  deps: readonly unknown[],
  options: { duration?: number; translateY?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [options.translateY ?? 8, 0],
      duration: options.duration ?? 300,
      easing: "easeOutQuad",
    });
  }, deps);

  return ref;
}

export function useStaggeredEntrance<T extends HTMLElement>(
  selector: string,
  deps: readonly unknown[],
  options: { delayStep?: number; duration?: number; translateY?: number } = {},
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const targets = ref.current.querySelectorAll(selector);
    if (targets.length === 0) return;
    animate(targets, {
      opacity: [0, 1],
      translateY: [options.translateY ?? 8, 0],
      delay: stagger(options.delayStep ?? 50),
      duration: options.duration ?? 300,
      easing: "easeOutQuad",
    });
  }, deps);

  return ref;
}
