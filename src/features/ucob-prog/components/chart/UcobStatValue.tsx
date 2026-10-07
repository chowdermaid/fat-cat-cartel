import { useCallback } from "react";
import { useUcobNumberAnimation, useUcobTextChange } from "../../hooks/useUcobAnimations";

export function UcobStatValue({ value, numericValue }: { value: string; numericValue?: number }) {
  const ref = useUcobTextChange<HTMLSpanElement>(value, numericValue === undefined);
  const renderNumber = useCallback((number: number | null) => {
    if (ref.current && number !== null) ref.current.textContent = Math.round(number).toLocaleString();
  }, [ref]);
  useUcobNumberAnimation(numericValue ?? null, renderNumber, 350);

  return (
    <>
      <span ref={ref} aria-hidden="true">{value}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
