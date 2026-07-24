import { useCallback, useEffect, useRef } from "react";
import { animate, createScope, stagger } from "animejs";
import type { GameServerStatus } from "../types";

function reducedMotionPreferred(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function usePalworldServerAnimations(
  status: GameServerStatus | undefined,
  actionLoading: "start" | "stop" | null,
  connectionReady: boolean,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previousStatusRef = useRef<GameServerStatus | undefined>(undefined);

  useEffect(() => {
    if (!rootRef.current || reducedMotionPreferred()) return;

    const scope = createScope({ root: rootRef }).add(() => {
      animate(".pw-hero-art", {
        opacity: [0, 1],
        scale: [1.06, 1],
        duration: 900,
        ease: "out(4)",
      });
      animate(".pw-hero-reveal", {
        opacity: [0, 1],
        translateY: [14, 0],
        delay: stagger(70),
        duration: 520,
        ease: "out(4)",
      });
    });

    return () => scope.revert();
  }, []);

  useEffect(() => {
    if (!rootRef.current || reducedMotionPreferred() || !actionLoading) return;

    const scope = createScope({ root: rootRef }).add(() => {
      if (actionLoading === "start") {
        animate(".pw-server-control-button", {
          scale: [1, 0.84, 1.06, 1],
          duration: 520,
          ease: "out(4)",
        });
        animate(".pw-control-impact-ring", {
          scale: [0.72, 1.65],
          opacity: [0.65, 0],
          delay: stagger(90),
          duration: 720,
          ease: "out(3)",
        });
        animate(".pw-hero-start-flash", {
          opacity: [0, 0.28, 0],
          duration: 620,
          ease: "out(3)",
        });
        animate(".pw-hero-art", {
          scale: [1, 1.025, 1],
          duration: 760,
          ease: "out(3)",
        });
        animate(".pw-hero-status-item", {
          translateY: [0, -5, 0],
          delay: stagger(55),
          duration: 480,
          ease: "out(4)",
        });
      } else {
        animate(".pw-server-control-button", {
          scale: [1, 0.82, 0.9],
          opacity: [1, 0.72],
          duration: 460,
          ease: "inOutQuad",
        });
        animate(".pw-control-impact-ring", {
          scale: [1.5, 0.68],
          opacity: [0, 0.5, 0],
          delay: stagger(70),
          duration: 560,
          ease: "inOutQuad",
        });
        animate(".pw-hero-stop-shade", {
          opacity: [0, 0.28],
          duration: 520,
          ease: "inOutQuad",
        });
        animate(".pw-hero-status-item", {
          translateY: [0, 4, 0],
          delay: stagger(45),
          duration: 420,
          ease: "inOutQuad",
        });
      }
    });

    return () => scope.revert();
  }, [actionLoading]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    if (!rootRef.current || reducedMotionPreferred() || !status) return;
    const statusChanged =
      previousStatus !== undefined && previousStatus !== status;

    const scope = createScope({ root: rootRef }).add(() => {
      if (statusChanged) {
        const needsAttention =
          status === "terminated" || status === "unavailable";
        animate(".pw-state-feedback", {
          opacity: needsAttention
            ? [0, 0.4, 0.12, 0.3, 0]
            : [0, 0.28, 0],
          duration: needsAttention ? 920 : 680,
          ease: "inOutQuad",
        });
        animate(".pw-state-sweep", {
          translateX: ["-120%", "320%"],
          opacity: [0, 0.72, 0],
          duration: 760,
          ease: "inOutQuad",
        });
        animate(".pw-hero-state-copy", {
          opacity: [0.55, 1],
          translateY: [5, 0],
          duration: 420,
          ease: "out(4)",
        });
      }

      if (status === "pending") {
        animate(".pw-server-control-status", {
          scale: [0.8, 1.2],
          opacity: [0.5, 1],
          duration: 800,
          alternate: true,
          loop: true,
          ease: "inOutSine",
        });
      } else if (status === "running") {
        animate(".pw-server-control", {
          scale: [0.96, 1.03, 1],
          duration: 520,
          ease: "out(4)",
        });
        if (connectionReady) {
          animate(".pw-control-ready-ring", {
            strokeDashoffset: [1, 0],
            opacity: [0, 1, 1, 0],
            duration: 820,
            ease: "inOutQuad",
          });
          animate(".pw-connection-panel", {
            opacity: [0.5, 1],
            translateX: [12, 0],
            duration: 440,
            ease: "out(4)",
          });
        }
      } else if (status === "stopping" || status === "shutting-down") {
        animate(".pw-server-control", {
          scale: [1, 0.9],
          opacity: [1, 0.62],
          duration: 520,
          ease: "inOutQuad",
        });
      } else if (status === "stopped") {
        animate(".pw-server-control", {
          scale: [0.92, 1.025, 1],
          opacity: [0.72, 1],
          duration: 460,
          ease: "out(4)",
        });
      }
    });

    return () => scope.revert();
  }, [connectionReady, status]);

  const pulseCopy = useCallback((target: "address" | "password") => {
    if (!rootRef.current || reducedMotionPreferred()) return;
    const element = rootRef.current.querySelector(
      `[data-copy-feedback="${target}"]`,
    );
    if (!element) return;
    animate(element, {
      scale: [1, 1.1, 1],
      translateY: [0, -2, 0],
      duration: 360,
      ease: "out(3)",
    });
  }, []);

  return { rootRef, pulseCopy };
}
