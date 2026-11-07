import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import type { AnimationParams } from "animejs";
import { animate as fade } from "motion/mini";
import { stagger as fadeStagger } from "motion";
import type { EventView } from "../types";

const gameAnimations: Record<string, AnimationParams> = {
  "chest-opening": { rotate: [0, -5, 5, -3, 0], translateY: [0, -5, 0], scale: [1, 1.08, 1], duration: 1600, ease: "inOutSine" },
  "chest-player": { opacity: [0, 1], translateY: [12, 0], duration: 850, ease: "outCubic" },
  "chest-prize": { opacity: [0, 1], translateY: [14, 0], scale: [0.9, 1], duration: 1150, ease: "outQuint" },
  "split-panel": { opacity: [0, 1], translateY: [12, 0], duration: 650, ease: "outCubic" },
  "split-header": { opacity: [0, 1], translateY: [8, 0], duration: 650, ease: "outCubic" },
  "split-portrait": { opacity: [0, 1], translateY: [10, 0], duration: 650, ease: "outCubic" },
  "split-decision": { opacity: [0, 1], translateY: [10, 0], scale: [0.94, 1], duration: 950, delay: stagger(120, { start: 550 }), ease: "outQuint" },
  "split-payout": { opacity: [0, 1], translateY: [14, 0], scale: [0.94, 1], duration: 1050, delay: stagger(120, { start: 1550 }), ease: "outQuint" },
  "split-celebration": { opacity: [0, 0.8, 0], scale: [0.7, 1.25], rotate: [-8, 8], duration: 1600, delay: stagger(120, { start: 1300 }), ease: "outSine" },
  "split-receipt": { opacity: [0, 1], translateY: [6, 0], duration: 600, delay: 2300, ease: "outCubic" },
};

function isVisible(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  const clip = element.closest("[data-radix-scroll-area-viewport]")?.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0
    && bounds.bottom > Math.max(0, clip?.top ?? 0)
    && bounds.top < Math.min(window.innerHeight, clip?.bottom ?? window.innerHeight)
    && bounds.right > Math.max(0, clip?.left ?? 0)
    && bounds.left < Math.min(window.innerWidth, clip?.right ?? window.innerWidth);
}

function animateGame(panel: HTMLElement) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.matches) return;
  let previous = new Map<HTMLElement, string>();
  const animations = new Set<ReturnType<typeof animate>>();
  let frame: number | undefined;
  let disposed = false;
  const stop = () => { animations.forEach(animation => animation.revert()); animations.clear(); };
  const scan = () => {
    frame = undefined;
    if (disposed || media.matches) return;
    const next = new Map(Array.from(panel.querySelectorAll<HTMLElement>("[data-game-transition]")).map(element => [element, element.getAttribute("data-game-transition") ?? ""]));
    const changed = Array.from(next.keys()).filter(element => previous.get(element) !== next.get(element) && isVisible(element));
    previous = next;
    const targets = changed.filter(element => !changed.some(parent => parent !== element && parent.contains(element))).slice(0, 18);
    for (const running of animations) {
      if (running.targets.some(target => !panel.contains(target as HTMLElement))) {
        running.revert();
        animations.delete(running);
      }
    }
    if (!targets.length) return;
    const groups = new Map<string, HTMLElement[]>();
    for (const target of targets) {
      const kind = next.get(target)!.split(":")[0];
      const profile = gameAnimations[kind] ? kind : "default";
      groups.set(profile, [...(groups.get(profile) ?? []), target]);
    }
    for (const [profile, group] of groups) {
      for (const running of animations) {
        if (running.targets.some(target => group.some(element => element === target || element.contains(target as HTMLElement) || (target as HTMLElement).contains(element)))) {
          running.revert();
          animations.delete(running);
        }
      }
      const parameters = gameAnimations[profile] ?? { opacity: [0, 1], translateY: [6, 0], duration: 280, ease: "outQuad" };
      const animation = animate(group, {
        ...parameters,
        delay: parameters.delay ?? stagger(profile === "default" ? 25 : 90),
        onComplete: self => { self.revert(); animations.delete(self); },
      });
      animations.add(animation);
    }
  };
  // Watch explicit state tokens and inserted reveals, not animation styles or form drafts.
  const observer = new MutationObserver(() => {
    if (!disposed && !media.matches && frame === undefined) frame = window.requestAnimationFrame(scan);
  });
  observer.observe(panel, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-game-transition"] });
  const cancelFrame = () => { if (frame !== undefined) window.cancelAnimationFrame(frame); frame = undefined; };
  const handleMotionChange = () => { if (media.matches) { cancelFrame(); stop(); } };
  media.addEventListener("change", handleMotionChange);
  scan();
  return () => {
    disposed = true;
    observer.disconnect();
    cancelFrame();
    stop();
    previous.clear();
    media.removeEventListener("change", handleMotionChange);
  };
}

function reveal(elements: HTMLElement[], staggered = false) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!elements.length || media.matches) return;
  const opacity = elements.map(element => element.style.opacity);
  const animation = fade(elements, { opacity: [0, 1] }, {
    duration: 0.2,
    ease: "easeOut",
    delay: staggered ? fadeStagger(0.025) : 0,
  });
  const restore = () => {
    animation.cancel();
    elements.forEach((element, index) => { element.style.opacity = opacity[index]; });
  };
  const handleMotionChange = () => { if (media.matches) restore(); };
  media.addEventListener("change", handleMotionChange);
  return () => { restore(); media.removeEventListener("change", handleMotionChange); };
}

export function useEventViewAnimation(view: EventView) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>(`[data-event-view="${view}"]`);
    if (!panel) return;
    if (view === "game") return animateGame(panel);
    const visible = Array.from(panel.querySelectorAll<HTMLElement>("[data-event-reveal]")).filter(isVisible).slice(0, 12);
    return reveal([panel, ...visible], true);
  }, [view]);

  return ref;
}
