import { useEffect, useRef, useState } from "react";
import { animate, type JSAnimation } from "animejs";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SpudJarAction } from "../types";

type ComplaintControlsProps = {
  total: number;
  activeAction: SpudJarAction | null;
  submitting: boolean;
  canReset: boolean;
  reducedMotion: boolean;
  breaking: boolean;
  runAction: (action: SpudJarAction) => Promise<void>;
};

export function ComplaintControls({
  total,
  activeAction,
  submitting,
  canReset,
  reducedMotion,
  breaking,
  runAction,
}: ComplaintControlsProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<JSAnimation | null>(null);
  const busy = activeAction !== null || breaking;

  useEffect(
    () => () => {
      animationRef.current?.revert();
    },
    [],
  );

  function addComplaint() {
    if (!reducedMotion && addButtonRef.current) {
      animationRef.current?.revert();
      animationRef.current = animate(addButtonRef.current, {
        scale: [1, 0.96, 1.025, 1],
        duration: 340,
        ease: "out(4)",
      });
    }
    void runAction("add");
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card/70 p-2 shadow-sm">
        <div className="grid grid-cols-[minmax(0,7fr)_minmax(7.5rem,3fr)] gap-2">
          <Button
            ref={addButtonRef}
            size="lg"
            className="h-14 rounded-md bg-[#A86F1B] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#8D5C16] dark:bg-[#D19A36] dark:text-[#21170D] dark:hover:bg-[#E0AA47]"
            disabled={busy}
            onClick={addComplaint}
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            Add coin
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 rounded-md border px-4 text-sm font-bold shadow-none hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            aria-label="Remove one Complaint Coin"
            title="Remove one Complaint Coin"
            disabled={busy || total === 0}
            onClick={() => void runAction("undo")}
          >
            <Minus className="h-5 w-5 stroke-[3]" />
            Remove coin
          </Button>
        </div>
      </div>

      {canReset && (
        <div className="flex justify-center border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
            disabled={busy || submitting || total === 0}
            onClick={() => setResetOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Reset jar
          </Button>
        </div>
      )}

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset the Spud Jar?</DialogTitle>
            <DialogDescription>
              This permanently clears the lifetime complaint total and every visible coin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy || submitting}
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy || submitting}
              onClick={() => {
                setResetOpen(false);
                void runAction("reset");
              }}
            >
              Reset jar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
