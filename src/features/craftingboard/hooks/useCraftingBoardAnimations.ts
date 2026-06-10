import { type RefObject, useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import type { CraftingRequestDashboardData, CraftingRequestDashboardRecord } from "../types";

export function useCraftingBoardAnimations(
  pageRef: RefObject<HTMLDivElement | null>,
  data: CraftingRequestDashboardData,
  loading: boolean,
) {
  const requestStatusRef = useRef<Map<
    string,
    CraftingRequestDashboardRecord["status"]
  > | null>(null);

  useEffect(() => {
    if (!pageRef.current || loading) return;

    animate(pageRef.current.querySelectorAll(".crafting-section"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(70),
      duration: 350,
      easing: "easeOutQuad",
    });
  }, [loading, pageRef]);

  useEffect(() => {
    if (!pageRef.current || loading) return;

    const current = new Map<string, CraftingRequestDashboardRecord["status"]>();
    for (const request of [
      ...data.open,
      ...data.inProgress,
      ...data.completed,
    ]) {
      current.set(request.id, request.status);
    }

    if (!requestStatusRef.current) {
      requestStatusRef.current = current;
      return;
    }

    const changedIds = Array.from(current.entries())
      .filter(([id, status]) => requestStatusRef.current?.get(id) !== status)
      .map(([id]) => id);

    if (changedIds.length > 0) {
      animate(
        changedIds
          .map((id) =>
            pageRef.current?.querySelector(`[data-request-id="${id}"]`),
          )
          .filter(Boolean),
        {
          opacity: [0, 1],
          scale: [0.97, 1],
          translateY: [12, 0],
          duration: 420,
          easing: "easeOutBack",
        },
      );
    }

    requestStatusRef.current = current;
  }, [data.open, data.inProgress, data.completed, loading, pageRef]);
}
