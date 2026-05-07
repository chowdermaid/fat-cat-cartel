import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sword } from "lucide-react";
import type { RecentKill } from "../types";

interface Props {
  kill: RecentKill;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

const DIFFICULTY_BADGE: Record<string, string> = {
  Savage: "bg-orange-400/15 text-orange-400",
  Normal: "bg-blue-400/15 text-blue-400",
  Ultimate: "bg-purple-400/15 text-purple-400",
};

export function RecentKillCard({ kill }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Sword className="h-4 w-4 text-muted-foreground" />
          Most Recent Kill
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold leading-tight">{kill.encounterName}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{timeAgo(kill.date)}</p>
          </div>
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_BADGE[kill.difficulty] ?? ""}`}>
            {kill.difficulty}
          </span>
        </div>
        <a
          href={`https://www.fflogs.com/reports/${kill.reportCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          View report on FFLogs
        </a>
      </CardContent>
    </Card>
  );
}
