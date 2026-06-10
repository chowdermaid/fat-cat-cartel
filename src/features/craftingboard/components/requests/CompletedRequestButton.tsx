import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Member } from "@/types";
import type { CraftingRequestDashboardRecord, CraftingRequestMember } from "../../types";
import { safeArray } from "../../utils/arrays";
import { completedByMember } from "../../utils/craftingMembers";
import { commissionLabel, formatRequestDate, requestTitle } from "../../utils/formatting";
import { ItemIcon } from "../shared/ItemIcon";
import { RequestCard } from "./RequestCard";

export function CompletedRequestButton({
  request,
  currentMember,
  members,
  isAdmin,
  busy,
  onAccept,
  onComplete,
  onClose,
  onReopen,
}: {
  request: CraftingRequestDashboardRecord;
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  busy: boolean;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  onClose: (requestId: string) => void;
  onReopen: (requestId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const firstItem = safeArray(request.items)[0];
  const completedBy = completedByMember(request);

  return (
    <>
      <button
        type="button"
        data-request-id={request.id}
        className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left shadow-sm transition hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
      >
        <ItemIcon item={firstItem} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {requestTitle(request)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRequestDate(request.createdAt)}
            {" · "}
            {`Completed by ${completedBy.characterName}`}
            {request.commission?.offered
              ? ` - ${commissionLabel(request.commission)}`
              : ""}
          </p>
        </div>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completed request</DialogTitle>
            <DialogDescription>
              Finished request from recent completed list.
            </DialogDescription>
          </DialogHeader>
          <RequestCard
            request={request}
            currentMember={currentMember}
            members={members}
            isAdmin={isAdmin}
            busy={busy}
            onAccept={onAccept}
            onComplete={onComplete}
            onClose={onClose}
            onReopen={onReopen}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
