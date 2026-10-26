import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Player } from "../../types";
import { cn } from "@/lib/utils";

export function PlayerAvatar({ player, className }: { player: Pick<Player, "name" | "avatarUrl">; className?: string }) {
  const initials = player.name.split(" ").slice(0, 2).map((word) => word[0]).join("");
  return (
    <Avatar aria-hidden="true" className={cn("size-12 shrink-0 border", className)}>
      <AvatarImage src={player.avatarUrl ?? undefined} alt="" />
      <AvatarFallback className="bg-muted text-sm font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}
