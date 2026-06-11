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
    <div ref={ref} className="space-y-6">
      <div className="sk space-y-2">
        <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-72 rounded bg-muted animate-pulse" />
      </div>
      <div className="sk h-11 rounded-lg bg-muted animate-pulse" />
      <div className="sk h-40 rounded-xl bg-muted animate-pulse" />
      <div className="sk h-40 rounded-xl bg-muted animate-pulse" />
      <div className="sk h-64 rounded-xl bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk h-52 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="sk h-52 rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
