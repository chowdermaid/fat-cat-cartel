import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantRow } from "./ParticipantRow";
import { useScoreboard } from "../api/useScoreboard";
import { Loader2, Wifi } from "lucide-react";

export function Scoreboard() {
  const { participants, loading, error } = useScoreboard();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-serif">
              Live Scoreboard
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Wifi className="h-3.5 w-3.5" />
            Live
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading scores…
          </div>
        )}

        {error && (
          <div className="py-16 text-center text-destructive">
            <p className="font-medium">Failed to load scoreboard</p>
            <p className="text-sm mt-1 text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && participants.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p>No participants yet — check back when the event starts!</p>
          </div>
        )}

        {!loading && !error && participants.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-12">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-center">Hide &amp; Seek</TableHead>
                <TableHead className="text-center">Trivia</TableHead>
                <TableHead className="text-center">Eorzea Guessr</TableHead>
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p, i) => (
                <ParticipantRow key={p.id} participant={p} rank={i + 1} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
