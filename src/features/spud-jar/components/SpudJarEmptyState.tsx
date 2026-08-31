import { useEffect, useRef } from "react";
import { animate, createScope } from "animejs";

export function SpudJarEmptyState({
  reducedMotion,
}: {
  reducedMotion: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ref.current || reducedMotion) return;
    const element = ref.current;
    const scope = createScope({ root: ref }).add(() => {
      animate(element, {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 300,
        ease: "out(3)",
      });
    });
    return () => scope.revert();
  }, [reducedMotion]);

  return (
    <p
      ref={ref}
      className="text-center text-sm italic text-muted-foreground"
    ></p>
  );
}
