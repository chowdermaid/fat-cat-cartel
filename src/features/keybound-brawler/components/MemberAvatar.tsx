import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RankedMember } from "../types";

export function MemberAvatar({ member, className }: { member: RankedMember; className?: string }) {
  return (
    <Avatar className={cn("size-9 border border-primary/60", className)}>
      <AvatarImage src={member.avatarUrl ?? undefined} alt="" />
      <AvatarFallback className="text-sm font-semibold text-muted-foreground">
        {member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
      </AvatarFallback>
    </Avatar>
  );
}
