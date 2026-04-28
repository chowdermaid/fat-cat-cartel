import type { MemberWithMounts } from "../types";

interface MemberHeaderProps {
  member: MemberWithMounts;
  totalMounts: number;
}

export function MemberHeader({ member, totalMounts }: MemberHeaderProps) {
  const count = member.ownedMountIds.size;
  const pct = totalMounts > 0 ? (count / totalMounts) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-2 min-w-[88px]">
      {member.avatar ? (
        <img
          src={member.avatar}
          alt={member.name}
          className="h-10 w-10 rounded-full border object-cover"
        />
      ) : (
        <div className="h-10 w-10 rounded-full border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
          {member.name[0]}
        </div>
      )}
      <p className="text-xs font-semibold text-center leading-tight">
        {member.name}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {count}/{totalMounts}
      </p>
      <div className="w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
