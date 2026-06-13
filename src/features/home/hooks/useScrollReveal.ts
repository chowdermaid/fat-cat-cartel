import { useEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";

export function useScrollReveal(
  ref: RefObject<HTMLElement | HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!ref.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function revealImmediately(item: Element) {
      (item as HTMLElement).style.opacity = "1";
      (item as HTMLElement).style.transform = "none";
    }

    if (reduceMotion) {
      function revealAllItems() {
        ref.current?.querySelectorAll(".gazette-reveal").forEach((item) => {
          revealImmediately(item);
          item.querySelectorAll(".gazette-clipping").forEach(revealImmediately);
        });
      }

      revealAllItems();

      const mutationObserver = new MutationObserver(revealAllItems);
      mutationObserver.observe(ref.current, {
        childList: true,
        subtree: true,
      });

      return () => mutationObserver.disconnect();
    }

    const observedItems = new WeakSet<Element>();
    const revealedItems = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          observer.unobserve(target);
          revealedItems.add(target);

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

    function observeNewItems() {
      ref.current?.querySelectorAll(".gazette-reveal").forEach((item) => {
        if (observedItems.has(item) || revealedItems.has(item)) return;
        observedItems.add(item);
        (item as HTMLElement).style.opacity = "0";
        observer.observe(item);
      });
    }

    observeNewItems();

    const mutationObserver = new MutationObserver(observeNewItems);
    mutationObserver.observe(ref.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);
}
