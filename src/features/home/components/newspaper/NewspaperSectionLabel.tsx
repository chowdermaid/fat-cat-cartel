import type { ReactNode } from "react";

export function NewspaperSectionLabel({
  children,
  kicker,
}: {
  children: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="mb-3 border-y border-dashed py-2">
      {kicker && (
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {kicker}
        </p>
      )}
      <h2 className="font-serif text-2xl font-semibold leading-tight">
        {children}
      </h2>
    </div>
  );
}
