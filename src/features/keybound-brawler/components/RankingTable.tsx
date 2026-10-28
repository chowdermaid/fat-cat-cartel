import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RANK_AVATAR_CLASSES, RANK_CLASSES, RANK_CROWNS } from "../constants";
import type { RankedMember } from "../types";
import type { useScoreEditor } from "../hooks/useScoreEditor";
import { MemberAvatar } from "./MemberAvatar";
import { ScorePopover } from "./ScorePopover";

export function RankingTable({ rows, editor, canEdit }: { rows: RankedMember[]; editor: ReturnType<typeof useScoreEditor>; canEdit: boolean }) {
  return (
    <Table aria-label="Keybound Brawler rankings" className="table-fixed">
      <colgroup>
        <col className="w-15 @[640px]:w-22 @[900px]:w-36" />
        <col />
        <col className="w-28 @[640px]:w-56 @[900px]:w-80" />
      </colgroup>
      <TableBody>
        {rows.map((member) => (
          <TableRow key={member.lodestoneId} className="@[640px]:h-14.5 dark:border-border/70">
            <TableCell className="px-2 py-1.5 @[640px]:pl-4 @[900px]:pl-8">
              {member.rank === null ? <span className="text-[10px] text-muted-foreground @[640px]:text-xs">Unranked</span> : <span className={cn("flex items-center gap-1 font-serif text-xl font-bold tabular-nums @[640px]:w-16 @[640px]:justify-center @[640px]:gap-2 @[640px]:text-[1.75rem]", RANK_CLASSES[member.rank] ?? "text-muted-foreground")}>
                {RANK_CROWNS[member.rank] && <img src={RANK_CROWNS[member.rank]} alt="" aria-hidden="true" className="h-4 w-5 shrink-0 object-contain @[640px]:h-7 @[640px]:w-9" />}{member.rank}
              </span>}
            </TableCell>
            <TableCell className="px-2 py-1.5 @[640px]:px-4 @[900px]:px-6">
              <div className="flex min-w-0 items-center gap-2 @[640px]:gap-3 @[900px]:gap-7">
                <MemberAvatar member={member} className={cn("size-7 border-2 @[640px]:size-9 @[900px]:size-11", RANK_AVATAR_CLASSES[member.rank ?? 0])} />
                <span className="min-w-0 break-words text-xs font-medium @[640px]:text-base @[900px]:text-lg">{member.name}</span>
              </div>
            </TableCell>
            <TableCell className="px-2 py-1.5 text-right @[640px]:pr-4 @[640px]:pl-3 @[640px]:text-left @[900px]:pr-11">
              {canEdit ? <ScorePopover member={member} editor={editor} /> : <span className={cn("break-all font-mono text-sm tabular-nums @[640px]:text-xl", RANK_CLASSES[member.rank ?? 0], member.bestScore === null && "font-sans text-xs text-muted-foreground @[640px]:text-sm")}>
                {member.bestScore === null ? "No score" : member.bestScore.toLocaleString("en-AU")}
              </span>}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && <TableRow><TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">No roster members available.</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}
