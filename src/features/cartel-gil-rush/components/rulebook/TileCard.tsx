import { cn } from "@/lib/utils";
import { tilePresentation } from "../../presentation";
import type { Tile } from "../../types";

export function TileCard({ tile }: { tile: Tile }) {
  const { icon: Icon, accent } = tilePresentation[tile.id];

  return (
    <article aria-label={`${tile.name} tile`} className="flex h-full min-h-[420px] w-full flex-col rounded-lg bg-[#f6efdf] p-1.5 text-[#25211b] shadow-sm">
      <div className={cn("flex flex-1 flex-col rounded border px-4 py-5", accent)}>
        <Icon aria-hidden="true" className="mx-auto mb-3 size-12 shrink-0 stroke-[1.5]" />
        <p className="text-center text-xs font-semibold tracking-wider uppercase">{tile.category}</p>
        <h3 className="mt-1 flex min-h-7 items-center justify-center text-center font-serif text-lg leading-snug font-extrabold text-[#25211b]">{tile.name}</h3>
        <p className="mt-2 flex min-h-14 items-center justify-center text-center text-sm leading-snug text-[#554e43]">{tile.activation}</p>
        <div className="my-4 border-t border-current opacity-30" />
        <p className="text-sm leading-relaxed text-[#25211b]">{tile.effect}</p>
      </div>
    </article>
  );
}
