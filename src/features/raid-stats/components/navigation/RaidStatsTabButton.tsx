import type { ReactNode } from "react";

export function RaidStatsTabButton({
  active,
  onClick,
  children,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "md" | "sm";
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-md font-medium transition-colors ${
        size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}
