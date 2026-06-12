import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function ClippingCard({
  children,
  className = "",
  rotate = "none",
}: {
  children: ReactNode;
  className?: string;
  rotate?: "left" | "right" | "none";
}) {
  const rotateClass =
    rotate === "left"
      ? "sm:-rotate-1"
      : rotate === "right"
        ? "sm:rotate-1"
        : "";

  return (
    <Card
      className={[
        "gazette-clipping relative border-dashed bg-card/85 shadow-sm",
        rotateClass,
        className,
      ].join(" ")}
    >
      <div className="absolute left-5 top-0 h-3 w-12 -translate-y-1/2 rounded-full bg-primary/25" />
      {children}
    </Card>
  );
}
