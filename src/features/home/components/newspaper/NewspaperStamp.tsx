import type { ReactNode } from "react";

export function NewspaperStamp({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rotate-2 items-center rounded-full border border-primary/35 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary/85">
      {children}
    </span>
  );
}
