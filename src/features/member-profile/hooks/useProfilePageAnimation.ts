import { type RefObject, useEffect } from "react";
import { animate, stagger } from "animejs";

export function useProfilePageAnimation(
  pageRef: RefObject<HTMLDivElement | null>,
  loading: boolean,
) {
  useEffect(() => {
    if (loading || !pageRef.current) return;
    animate(pageRef.current.querySelectorAll(".anim-section"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80),
      duration: 380,
      easing: "easeOutQuart",
    });
  }, [loading, pageRef]);
}
