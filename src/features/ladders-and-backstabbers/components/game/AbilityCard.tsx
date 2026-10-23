import { cn } from "@/lib/utils";
import { abilityPresentation } from "../../presentation";

interface AbilityCardProps {
  ability: { name: string; timing: string; effect: string };
}

export function AbilityCard({ ability }: AbilityCardProps) {
  const { icon: Icon, category, accent } = abilityPresentation[ability.name];

  return (
    <article aria-label={ability.name} className="flex h-full min-h-[420px] w-full flex-col rounded-lg bg-[#f6efdf] p-1.5 text-[#25211b] shadow-sm">
      <div className={cn("flex flex-1 flex-col rounded border px-4 py-5", accent)}>
        <Icon aria-hidden="true" className="mx-auto mb-3 size-12 shrink-0 stroke-[1.5]" />
        <p className="text-center text-xs font-semibold uppercase tracking-wider">{category}</p>
        <h3 className="mt-1 flex min-h-7 items-center justify-center text-center font-serif text-lg leading-snug font-extrabold text-[#25211b]">{ability.name}</h3>
        <p className="mt-2 flex min-h-14 items-center justify-center text-center text-sm leading-snug text-[#554e43]">{ability.timing}</p>
        <div className="my-4 border-t border-current opacity-30" />
        <p className="text-sm leading-relaxed text-[#25211b]">{ability.effect}</p>
      </div>
    </article>
  );
}
