import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeleteTarget } from "../../types";

type MemberDeleteDialogProps = {
  deleteTarget: DeleteTarget | null;
  deletingMember: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MemberDeleteDialog({
  deleteTarget,
  deletingMember,
  onOpenChange,
  onCancel,
  onConfirm,
}: MemberDeleteDialogProps) {
  return (
    <Dialog open={!!deleteTarget} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {deleteTarget?.name ?? "member"}?</DialogTitle>
          <DialogDescription>
            This removes the character from the tracked roster and blocks automatic reimport from future syncs until an admin adds them again.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium">{deleteTarget?.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {deleteTarget?.id}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={deletingMember}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deletingMember}
          >
            <Trash2 className="h-4 w-4" />
            {deletingMember ? "Removing..." : "Remove Character"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
