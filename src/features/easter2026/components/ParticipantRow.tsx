import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types";

interface ParticipantRowProps {
  participant: Participant;
  rank: number;
}

const rankStyles: Record<number, string> = {
  1: "bg-yellow-50 dark:bg-yellow-950/30",
  2: "bg-gray-50 dark:bg-gray-900/30",
  3: "bg-orange-50 dark:bg-orange-950/30",
};

const rankLabels: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function ParticipantRow({ participant, rank }: ParticipantRowProps) {
  const { name, scores, total } = participant;

  return (
    <TableRow className={cn(rankStyles[rank])}>
      <TableCell className="font-medium w-12 text-center">
        {rankLabels[rank] ?? rank}
      </TableCell>
      <TableCell className="font-semibold">{name}</TableCell>
      <TableCell className="text-center">{scores.hideAndSeek}</TableCell>
      <TableCell className="text-center">{scores.trivia}</TableCell>
      <TableCell className="text-center">{scores.eorzoaGuessr}</TableCell>
      <TableCell className="text-center font-bold text-lg">{total}</TableCell>
    </TableRow>
  );
}
