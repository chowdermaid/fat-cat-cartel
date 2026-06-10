import { type RefObject, useEffect } from "react";
import { animate, stagger } from "animejs";

export function useMembersGridAnimation(
  pageRef: RefObject<HTMLDivElement | null>,
  totalCount: number,
) {
  useEffect(() => {
    if (!pageRef.current || totalCount === 0) return;
    animate(pageRef.current.querySelectorAll(".member-card"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(35),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [pageRef, totalCount]);
}
