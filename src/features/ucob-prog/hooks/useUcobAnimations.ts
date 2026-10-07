import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { animate } from "animejs";

export function useUcobEntrance<T extends HTMLElement>(enabled = true, delay = 0) {
  const ref = useRef<T>(null);
  const revealed = useRef(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled || revealed.current) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      revealed.current = true;
      return;
    }
    const originalOpacity = element.style.opacity;
    const originalTransform = element.style.transform;
    const restore = () => {
      element.style.opacity = originalOpacity;
      element.style.transform = originalTransform;
    };
    element.style.opacity = "0";
    let animation: ReturnType<typeof animate> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      revealed.current = true;
      observer.disconnect();
      if (!media.matches) {
        animation = animate(element, { opacity: [0, 1], translateY: [8, 0], delay, duration: 320, ease: "outQuad" });
      } else restore();
    });
    const stop = () => {
      revealed.current = true;
      observer.disconnect();
      animation?.revert();
      restore();
    };
    const handleMotionChange = () => { if (media.matches) stop(); };
    observer.observe(element);
    media.addEventListener("change", handleMotionChange);
    return () => {
      observer.disconnect();
      animation?.revert();
      restore();
      media.removeEventListener("change", handleMotionChange);
    };
  }, [enabled, delay]);

  return ref;
}

export function useUcobTextChange<T extends HTMLElement>(value: string, enabled = true): RefObject<T | null> {
  const ref = useRef<T>(null);
  const previous = useRef<string | undefined>(undefined);

  useEffect(() => {
    const changed = previous.current !== undefined && previous.current !== value;
    previous.current = enabled ? value : undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!ref.current || !enabled || !changed || media.matches) return;
    const animation = animate(ref.current, { opacity: [0.5, 1], duration: 180, ease: "outQuad" });
    const handleMotionChange = () => { if (media.matches) animation.revert(); };
    media.addEventListener("change", handleMotionChange);
    return () => {
      animation.revert();
      media.removeEventListener("change", handleMotionChange);
    };
  }, [value, enabled]);

  return ref;
}

export function useUcobNumberAnimation(
  value: number | null,
  render: (value: number | null) => void,
  duration: number,
) {
  const previous = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (value === null || from == null || from === value || media.matches) {
      render(value);
      return;
    }
    const displayed = { value: from };
    render(from);
    const animation = animate(displayed, {
      value,
      duration,
      ease: "outQuad",
      onUpdate: () => render(displayed.value),
    });
    const finish = () => {
      animation.revert();
      render(value);
    };
    const handleMotionChange = () => { if (media.matches) finish(); };
    media.addEventListener("change", handleMotionChange);
    return () => {
      finish();
      media.removeEventListener("change", handleMotionChange);
    };
  }, [value, render, duration]);
}
