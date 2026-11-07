import { useState } from "react";
import goldenDice from "@/assets/cartel-gil-rush/golden-dice.png";
import { Button } from "@/components/ui/button";
import type { EventController, SharedPlayer } from "../../types";

export function BonusDieControl({ player, run, revision, disabled }: { player: SharedPlayer; run: EventController["run"]; revision: number; disabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div className="space-y-2 border-t pt-3">
    <Button type="button" variant={player.bonusDie ? "default" : "outline"} className="min-h-11 w-full" aria-label={`Golden die for ${player.name}`} aria-pressed={Boolean(player.bonusDie)} disabled={disabled || pending} onClick={async () => {
      if (disabled || pending) return;
      setPending(true);
      setFailed(false);
      try { setFailed(!await run({ type: "set-bonus-die", id: player.id, sides: player.bonusDie ? null : 10 }, revision)); }
      finally { setPending(false); }
    }}>
      <img src={goldenDice} alt="" className="size-5 object-contain" />{player.bonusDie ? "Remove golden die" : "Assign golden die"}
    </Button>
    {failed && <p role="alert" className="text-sm text-destructive">Could not save. Review the latest die and retry.</p>}
  </div>;
}
