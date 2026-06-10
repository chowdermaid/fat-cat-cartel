import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

export function LoadingSkeleton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(".sk"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(35),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, []);
  return (
    <div ref={ref} className="flex flex-col md:flex-row gap-8">
      <div className="md:w-72 space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="sk h-8 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="sk w-full max-w-2xl aspect-square rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}
