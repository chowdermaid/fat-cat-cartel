import laurelSvg from "@/assets/icons/keybound-laurel-single?raw";
import { cn } from "@/lib/utils";
import { RANK_AVATAR_CLASSES, RANK_CLASSES, RANK_CROWNS } from "../constants";
import type { RankedMember } from "../types";
import { MemberAvatar } from "./MemberAvatar";

const laurelUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(laurelSvg)}`;

export function ScorePodium({ rows }: { rows: RankedMember[] }) {
  const scored = rows.filter((row) => row.bestScore !== null).slice(0, 3);
  return (
    <section aria-label="Top three scores" className="grid shrink-0 grid-cols-3 pt-2 pb-4 @[640px]:min-h-61">
      {[1, 0, 2].map((index, position) => {
        const member = scored[index];
        return (
          <div key={index} className={cn("relative flex min-w-0 flex-col items-center px-2 text-center @[640px]:px-6", position !== 1 && "@[640px]:pt-3")}>
            {member ? <>
              <div className={cn("flex h-7 items-center font-serif text-2xl font-extrabold @[640px]:text-[2rem]", RANK_CLASSES[member.rank ?? 0] ?? "text-muted-foreground")}>
                <span><span className="sr-only">Rank </span>{member.rank}</span>
              </div>
              <div className="relative mt-4 @[640px]:mt-6">
                {position === 1 && <img src={laurelUrl} alt="" aria-hidden="true" className="pointer-events-none absolute -left-7 bottom-0 h-12 w-auto @[640px]:-left-10 @[640px]:h-18" />}
                <MemberAvatar member={member} className={cn("size-12 border-2 @[640px]:size-22", RANK_AVATAR_CLASSES[member.rank ?? 0], position === 1 && "ring-2 ring-primary/20 @[640px]:size-24")} />
                {member.rank !== null && RANK_CROWNS[member.rank] && <img src={RANK_CROWNS[member.rank]} alt="" aria-hidden="true" className="pointer-events-none absolute -top-5 left-1/2 z-10 h-6 w-8 -translate-x-1/2 object-contain @[640px]:-top-7 @[640px]:h-9 @[640px]:w-12" />}
                {position === 1 && <img src={laurelUrl} alt="" aria-hidden="true" className="pointer-events-none absolute -right-7 bottom-0 h-12 w-auto -scale-x-100 @[640px]:-right-10 @[640px]:h-18" />}
              </div>
              <p className="mt-2 w-full break-words text-xs font-bold @[640px]:mt-1.5 @[640px]:text-xl @[640px]:leading-7">{member.name}</p>
              <p className={cn("mt-1 w-full break-all font-mono font-medium tabular-nums tracking-wide", position === 1 ? "text-lg font-bold tracking-normal @[320px]:text-xl @[640px]:text-4xl @[640px]:leading-10" : "text-base @[640px]:text-[1.75rem] @[640px]:leading-7", RANK_CLASSES[member.rank ?? 0])}>{member.bestScore!.toLocaleString("en-AU")}</p>
            </> : <div className="flex min-h-35 flex-col items-center justify-center gap-2 text-muted-foreground @[640px]:min-h-42">
              <img src={RANK_CROWNS[index + 1]} alt="" aria-hidden="true" className="h-8 w-10 object-contain opacity-40" />
              <p className="text-xs @[640px]:text-sm">No score yet</p>
            </div>}
          </div>
        );
      })}
    </section>
  );
}
