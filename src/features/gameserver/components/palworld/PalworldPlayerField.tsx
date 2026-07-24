import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import { animate, createScope, stagger } from "animejs";
import playerFieldBanner from "@/assets/gameserver/palworld-live-players-banner.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PalworldPlayer } from "../../types";

const EXIT_DURATION_MS = 260;
const ENTER_DURATION_MS = 420;

const PLAYER_ICONS = Object.values(
  import.meta.glob("/src/assets/gameserver/icons/*.svg", {
    eager: true,
    import: "default",
  }),
) as string[];

type DisplayedPlayer = {
  key: string;
  player: PalworldPlayer;
  icon: string;
  entering: boolean;
  exiting: boolean;
};

type PlayerEntry = {
  key: string;
  player: PalworldPlayer;
};

type PalworldPlayerFieldProps = {
  players: PalworldPlayer[];
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function playerBaseKey(player: PalworldPlayer, index: number): string {
  return (
    player.playerId ||
    player.userId ||
    player.accountName ||
    `${player.name || "unknown"}-${index}`
  );
}

function playerEntries(players: PalworldPlayer[]): PlayerEntry[] {
  const occurrences = new Map<string, number>();
  return players
    .map((player, index) => {
      const baseKey = playerBaseKey(player, index);
      const occurrence = occurrences.get(baseKey) ?? 0;
      occurrences.set(baseKey, occurrence + 1);
      return {
        key: occurrence === 0 ? baseKey : `${baseKey}-${occurrence}`,
        player,
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function randomPlayerIcon(usedIcons: Set<string>): string {
  const unusedIcons = PLAYER_ICONS.filter((icon) => !usedIcons.has(icon));
  const choices = unusedIcons.length > 0 ? unusedIcons : PLAYER_ICONS;
  const icon = choices[Math.floor(Math.random() * choices.length)] ?? "";
  usedIcons.add(icon);
  return icon;
}

function initialDisplayedPlayers(
  entries: PlayerEntry[],
): DisplayedPlayer[] {
  const usedIcons = new Set<string>();
  return entries.map((entry) => ({
    ...entry,
    icon: randomPlayerIcon(usedIcons),
    entering: true,
    exiting: false,
  }));
}

function pingDisplay(ping: number | null): {
  label: string;
  className: string;
} {
  if (typeof ping !== "number") {
    return {
      label: "Unavailable",
      className: "bg-muted-foreground",
    };
  }
  const rounded = Math.max(0, Math.round(ping));
  if (rounded <= 80) {
    return { label: `${rounded} ms`, className: "bg-emerald-500" };
  }
  if (rounded <= 150) {
    return { label: `${rounded} ms`, className: "bg-amber-500" };
  }
  return { label: `${rounded} ms`, className: "bg-red-500" };
}

function PlayerIcon({
  entry,
  dense,
}: {
  entry: DisplayedPlayer;
  dense: boolean;
}) {
  const { player, key, icon } = entry;
  const hash = hashText(key);
  const ping = pingDisplay(player.ping);
  const name = player.name || "Unknown player";
  const account = player.accountName || player.userId || "Unknown account";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="pw-player-presence flex min-w-0 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-entering={entry.entering ? "true" : "false"}
          data-exiting={entry.exiting ? "true" : "false"}
          tabIndex={0}
          aria-label={`${name}, level ${player.level ?? "unknown"}, ping ${ping.label}`}
        >
          <div
            className="pw-player-motion flex min-w-0 flex-col items-center"
          >
            <div className="mb-1 rounded-full border border-black/10 bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-800 shadow-sm">
              Lv {player.level ?? "?"}
            </div>

            <div
              className={`pw-player-icon relative flex items-center justify-center ${dense ? "h-16 w-16" : "h-20 w-20"}`}
              data-icon-duration={2_200 + ((hash >>> 16) % 1_200)}
            >
              <span
                className="absolute bottom-0 h-2 w-3/5 rounded-full bg-black/20 blur-[1px]"
                aria-hidden="true"
              />
              <img
                src={icon}
                alt=""
                aria-hidden="true"
                className="relative h-full w-full object-contain [image-rendering:pixelated] drop-shadow-[0_4px_2px_rgba(15,23,42,0.35)]"
              />
            </div>
            <div
              className={`mt-1 max-w-full truncate rounded-full bg-slate-950/70 px-2 py-0.5 text-center font-semibold text-white shadow-sm backdrop-blur-sm ${dense ? "text-[0.6rem]" : "text-xs"}`}
              title={name}
            >
              {name}
            </div>
            <div className="mt-1 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[0.65rem] font-medium text-slate-800 shadow-sm">
              <span className={`h-1.5 w-1.5 rounded-full ${ping.className}`} />
              {ping.label}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 space-y-1">
        <div className="font-semibold">{name}</div>
        <div className="text-xs text-muted-foreground">{account}</div>
        <div className="flex gap-3 text-xs">
          <span>Level {player.level ?? "unknown"}</span>
          <span>Ping {ping.label}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function PalworldPlayerField({ players }: PalworldPlayerFieldProps) {
  const rootRef = useRef<HTMLElement>(null);
  const incomingEntries = useMemo(() => playerEntries(players), [players]);
  const incomingSignature = incomingEntries.map((entry) => entry.key).join("|");
  const [displayedPlayers, setDisplayedPlayers] = useState<DisplayedPlayer[]>(
    () => initialDisplayedPlayers(incomingEntries),
  );

  useEffect(() => {
    const reduceMotion = prefersReducedMotion();
    const reconcileTimer = window.setTimeout(() => {
      const incomingByKey = new Map(
        incomingEntries.map((entry) => [entry.key, entry.player]),
      );
      setDisplayedPlayers((current) => {
        const currentByKey = new Map(
          current.map((entry) => [entry.key, entry]),
        );
        const usedIcons = new Set(
          current
            .filter((entry) => incomingByKey.has(entry.key))
            .map((entry) => entry.icon),
        );
        const nextPlayers = incomingEntries.map((entry) => {
          const existing = currentByKey.get(entry.key);
          return existing
            ? {
                ...existing,
                player: entry.player,
                entering: false,
                exiting: false,
              }
            : {
                ...entry,
                icon: randomPlayerIcon(usedIcons),
                entering: !reduceMotion,
                exiting: false,
              };
        });
        if (reduceMotion) return nextPlayers;
        const exitingPlayers = current
          .filter((entry) => !incomingByKey.has(entry.key))
          .map((entry) => ({
            ...entry,
            entering: false,
            exiting: true,
          }));
        return [...nextPlayers, ...exitingPlayers].sort((left, right) =>
          left.key.localeCompare(right.key),
        );
      });
    }, 0);

    if (reduceMotion) {
      return () => window.clearTimeout(reconcileTimer);
    }

    const enterTimer = window.setTimeout(() => {
      setDisplayedPlayers((current) =>
        current.map((entry) => ({ ...entry, entering: false })),
      );
    }, ENTER_DURATION_MS);
    const exitTimer = window.setTimeout(() => {
      setDisplayedPlayers((current) =>
        current.filter((entry) => !entry.exiting),
      );
    }, EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(reconcileTimer);
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
    };
  }, [incomingEntries, incomingSignature]);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;

    const scope = createScope({ root: rootRef }).add(() => {
      const entering = rootRef.current?.querySelectorAll(
        '[data-entering="true"]',
      );
      if (entering?.length) {
        animate(entering, {
          opacity: [0, 1],
          scale: [0.82, 1],
          translateY: [8, 0],
          delay: stagger(45),
          duration: ENTER_DURATION_MS,
          ease: "out(4)",
        });
      }

      const exiting = rootRef.current?.querySelectorAll(
        '[data-exiting="true"]',
      );
      if (exiting?.length) {
        animate(exiting, {
          opacity: [1, 0],
          scale: [1, 0.88],
          duration: EXIT_DURATION_MS,
          ease: "in(2)",
        });
      }
    });

    return () => scope.revert();
  }, [displayedPlayers]);

  useEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return;
    const activeIcons = rootRef.current.querySelectorAll<HTMLElement>(
      '[data-exiting="false"] .pw-player-icon',
    );
    const scope = createScope({ root: rootRef }).add(() => {
      activeIcons.forEach((element) => {
        animate(element, {
          translateY: [0, -3],
          rotate: [-1.5, 1.5],
          duration: Number(element.dataset.iconDuration),
          alternate: true,
          loop: true,
          ease: "inOutSine",
        });
      });
    });
    return () => scope.revert();
  }, [incomingSignature]);

  const activeCount = displayedPlayers.filter((entry) => !entry.exiting).length;
  const dense = activeCount > 12;

  return (
    <section
      ref={rootRef}
      className="space-y-3"
      aria-labelledby="online-player-field-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 id="online-player-field-title">Online Players</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {activeCount} online
        </span>
      </div>

      <div className="relative min-h-48 overflow-hidden rounded-lg border bg-slate-950 px-3 py-5">
        <img
          src={playerFieldBanner}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/5 via-transparent to-slate-950/25"
          aria-hidden="true"
        />

        {activeCount === 0 ? (
          <div className="relative z-10 flex min-h-36 items-center justify-center">
            <span className="rounded-full bg-slate-950/65 px-3 py-1.5 text-sm font-medium text-white shadow-sm backdrop-blur-sm">
              No players online
            </span>
          </div>
        ) : (
          <TooltipProvider delayDuration={120}>
            <div
              className="relative z-10 grid items-end gap-x-2 gap-y-5"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${dense ? "4.5rem" : "6.25rem"}, 1fr))`,
              }}
            >
              {displayedPlayers.map((entry) => (
                <div
                  key={entry.key}
                  className={`flex min-w-0 items-end justify-center ${dense ? "min-h-28" : "min-h-32"}`}
                >
                  <PlayerIcon entry={entry} dense={dense} />
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </section>
  );
}
