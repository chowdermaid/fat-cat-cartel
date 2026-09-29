import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DragonwildsServerState } from "../../types";
import { checkedTime, onlineLabel, validPlayerCount } from "../../utils/dragonwilds";

export function DragonwildsOnlineBoard({ state }: { state: DragonwildsServerState }) {
  const { status, telemetry, loadingStatus, loadingTelemetry, telemetryError } = state;
  const running = status?.enabled && status.status === "running" && !state.error;
  const loading = loadingStatus || loadingTelemetry;
  const count = telemetry?.playerCount;
  const names = validPlayerCount(count) && count > 0 && Array.isArray(telemetry?.players)
    ? telemetry.players.filter((player) => player && typeof player.name === "string" && player.name.trim()) : [];
  return (
    <section aria-labelledby="dragonwilds-online" aria-busy={loading} className="min-w-0 space-y-4 rounded-lg border p-4 sm:p-5">
      <h2 id="dragonwilds-online" className="flex items-center gap-2 font-serif text-lg font-semibold"><Users className="h-5 w-5 text-muted-foreground" />Online board</h2>
      <div className="min-h-24 space-y-2" role="status">
        <p className="text-xl font-semibold">{loading ? "Checking online status..." : running ? onlineLabel(count, telemetry?.maxPlayers) : "Player count unavailable"}</p>
        {!loading && !running && <p className="text-sm text-muted-foreground">{status?.status === "disabled" ? "Server access is disabled." : "Online details require a running host."}</p>}
        {!loading && running && count === 0 && <p className="text-sm text-muted-foreground">No players online in this snapshot.</p>}
        {!loading && running && telemetryError && <p className="text-sm text-muted-foreground">{telemetryError}</p>}
        {!loading && running && telemetry?.telemetryMessage && <p className="text-sm text-muted-foreground">{telemetry.telemetryMessage}</p>}
      </div>
      {!loading && running && names.length > 0 && <ScrollArea className="h-40"><ul className="space-y-2 text-sm">{names.map((player, index) => <li key={`${index}:${player.name}`} className="break-words rounded-md bg-muted/50 px-3 py-2">{player.name}</li>)}</ul></ScrollArea>}
      {!loading && running && telemetry && <p className="text-xs text-muted-foreground">Telemetry attempted: {checkedTime(telemetry.telemetryCheckedAt)}. Player observation time is not provided.</p>}
    </section>
  );
}
