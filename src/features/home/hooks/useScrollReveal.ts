import { useEffect, type RefObject } from "react";
import { animate, stagger, type JSAnimation } from "animejs";

export function useScrollReveal(
  ref: RefObject<HTMLElement | HTMLDivElement | null>,
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const items = new Map<HTMLElement, { visible: boolean; animations: JSAnimation[] }>();
    const originalStyles = new Map<HTMLElement, { opacity: string; transform: string }>();

    function rememberStyle(item: HTMLElement) {
      if (!originalStyles.has(item)) {
        originalStyles.set(item, { opacity: item.style.opacity, transform: item.style.transform });
      }
    }

    function revealImmediately(item: HTMLElement) {
      rememberStyle(item);
      item.style.opacity = "1";
      item.style.transform = "none";
    }

    const observer = new IntersectionObserver((entries) => {
      if (media.matches) return;
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const state = items.get(target);
        if (!state) continue;
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.14;
        const leavingBelow = entry.boundingClientRect.top >= (entry.rootBounds?.top ?? 0);
        if ((!visible && !leavingBelow) || visible === state.visible) continue;
        state.visible = visible;

        if (visible && state.animations.length === 0) {
          state.animations.push(animate(target, {
            opacity: [0, 1],
            translateY: [18, 0],
            rotate: [target.dataset.revealRotate ?? "0deg", "0deg"],
            duration: 520,
            ease: "out(4)",
            autoplay: false,
          }));
          const clippings = target.querySelectorAll<HTMLElement>(".gazette-clipping");
          clippings.forEach(rememberStyle);
          if (clippings.length > 0) {
            state.animations.push(animate(clippings, {
              opacity: [0, 1],
              translateY: [12, 0],
              delay: stagger(70, { start: 120 }),
              duration: 360,
              ease: "out(2)",
              autoplay: false,
            }));
          }
        }
        for (const animation of state.animations) {
          if (visible) animation.play();
          else animation.reverse();
        }
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.14 });

    function observeNewItems() {
      for (const [item, state] of items) {
        if (root!.contains(item)) continue;
        observer.unobserve(item);
        state.animations.forEach((animation) => animation.revert());
        items.delete(item);
      }
      root!.querySelectorAll<HTMLElement>(".gazette-reveal").forEach((item) => {
        if (media.matches) {
          revealImmediately(item);
          item.querySelectorAll<HTMLElement>(".gazette-clipping").forEach(revealImmediately);
        } else if (!items.has(item)) {
          rememberStyle(item);
          items.set(item, { visible: false, animations: [] });
          item.style.opacity = "0";
          observer.observe(item);
        }
      });
    }

    function resetMotion() {
      observer.disconnect();
      for (const state of items.values()) state.animations.forEach((animation) => animation.revert());
      items.clear();
      observeNewItems();
    }

    observeNewItems();
    const mutationObserver = new MutationObserver(observeNewItems);
    mutationObserver.observe(root, { childList: true, subtree: true });
    media.addEventListener("change", resetMotion);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      media.removeEventListener("change", resetMotion);
      for (const state of items.values()) state.animations.forEach((animation) => animation.revert());
      for (const [item, style] of originalStyles) {
        item.style.opacity = style.opacity;
        item.style.transform = style.transform;
      }
    };
  }, [ref]);
}
