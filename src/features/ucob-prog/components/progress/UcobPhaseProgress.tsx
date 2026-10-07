import { useCallback, useRef } from "react";
import staticIcon from "@/assets/fatcathi.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UCOB_STATIC_NAME } from "../../constants";
import type { UcobProgressData } from "../../types";
import { buildPhaseProgress } from "../../utils/phaseProgress";
import { useUcobEntrance, useUcobNumberAnimation, useUcobTextChange } from "../../hooks/useUcobAnimations";

export function UcobPhaseProgress({
  data,
  loading = false,
}: {
  data: UcobProgressData | null;
  loading?: boolean;
}) {
  const progress = buildPhaseProgress(
    data?.points ?? [],
    data?.summary.cleared ?? false,
  );
  const currentPhase = progress.stages.find(
    (stage) => stage.status === "current",
  );
  const percentLabel =
    progress.completionPercent !== null
      ? `${Number(progress.completionPercent.toFixed(1))}%`
      : null;
  const showAvatar =
    progress.completionPercent !== null &&
    Boolean(data?.points.length || progress.state === "cleared");
  const entranceRef = useUcobEntrance<HTMLElement>(!loading, 120);
  const progressRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useUcobTextChange<HTMLLIElement>(currentPhase?.id ?? progress.state, !loading);
  const renderProgress = useCallback((value: number | null) => {
    if (value === null) return;
    const indicator = progressRef.current?.firstElementChild as HTMLElement | null;
    if (indicator) indicator.style.transform = `translateX(-${100 - value}%)`;
    if (avatarRef.current) avatarRef.current.style.left = `${value}%`;
    if (percentRef.current) percentRef.current.textContent = `${Number(value.toFixed(1))}%`;
  }, []);
  useUcobNumberAnimation(loading || !showAvatar ? null : progress.completionPercent, renderProgress, 450);

  return (
    <section
      ref={entranceRef}
      aria-label="Phase progress"
      aria-busy={loading}
      className="@container px-1 py-3 sm:px-2"
    >
      {loading ? (
        <div aria-label="Loading phase progress" className="space-y-3">
          <Skeleton className="h-2 w-full motion-reduce:animate-none" />
          <div className="mx-[18px] grid grid-cols-2 gap-y-3 @[36rem]:grid-cols-5">
            {progress.stages.map((stage) => (
              <Skeleton
                key={stage.id}
                className="h-4 w-full max-w-28 motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative mx-[18px] mt-6 flex h-9 items-center">
            <Progress
              ref={progressRef}
              value={progress.completionPercent}
              aria-label={`${UCOB_STATIC_NAME} overall raid progress`}
              aria-valuetext={
                percentLabel
                  ? `${percentLabel} overall progression${currentPhase ? `, furthest recorded phase ${currentPhase.id}` : ""}`
                  : "Progress unavailable"
              }
              className="h-2 bg-muted [&>div]:transition-none"
            />
            {showAvatar && (
              <div
                ref={avatarRef}
                aria-hidden="true"
                className="absolute top-0 z-20 -translate-x-1/2"
                style={{ left: `${progress.completionPercent}%` }}
              >
                <span ref={percentRef} className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold leading-5 tabular-nums">
                  {percentLabel}
                </span>
                <Avatar className="h-9 w-9 border-2 border-amber-400 bg-background">
                  <AvatarImage
                    src={staticIcon}
                    alt=""
                    className="object-contain p-0.5"
                  />
                  <AvatarFallback className="text-xs font-semibold">
                    CC
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
          <ol aria-label="Raid phases" className="mx-[18px] mt-3 grid grid-cols-2 gap-x-3 gap-y-2 @[36rem]:grid-cols-5 @[36rem]:gap-x-0">
            {progress.stages.map((stage) => {
              const current = stage.status === "current";
              const statusLabel = {
                passed: "Passed",
                current: "Furthest reached",
                unreached: "Not reached",
                unknown: "No phase data",
              }[stage.status];

              return (
                <li
                  ref={current ? phaseRef : undefined}
                  key={stage.id}
                  aria-current={current ? "step" : undefined}
                  data-phase={stage.id}
                  data-state={stage.status}
                  className={cn(
                    "flex min-w-0 items-baseline gap-1.5",
                    current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="text-[10px]">{stage.id}</span>
                  <h3 className={cn("font-serif text-xs", current && "font-semibold")}>
                    {stage.name}
                  </h3>
                  <span className="sr-only">{statusLabel}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
