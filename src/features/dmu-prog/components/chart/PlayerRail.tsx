import { useRef, useState } from "react";
import { Crown, RefreshCw, RotateCcw, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PlayerWithColor } from "../../types";
import { formatPercent } from "../../utils/formatting";

export function PlayerRail({
  players,
  selectedId,
  hoveredId,
  open,
  onHover,
  onSelect,
  onOpenChange,
  onClear,
  canRefresh,
  refreshing,
  onRefresh,
}: {
  players: PlayerWithColor[];
  selectedId: string | null;
  hoveredId: string | null;
  open: boolean;
  onHover: (lodestoneId: string | null) => void;
  onSelect: (lodestoneId: string) => void;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  canRefresh: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [insidePanel, setInsidePanel] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const closeRail = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      if (insidePanel) return;
      onOpenChange(false);
      onHover(null);
    }, 140);
  };

  return (
    <div className="pointer-events-none absolute bottom-6 right-3 top-24 z-30 w-[22rem]">
        <div
          className="pointer-events-auto absolute bottom-0 right-0 top-0 flex w-18 flex-col items-center gap-2 rounded-lg border bg-background/90 p-2.5 shadow-sm backdrop-blur"
          onMouseEnter={() => {
            clearCloseTimer();
            onOpenChange(true);
          }}
          onMouseLeave={closeRail}
          onFocus={() => onOpenChange(true)}
        >
          <div className="min-h-0 w-full flex-1 overflow-y-auto overflow-x-visible pr-0.5">
            <div className="flex flex-col items-center gap-2 py-1">
              <button
                type="button"
                onMouseEnter={() => onHover(null)}
                onFocus={() => onHover(null)}
                onClick={onClear}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full bg-muted transition ring-offset-2 ring-offset-background",
                  selectedId == null
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border hover:ring-2 hover:ring-primary/60",
                )}
                aria-label="Show all players"
              >
                <UsersRound className="h-5 w-5 text-muted-foreground" />
              </button>
              {players.map((player) => {
                const active =
                  selectedId === player.lodestoneId ||
                  (!selectedId && hoveredId === player.lodestoneId);
                return (
                  <button
                    key={player.lodestoneId}
                    type="button"
                    onMouseEnter={() => onHover(player.lodestoneId)}
                    onFocus={() => onHover(player.lodestoneId)}
                    onClick={() => onSelect(player.lodestoneId)}
                    className={cn(
                      "relative h-10 w-10 rounded-full transition ring-offset-2 ring-offset-background",
                      active
                        ? "ring-2 ring-primary"
                        : "ring-1 ring-border hover:ring-2 hover:ring-primary/60",
                    )}
                    aria-label={`Select ${player.name}`}
                  >
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt=""
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center rounded-full bg-muted text-xs font-semibold">
                        {player.name.slice(0, 1)}
                      </span>
                    )}
                    {player.bestProgress === 0 && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-primary shadow-sm">
                        <Crown className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {selectedId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
              aria-label="Clear player selection"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div
          className={cn(
            "pointer-events-auto absolute bottom-0 right-16 top-0 w-4",
            open ? "block" : "hidden",
          )}
          onMouseEnter={() => {
            clearCloseTimer();
            setInsidePanel(true);
          }}
        />
        <div
          className={cn(
            "pointer-events-auto absolute bottom-0 right-20 top-0 flex w-72 flex-col rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur transition-all duration-150",
            open
              ? "translate-x-0 opacity-100"
              : "pointer-events-none translate-x-3 opacity-0",
          )}
          onMouseEnter={() => {
            clearCloseTimer();
            setInsidePanel(true);
          }}
          onMouseLeave={() => {
            setInsidePanel(false);
            onOpenChange(false);
            onHover(null);
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Players</p>
              <p className="text-xs text-muted-foreground">
                Hover previews, click pins.
              </p>
            </div>
            {selectedId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClear}
                aria-label="Clear player selection"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-2">
              <button
                type="button"
                onMouseEnter={() => onHover(null)}
                onFocus={() => onHover(null)}
                onClick={onClear}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                  selectedId == null
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/60",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                  <UsersRound className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    All players
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Best progress overview
                  </span>
                </span>
              </button>
              {players.map((player) => {
                const active =
                  selectedId === player.lodestoneId ||
                  (!selectedId && hoveredId === player.lodestoneId);
                return (
                  <button
                    key={player.lodestoneId}
                    type="button"
                    onMouseEnter={() => onHover(player.lodestoneId)}
                    onFocus={() => onHover(player.lodestoneId)}
                    onClick={() => onSelect(player.lodestoneId)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    {player.avatarUrl ? (
                      <span className="relative h-9 w-9 shrink-0">
                        <img
                          src={player.avatarUrl}
                          alt={player.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        {player.bestProgress === 0 && (
                          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-primary shadow-sm">
                            <Crown className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                    ) : (
                      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                        {player.name.slice(0, 1)}
                        {player.bestProgress === 0 && (
                          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-background text-primary shadow-sm">
                            <Crown className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {player.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {player.pullCount} pulls -{" "}
                        {formatPercent(player.bestProgress)}
                      </span>
                    </span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          {canRefresh && (
            <div className="mt-3 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-start gap-2 text-xs"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                Refresh DMU
              </Button>
            </div>
          )}
        </div>
      </div>
  );
}
