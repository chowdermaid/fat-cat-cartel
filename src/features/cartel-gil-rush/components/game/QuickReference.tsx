import { tileArtwork } from "../../tileArtwork";

const references = [
  { name: "Shark", image: tileArtwork.shark, effect: "Roll /random 10. Move the result: even forward, odd back." },
  { name: "Fat cat", image: tileArtwork.fatcat, effect: "Deathroll Chow. Win 200k." },
  { name: "Chocobo", image: tileArtwork.chocobo, effect: "Axo Trivia. Win 200k." },
  { name: "Moogle", image: tileArtwork.moogle, effect: "Roll /random 6 forward." },
  { name: "Mushroom", image: tileArtwork.mushroom, effect: "Roll /random 6 back." },
  { name: "Ladder", image: tileArtwork.ladder, effect: "Climb up." },
  { name: "Red arrow", image: tileArtwork["red-arrow"], effect: "Fall down." },
];

export function QuickReference() {
  return (
    <section aria-labelledby="quick-reference-heading" className="space-y-4 border-t pt-5">
      <h2 id="quick-reference-heading" className="font-serif text-xl font-bold text-blue-900 dark:text-blue-200">Quick reference</h2>
      <ul className="grid grid-cols-2 gap-3 @[600px]:grid-cols-4 @[1200px]:grid-cols-7">
        {references.map(({ name, image, effect }) => <li key={name} className="flex min-w-0 flex-col items-center rounded-xl border bg-muted px-2 py-4 text-center">
          <img src={image} alt="" className="mb-2 size-14 object-contain" />
          <h3 className="text-sm font-extrabold">{name}</h3>
          <p className="mt-2 max-w-28 text-sm leading-snug text-muted-foreground">{effect}</p>
        </li>)}
      </ul>
    </section>
  );
}
