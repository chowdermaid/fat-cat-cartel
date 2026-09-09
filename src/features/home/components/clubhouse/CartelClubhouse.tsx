import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import clubhouseBackground from "@/assets/clubhouse/clubhouse-bg.png";
import clubhouseNightBackground from "@/assets/clubhouse/clubhouse-bg-night.png";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CLUBHOUSE } from "../../constants";
import { useClubhouse } from "../../hooks/useClubhouse";
import type { ClubhouseProps } from "../../types";
import { ClubhousePortrait } from "./ClubhousePortrait";

const sydneyHour = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  hour: "numeric",
  hourCycle: "h23",
});

function isSydneyNight() {
  const hour = Number(sydneyHour.format(new Date()));
  return hour >= 18 || hour < 6;
}

export function CartelClubhouse({ members, profiles }: ClubhouseProps) {
  const { sceneRef, visible, layout, reducedMotion, register, protect, showOtherMembers } = useClubhouse(members);
  const [isNight, setIsNight] = useState(isSydneyNight);

  useEffect(() => {
    const updateBackground = () => setIsNight(isSydneyNight());
    const interval = window.setInterval(updateBackground, 60_000);
    document.addEventListener("visibilitychange", updateBackground);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateBackground);
    };
  }, []);

  return (
    <section aria-label="Cartel Clubhouse" className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#211b17] text-[#efdfc7]">
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-20 h-2.5 w-full border-y border-t-[#594333] border-b-[#130f0c] bg-[#30231a] shadow-[inset_0_2px_0_#443124,inset_0_-2px_0_#201710,0_3px_6px_#00000055] lg:h-full lg:w-2.5 lg:border-x lg:border-y-0 lg:border-l-[#594333] lg:border-r-[#130f0c] lg:shadow-[inset_2px_0_0_#443124,inset_-2px_0_0_#201710,3px_0_6px_#00000055]" />
      <TooltipProvider delayDuration={CLUBHOUSE.tooltipDelayMs} skipDelayDuration={0}>
        <div ref={sceneRef} data-clubhouse-scene className="relative isolate w-full flex-auto overflow-hidden" style={{ minHeight: layout.narrow ? CLUBHOUSE.narrowSceneHeight : CLUBHOUSE.sceneHeight, aspectRatio: `${CLUBHOUSE.artwork.width} / ${CLUBHOUSE.artwork.height}` }}>
          <img src={isNight ? clubhouseNightBackground : clubhouseBackground} alt="" aria-hidden="true" draggable={false} data-clubhouse-background className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[left_bottom]" />
          {Object.keys(members).length === 0 && <p className="flex h-full items-center justify-center px-4 text-sm text-[#d4bea0]">No members found.</p>}
          {visible.map((id) => members[id] && (
            <ClubhousePortrait key={id} id={id} member={members[id]} bio={profiles[id]?.bio} hatId={profiles[id]?.clubhouseHatId} size={layout.size} register={register} protect={protect} />
          ))}
        </div>
      </TooltipProvider>
      {reducedMotion && Object.keys(members).length > layout.limit && (
        <div className="shrink-0 border-t border-[#a37c4b]/20 px-3 py-2">
          <Button type="button" size="sm" variant="ghost" onClick={showOtherMembers} className="min-h-10 text-[#efdfc7] hover:bg-white/10 hover:text-[#efdfc7]">
            <Shuffle aria-hidden="true" className="h-3.5 w-3.5" /> Show other members
          </Button>
        </div>
      )}
    </section>
  );
}
