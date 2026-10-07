import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import staticIcon from "@/assets/fatcathi.png";

export function UcobEndpointAvatar({ cx = 0, cy = 0, name }: { cx?: number; cy?: number; name: string }) {
  return (
    <foreignObject x={cx - 18} y={cy - 18} width={36} height={36}>
      <Avatar className="h-9 w-9 border-2 border-amber-400 bg-background" aria-label={name}>
        <AvatarImage src={staticIcon} alt={name} className="object-contain p-0.5" />
        <AvatarFallback className="text-[10px] font-semibold">CC</AvatarFallback>
      </Avatar>
    </foreignObject>
  );
}
