import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MemberWithMounts } from "../../types";

interface MemberHeaderProps {
  member: MemberWithMounts;
  total: number;
  count: number;
  showFriendBadge?: boolean;
}

export function MemberHeader({
  member,
  total,
  count,
  showFriendBadge = false,
}: MemberHeaderProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-1.5 w-32 min-w-32 px-3 py-3">
      <Avatar aria-hidden="true" className="h-8 w-8 border">
        <AvatarImage src={member.avatar || undefined} alt="" />
        <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
      </Avatar>
      <p className="text-xs font-semibold w-full break-words text-center leading-tight text-foreground">
        {member.name}
      </p>
      {showFriendBadge && member.isFriend && (
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] leading-none text-secondary-foreground">
          Friend
        </span>
      )}
      <p className="text-xs text-muted-foreground tabular-nums">
        {count}/{total} <span className="ml-1">{Math.round(pct)}%</span>
      </p>
      <div className="w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
