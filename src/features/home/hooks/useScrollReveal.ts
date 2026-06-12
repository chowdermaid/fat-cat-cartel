import { useEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";

export function useScrollReveal(
  ref: RefObject<HTMLElement | HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!ref.current) return;

    const items = Array.from(ref.current.querySelectorAll(".gazette-reveal"));
    if (items.length === 0) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      items.forEach((item) => {
        (item as HTMLElement).style.opacity = "1";
        (item as HTMLElement).style.transform = "none";
      });
      return;
    }

    items.forEach((item) => {
      (item as HTMLElement).style.opacity = "0";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          observer.unobserve(target);

          animate(target, {
            opacity: [0, 1],
            translateY: [18, 0],
            rotate: [target.dataset.revealRotate ?? "0deg", "0deg"],
            duration: 520,
            easing: "easeOutQuart",
          });

          const clippings = target.querySelectorAll(".gazette-clipping");
          if (clippings.length > 0) {
            animate(clippings, {
              opacity: [0, 1],
              translateY: [12, 0],
              delay: stagger(70, { start: 120 }),
              duration: 360,
              easing: "easeOutQuad",
            });
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.14 },
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [ref]);
}
