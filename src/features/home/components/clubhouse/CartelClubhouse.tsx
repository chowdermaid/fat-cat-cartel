import { Shuffle } from "lucide-react";
import clubhouseBackground from "@/assets/clubhouse/clubhouse-bg.png";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CLUBHOUSE } from "../../constants";
import { useClubhouse } from "../../hooks/useClubhouse";
import type { ClubhouseProps } from "../../types";
import { ClubhousePortrait } from "./ClubhousePortrait";

export function CartelClubhouse({ members, profiles }: ClubhouseProps) {
  const { sceneRef, visible, layout, reducedMotion, register, protect, showOtherMembers } = useClubhouse(members);

  return (
    <section aria-label="Cartel Clubhouse" className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#a37c4b]/30 bg-[#211b17] text-[#efdfc7]">
      <TooltipProvider delayDuration={CLUBHOUSE.tooltipDelayMs} skipDelayDuration={0}>
        <div ref={sceneRef} data-clubhouse-scene className="relative isolate w-full overflow-hidden" style={{ height: layout.height }}>
          <img src={clubhouseBackground} alt="" aria-hidden="true" draggable={false} data-clubhouse-background className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-[left_bottom]" />
          {Object.keys(members).length === 0 && <p className="flex h-full items-center justify-center px-4 text-sm text-[#d4bea0]">No members found.</p>}
          {visible.map((id) => members[id] && (
            <ClubhousePortrait key={id} id={id} member={members[id]} bio={profiles[id]?.bio} size={layout.size} register={register} protect={protect} />
          ))}
        </div>
      </TooltipProvider>
      {reducedMotion && Object.keys(members).length > layout.limit && (
        <div className="border-t border-[#a37c4b]/20 px-3 py-2">
          <Button type="button" size="sm" variant="ghost" onClick={showOtherMembers} className="min-h-10 text-[#efdfc7] hover:bg-white/10 hover:text-[#efdfc7]">
            <Shuffle aria-hidden="true" className="h-3.5 w-3.5" /> Show other members
          </Button>
        </div>
      )}
    </section>
  );
}
