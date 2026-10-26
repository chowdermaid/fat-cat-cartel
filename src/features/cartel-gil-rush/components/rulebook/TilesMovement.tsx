import { ArrowDown, ArrowRight, ArrowUp, Crown } from "lucide-react";
import { tiles } from "../../constants";
import { tileArtwork } from "../../tileArtwork";
import { RuleText } from "./RuleText";

const tileReferences = [
  { id: "shark", summary: "Roll /random 10. Even: move forward by the result. Odd: move backwards by the result." },
  { id: "moogle", summary: "Roll /random 6. Move forward by the result." },
  { id: "mushroom", summary: "Roll /random 6. Move backwards by the result." },
  { id: "fatcat", summary: "Challenge Chow to one /deathroll. Win: 200,000 gil. Lose: no payout. The host explains the procedure and starting value before play." },
  { id: "chocobo", summary: "Answer one of Axo's questions without help within 15 seconds. Your first answer is final; Axo confirms the result. Correct: 200,000 gil. Incorrect or no answer: no payout." },
  { id: "ladder", summary: "Move to its marked upper endpoint." },
  { id: "red-arrow", summary: "Move to its marked lower endpoint. Under red, receive 200,000 gil after the fall." },
].map((reference) => ({ ...reference, tile: tiles.find((tile) => tile.id === reference.id)! }));

export function TilesMovement() {
  return (
    <section aria-labelledby="tiles-movement-heading" className="space-y-4">
      <h2 id="tiles-movement-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Tiles &amp; movement</h2>
      <dl className="divide-y border-b">
        {tileReferences.map(({ id, tile, summary }) => <div key={id} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 @[800px]:grid-cols-[40px_120px_minmax(0,1fr)] @[1100px]:gap-x-6">
          <img src={tileArtwork[tile.id]} alt="" className="size-10 shrink-0 object-contain" />
          <dt className="font-serif text-base font-extrabold">{tile.name}</dt>
          <dd className="col-start-2 text-sm leading-relaxed @[800px]:col-start-auto"><RuleText text={summary} moveIcon={id === "ladder" ? ArrowUp : id === "red-arrow" ? ArrowDown : ArrowRight} /></dd>
        </div>)}
        <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 @[800px]:grid-cols-[40px_120px_minmax(0,1fr)] @[1100px]:gap-x-6">
          <Crown aria-hidden="true" className="size-10 stroke-[1.75] text-amber-700 dark:text-[#ffd331]" />
          <dt className="font-serif text-base font-extrabold">Crown / finish</dt>
          <dd className="col-start-2 text-sm leading-relaxed @[800px]:col-start-auto"><RuleText text="Reach or pass tile 90 and finish resolving your turn to claim the next available place. An exact roll is not required." /></dd>
        </div>
      </dl>
    </section>
  );
}
