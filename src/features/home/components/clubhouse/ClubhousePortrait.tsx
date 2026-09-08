import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Portal as TooltipPortal } from "@radix-ui/react-tooltip";
import { User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import fedora from "@/assets/clubhouse/fat-cat-cartel-fedora.svg";
import { CLUBHOUSE } from "../../constants";
import type { ClubhouseProps, ClubhouseProtection } from "../../types";
import { getClubhouseFootprint, getClubhouseHatTilt } from "../../utils/clubhouse";

type Props = {
  id: string;
  member: ClubhouseProps["members"][string];
  bio?: string | null;
  size: number;
  register: (id: string, element: HTMLDivElement | null) => void;
  protect: (id: string, reason: ClubhouseProtection, active: boolean) => void;
};

export const ClubhousePortrait = memo(function ClubhousePortrait({ id, member, bio, size, register, protect }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const focusDelayRef = useRef<number | undefined>(undefined);
  const attach = useCallback((element: HTMLDivElement | null) => register(id, element), [id, register]);
  const tilt = getClubhouseHatTilt(id, CLUBHOUSE) - CLUBHOUSE.hatEmbeddedTilt;
  const footprint = getClubhouseFootprint(size, CLUBHOUSE);
  const updateTooltip = (open: boolean) => {
    window.clearTimeout(focusDelayRef.current);
    focusDelayRef.current = undefined;
    protect(id, "tooltip", open);
    setTooltipOpen(open);
  };

  useEffect(() => () => {
    window.clearTimeout(focusDelayRef.current);
    protect(id, "tooltip", false);
  }, [id, protect]);

  return (
    <div ref={attach} className="absolute left-0 top-0" data-clubhouse-member={id} style={{ width: size, height: size }}>
      <div data-clubhouse-fade>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-2 left-[10%] h-3 w-4/5 rounded-full bg-black/35 blur-[3px]" />
        <div data-clubhouse-body>
          <Tooltip open={tooltipOpen} onOpenChange={updateTooltip}>
            <TooltipTrigger asChild>
              <Link
                to="/members/$lodestoneId"
                params={{ lodestoneId: id }}
                aria-label={`View ${member.name}'s profile`}
                className="relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2b365] focus-visible:ring-offset-4 focus-visible:ring-offset-[#211b17]"
                style={{ width: size, height: size }}
                onPointerEnter={(event) => { if (event.pointerType !== "touch") protect(id, "hover", true); }}
                onPointerLeave={() => protect(id, "hover", false)}
                onPointerCancel={() => protect(id, "hover", false)}
                onFocus={(event) => {
                  event.preventDefault();
                  protect(id, "focus", true);
                  if (event.currentTarget.matches(":focus-visible")) {
                    window.clearTimeout(focusDelayRef.current);
                    focusDelayRef.current = window.setTimeout(() => updateTooltip(true), CLUBHOUSE.tooltipDelayMs);
                  }
                }}
                onBlur={() => { updateTooltip(false); protect(id, "focus", false); }}
                onKeyDown={(event) => { if (event.key === "Escape") updateTooltip(false); }}
              >
                <span className="block h-full w-full overflow-hidden rounded-full bg-[#35291f] ring-2 ring-[#b68b51]/70">
                  {member.avatarUrl && member.avatarUrl !== failedUrl ? (
                    <img src={member.avatarUrl} alt="" draggable={false} className="h-full w-full object-cover" onError={() => setFailedUrl(member.avatarUrl)} />
                  ) : <User aria-hidden="true" className="m-auto h-full w-1/2 text-[#d4bea0]" />}
                </span>
                <img
                  src={fedora} alt="" aria-hidden="true" draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{
                    width: size * CLUBHOUSE.hatWidth, left: size * CLUBHOUSE.hatLeft, top: size * CLUBHOUSE.hatTop,
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: `${CLUBHOUSE.hatOrigin.x * 100}% ${CLUBHOUSE.hatOrigin.y * 100}%`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-full mt-2 w-max -translate-x-1/2 truncate rounded bg-[#17120f]/95 px-2 py-0.5 text-center text-[11px] font-medium leading-4 text-[#f0dfc6]"
                  style={{ maxWidth: CLUBHOUSE.nameWidth }}
                >{member.name}</span>
              </Link>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent
                side="top"
                sideOffset={-footprint.top + 8}
                collisionPadding={16}
                className="max-w-[min(18rem,calc(100vw_-_2rem))] border-[#a37c4b]/40 bg-[#211b17] text-[#efdfc7] motion-reduce:animate-none"
              >
                <ScrollArea
                  className="max-h-[min(16rem,var(--radix-tooltip-content-available-height))]"
                  viewportClassName="max-h-[min(16rem,var(--radix-tooltip-content-available-height))]"
                >
                  <p className="whitespace-pre-wrap pr-2 text-sm [overflow-wrap:anywhere]">{bio?.trim() || "No biography yet."}</p>
                </ScrollArea>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
