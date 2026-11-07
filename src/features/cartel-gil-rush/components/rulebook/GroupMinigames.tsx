import { minigames } from "../../constants";
import { MinigameSummary } from "../MinigameSummary";

export function GroupMinigames() {
  return (
    <section aria-labelledby="group-minigames-heading" className="space-y-6">
      <header className="space-y-3">
        <h2 id="group-minigames-heading" tabIndex={-1} className="font-serif text-[28px] leading-tight font-extrabold @[1100px]:text-[32px]">Group minigames</h2>
      </header>
      <div className="space-y-4">
        {minigames.map(({ value }) => <MinigameSummary key={value} kind={value} />)}
      </div>
    </section>
  );
}
