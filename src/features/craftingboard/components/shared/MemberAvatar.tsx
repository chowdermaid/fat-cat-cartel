import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CraftingRequestMember } from "../../types";

export function MemberAvatar({
  member,
  size = "md",
}: {
  member: Pick<CraftingRequestMember, "characterName" | "avatarUrl">;
  size?: "sm" | "md";
}) {
  const fallback = member.characterName.slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold",
        size === "sm" ? "h-6 w-6" : "h-8 w-8",
      )}
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        fallback || <UserRound className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
