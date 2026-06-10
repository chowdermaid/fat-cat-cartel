import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function QuantityControl({
  value,
  onChange,
  editable = true,
  centered = true,
}: {
  value: number;
  onChange: (value: number) => void;
  editable?: boolean;
  centered?: boolean;
}) {
  const setSafeValue = (next: number) =>
    onChange(Math.max(1, Math.floor(next || 1)));

  return (
    <div
      className={cn(
        "flex w-fit items-center rounded-md border",
        centered && "mx-auto",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-r-none"
        onClick={() => setSafeValue(value - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      {editable ? (
        <Input
          value={value}
          min={1}
          type="number"
          inputMode="numeric"
          className="h-9 w-16 rounded-none border-y-0 text-center"
          onChange={(event) => setSafeValue(Number(event.target.value))}
          onBlur={(event) => setSafeValue(Number(event.target.value))}
          aria-label="Quantity"
        />
      ) : (
        <span
          className="flex h-9 w-16 items-center justify-center border-x text-sm font-medium tabular-nums"
          aria-label="Quantity"
        >
          {value}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-l-none"
        onClick={() => setSafeValue(value + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
