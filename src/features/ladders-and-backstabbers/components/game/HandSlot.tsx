import { useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abilities } from "../../constants";
import type { EventAction } from "../../types";
import { AbilityCard } from "./AbilityCard";

interface HandSlotProps {
  card: string | null;
  crewId: string;
  crewNumber: number;
  run: (action: EventAction) => boolean;
}

export function HandSlot({ card, crewId, crewNumber, run }: HandSlotProps) {
  const [transition, setTransition] = useState({ card, previous: null as string | null });
  const incoming = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const lastAnimatedCard = useRef<string | null | undefined>(undefined);

  // Keep only a decorative copy for the exit. The real hand and undo update
  // immediately, and no animation callback ever performs an event action.
  if (card !== transition.card) setTransition({ card, previous: transition.card });

  useLayoutEffect(() => {
    const element = incoming.current;
    if (!element || lastAnimatedCard.current === card) return;
    lastAnimatedCard.current = card;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: ReturnType<typeof animate>[] = [];
    let active = true;
    const finish = () => {
      if (!active) return;
      setTransition((current) => current.previous === null ? current : { ...current, previous: null });
    };

    if (media.matches) queueMicrotask(finish);
    else {
      if (outgoing.current) animations.push(animate(outgoing.current, {
        opacity: [1, 0],
        translateY: [0, -14],
        scale: [1, 0.96],
        duration: 170,
        ease: "inQuad",
      }));
      animations.push(animate(element, {
        opacity: [0, 1],
        translateY: [card ? 14 : 0, 0],
        scale: [card ? 0.96 : 1, 1],
        delay: transition.previous ? 80 : 0,
        duration: 240,
        ease: "outCubic",
        onComplete: finish,
      }));
    }

    const handleMotionChange = () => {
      if (!media.matches) return;
      animations.forEach((animation) => animation.revert());
      if (outgoing.current) outgoing.current.style.opacity = "0";
      finish();
    };
    media.addEventListener("change", handleMotionChange);
    return () => {
      active = false;
      animations.forEach((animation) => animation.revert());
      media.removeEventListener("change", handleMotionChange);
    };
  }, [card, transition.previous]);

  return (
    <div className="grid w-full max-w-[220px]">
      {transition.previous && <div ref={outgoing} aria-hidden="true" inert className="pointer-events-none col-start-1 row-start-1 flex flex-col pb-[52px]">
        <AbilityCard ability={abilities.find((ability) => ability.name === transition.previous)!} />
      </div>}
      <div ref={incoming} className="col-start-1 row-start-1 flex min-w-0 flex-col gap-2">
        {card ? <>
          <AbilityCard ability={abilities.find((ability) => ability.name === card)!} />
          <Button variant="ghost" className="min-h-11 w-full shrink-0 text-muted-foreground" aria-label={`Discard ${card} from Crew ${crewNumber}`} onClick={() => run({ type: "discard", crewId, card })}><Trash2 aria-hidden="true" className="size-4" />Discard</Button>
        </> : <div className="flex h-full flex-col pb-[52px]">
          <Button variant="ghost" className="h-full min-h-[420px] w-full flex-col gap-4 whitespace-normal rounded-lg border border-dashed border-foreground/25 px-4 py-8 text-amber-800 hover:border-primary dark:text-primary" aria-label={`Deal a card to Crew ${crewNumber}`} onClick={() => run({ type: "deal", crewId })}>
            <span className="flex size-10 items-center justify-center rounded-full border border-current"><Plus aria-hidden="true" className="size-5" /></span>
            <span className="rounded border border-current px-3 py-2">Deal a card</span>
          </Button>
        </div>}
      </div>
    </div>
  );
}
