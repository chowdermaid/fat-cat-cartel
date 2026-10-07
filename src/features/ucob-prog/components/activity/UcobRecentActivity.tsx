import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { CalendarDays, Clock, ExternalLink, Swords, Target, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { UcobActivity } from "../../types";
import { formatDateTime } from "../../utils/formatting";
import { useUcobEntrance } from "../../hooks/useUcobAnimations";

export function UcobRecentActivity({ activities }: { activities: UcobActivity[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useUcobEntrance<HTMLHeadingElement>(true, 360);
  const seenIds = useRef(new Set<string>());
  const sessionIds = JSON.stringify(activities.map((activity) => activity.id));

  useLayoutEffect(() => {
    const list = listRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!list) return;
    const cards = Array.from(list.children) as HTMLElement[];
    const newCards = cards.filter((card) => !seenIds.current.has(card.dataset.sessionId!));
    if (reducedMotion.matches) {
      cards.forEach((card) => seenIds.current.add(card.dataset.sessionId!));
      return;
    }
    if (!newCards.length) return;
    const initial = seenIds.current.size === 0;
    const originalOpacity = new Map(newCards.map((card) => [card, card.style.opacity]));
    const restore = () => newCards.forEach((card) => { card.style.opacity = originalOpacity.get(card)!; });
    newCards.forEach((card) => { card.style.opacity = "0"; });

    let animation: ReturnType<typeof animate> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      cards.forEach((card) => seenIds.current.add(card.dataset.sessionId!));
      const visibleCards = newCards.filter((card) => {
        const bounds = card.getBoundingClientRect();
        return bounds.top < window.innerHeight && bounds.bottom > 0;
      }).slice(0, 12);
      newCards.filter((card) => !visibleCards.includes(card)).forEach((card) => { card.style.opacity = originalOpacity.get(card)!; });
      if (!visibleCards.length || reducedMotion.matches) {
        restore();
        return;
      }
      animation = animate(visibleCards, {
        opacity: [0, 1],
        translateY: [6, 0],
        delay: stagger(initial ? 60 : 45, { start: initial ? 360 : 0 }),
        duration: initial ? 320 : 260,
        ease: "outQuad",
      });
    });
    const stop = () => {
      observer.disconnect();
      animation?.revert();
      restore();
    };
    const handleMotionChange = () => {
      if (reducedMotion.matches) {
        cards.forEach((card) => seenIds.current.add(card.dataset.sessionId!));
        stop();
      }
    };
    observer.observe(list);
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      stop();
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [sessionIds]);

  return (
    <section aria-label="Recent sessions" className="@container px-1 py-3 sm:px-2">
      <h2 ref={headingRef} className="mb-3 font-serif text-base font-semibold">Recent sessions</h2>
      {!activities.length ? (
        <p className="py-3 text-sm text-muted-foreground">No recent UCOB sessions are available.</p>
      ) : (
        <ul ref={listRef} className="grid grid-cols-1 gap-2 @[32rem]:grid-cols-2 @[52rem]:grid-cols-3 @[72rem]:grid-cols-4">
          {activities.map((activity) => (
            <li key={activity.id} data-session-id={activity.id} className="min-w-0">
              <Card className="h-full space-y-2 rounded-lg bg-card/40 p-3 shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <time dateTime={new Date(activity.startedAt).toISOString()} className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                    <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {formatDateTime(activity.startedAt)}
                  </time>
                  {activity.reportUrl && (
                    <a
                      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      href={activity.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Report for ${formatDateTime(activity.startedAt)}`}
                    >
                      Report <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Swords aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {activity.clearCount + activity.wipeCount} pulls
                  </span>
                  {activity.bestPercent && (
                    <span className="inline-flex items-center gap-1.5">
                      <Target aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                      Best: {activity.bestPercent}
                    </span>
                  )}
                  {activity.clearCount > 0 && (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <Trophy aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        {activity.clearCount} {activity.clearCount === 1 ? "clear" : "clears"}
                      </span>
                      {activity.killDuration && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          Clear time: {activity.killDuration}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
