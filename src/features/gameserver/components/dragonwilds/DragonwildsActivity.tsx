import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DragonwildsServerState } from "../../types";
import { checkedTime } from "../../utils/dragonwilds";

const actionLabels = { start: "Server start", stop: "Server stop", "auto-stop": "Automatic stop", settings: "Settings updated" };
const resultLabels = { requested: "Requested", noop: "No change", blocked: "Blocked", failed: "Failed" };

export function DragonwildsActivity({ state, onRefresh }: { state: DragonwildsServerState; onRefresh: () => void }) {
  return <section aria-labelledby="dragonwilds-activity" aria-busy={state.loadingEvents} className="space-y-4 border-t pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="dragonwilds-activity" className="font-serif text-lg font-semibold">Recent activity</h2>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={state.loadingEvents || Boolean(state.action)}><RefreshCw className="h-4 w-4" />{state.loadingEvents ? "Loading activity..." : "Refresh activity"}</Button>
    </div>
    {state.eventsError && <p role="alert" className="text-sm text-destructive">{state.eventsError}</p>}
    {!state.loadingEvents && !state.eventsError && state.events.length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
    <ol className="divide-y">{state.events.map((entry) => <li key={entry.id} className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{actionLabels[entry.action]}</span><Badge variant={entry.result === "failed" || entry.result === "blocked" ? "destructive" : "secondary"}>{resultLabels[entry.result]}</Badge></div>
      <p className="break-words">{entry.message}</p>
      <p className="text-xs text-muted-foreground">{entry.requestedByDisplayName || entry.requestedByDiscordUserId} · {checkedTime(entry.createdAt)}</p>
    </li>)}</ol>
  </section>;
}
