import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MathTooltip } from "../MathTooltip";

export function AddCurrentCraftButton({
  disabled,
  onAdd,
  tooltip,
}: {
  disabled: boolean;
  onAdd: () => void;
  tooltip: string;
}) {
  return (
    <MathTooltip content={tooltip}>
      <Button
        type="button"
        className="gap-2 shadow-lg"
        disabled={disabled}
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Add current craft
      </Button>
    </MathTooltip>
  );
}
