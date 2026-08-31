import { useEffect, useRef } from "react";
import { animate, createScope } from "animejs";

type ComplaintCounterProps = {
  total: number | null;
  reducedMotion: boolean;
};

export function ComplaintCounter({ total, reducedMotion }: ComplaintCounterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (total === null || !numberRef.current) return;
    const previous = previousRef.current;
    previousRef.current = total;
    if (previous === null || reducedMotion || !rootRef.current) {
      numberRef.current.textContent = total.toLocaleString();
      return;
    }
    const counter = { value: previous };
    const scope = createScope({ root: rootRef }).add(() => {
      animate(counter, {
        value: total,
        duration: 480,
        ease: "out(4)",
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent = Math.round(counter.value).toLocaleString();
          }
        },
      });
      animate(".spud-counter-number", {
        scale: [1, 1.1, 1],
        duration: 420,
        ease: "out(4)",
      });
    });
    return () => scope.revert();
  }, [reducedMotion, total]);

  return (
    <div ref={rootRef} className="text-center lg:text-left">
      <p className="font-mono text-[0.7rem] font-bold tracking-[0.18em] text-muted-foreground">
        SPUAADER COMPLAINTS RECORDED
      </p>
      <div className="mt-1 flex items-baseline justify-center gap-2 lg:justify-start">
        <span
          ref={numberRef}
          className="spud-counter-number inline-block font-serif text-6xl font-black tabular-nums text-[#9B681F] dark:text-[#E6B84A] sm:text-7xl"
          aria-hidden="true"
        >
          0
        </span>
        <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          coins
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        {total === null ? "Loading complaint total" : `${total} complaints recorded`}
      </span>
    </div>
  );
}
