import type { CraftingRequestMember } from "../../types";
import { MemberAvatar } from "./MemberAvatar";

export function MemberLine({
  label,
  member,
}: {
  label: string;
  member: CraftingRequestMember;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <MemberAvatar member={member} size="sm" />
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate font-medium">
        {member.characterName}
      </span>
    </div>
  );
}
