import { useEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";

export function useCalendarAnimations({
  loading,
  pageRef,
  visibleMonth,
}: {
  loading: boolean;
  pageRef: RefObject<HTMLDivElement | null>;
  visibleMonth: Date;
}) {
  useEffect(() => {
    if (!pageRef.current || loading) return;
    animate(pageRef.current.querySelectorAll(".calendar-cell"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(8),
      duration: 220,
      easing: "easeOutQuad",
    });
  }, [loading, pageRef, visibleMonth]);
}
