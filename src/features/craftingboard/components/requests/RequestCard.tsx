import { useState } from "react";
import { CheckCircle2, Coins, ExternalLink, HandHeart, Loader2, MessageSquareText, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Member } from "@/types";
import { materialStatusLabels } from "../../constants";
import type { CraftingRequestDashboardRecord, CraftingRequestMember } from "../../types";
import { safeArray } from "../../utils/arrays";
import { completedByMember, sameCraftingMember } from "../../utils/craftingMembers";
import { formatRequestDate, gilCommissionLabel, materialGuidanceText, requestTitle, statusLabel } from "../../utils/formatting";
import { handleNestedScrollAreaWheel } from "../../utils/scroll";
import { teamcraftImportUrl } from "../../utils/teamcraft";
import { ItemIcon } from "../shared/ItemIcon";
import { MemberLine } from "../shared/MemberLine";
import { EligibleCrafters } from "./EligibleCrafters";
import { RequestedItem } from "./RequestedItem";

export function RequestCard({
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
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const requestItems = safeArray(request.items);
  const firstItem = requestItems[0];
  const accepted = request.acceptedBy;
  const isAuthed = Boolean(currentMember);
  const isRequester = sameCraftingMember(currentMember, request.requester);
  const isAcceptedCrafter = sameCraftingMember(currentMember, accepted);
  const canAccept =
    isAuthed &&
    request.status === "open" &&
    !accepted &&
    (!isRequester || isAdmin);
  const canComplete =
    isAuthed &&
    request.status === "in_progress" &&
    (isRequester || isAcceptedCrafter || isAdmin);
  const canClose =
    isAuthed && request.status === "open" && (isRequester || isAdmin);
  const canReopen =
    isAuthed && request.status === "in_progress" && (isRequester || isAdmin);
  const teamcraftUrl = teamcraftImportUrl(requestItems);
  const gilLabel = gilCommissionLabel(request.commission);
  const showActions =
    isAuthed && (request.status === "open" || request.status === "in_progress");

  return (
    <>
      <Card
        data-request-id={request.id}
        className="flex max-h-130 flex-col overflow-hidden"
      >
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <ItemIcon item={firstItem} />
              <div className="min-w-0">
                <CardTitle className="line-clamp-2 font-serif text-xl leading-tight">
                  {requestTitle(request)}
                </CardTitle>
                <CardDescription>
                  {materialGuidanceText(request.materialStatus)}
                </CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {gilLabel && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-400/60 bg-amber-100/70 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200"
                >
                  <Coins className="h-3.5 w-3.5" />
                  {gilLabel}
                </Badge>
              )}
              <Badge variant="outline">
                {formatRequestDate(request.createdAt)}
              </Badge>
              <Badge
                variant={
                  request.status === "completed" ? "secondary" : "default"
                }
              >
                {statusLabel(request.status)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {materialStatusLabels[request.materialStatus]}
            </Badge>
            <Badge variant="outline">
              {request.itemCount} item{request.itemCount === 1 ? "" : "s"}
            </Badge>
          </div>
          {request.materialNote && (
            <p className="flex gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{request.materialNote}</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
          <div className="grid gap-2 text-sm">
            <MemberLine label="Requester" member={request.requester} />
            {accepted && <MemberLine label="Crafter" member={accepted} />}
            {request.status === "completed" && (
              <MemberLine
                label="Completed by"
                member={completedByMember(request)}
              />
            )}
          </div>

          <ScrollArea
            type="always"
            className="h-48 border-y bg-muted/10"
            viewportClassName="h-48"
            onWheelCapture={handleNestedScrollAreaWheel}
          >
            <div className="grid gap-2 py-2 pr-3 sm:grid-cols-2 lg:grid-cols-3">
              {requestItems.map((item) => (
                <RequestedItem
                  key={`${request.id}-${item.selectedRecipeId}`}
                  item={item}
                />
              ))}
            </div>
          </ScrollArea>

          {isAuthed && teamcraftUrl && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-fit px-2 text-xs"
              asChild
            >
              <a href={teamcraftUrl} target="_blank" rel="noreferrer">
                Export items to Teamcraft list
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}

          <EligibleCrafters items={requestItems} members={members} />
          {showActions &&
            (canAccept || canComplete || canClose || canReopen) && (
              <div className="flex flex-wrap gap-2">
                {canAccept && (
                  <Button
                    type="button"
                    size="sm"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => onAccept(request.id)}
                  >
                    {busy ? "Accepting..." : "Accept"}
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <HandHeart className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canComplete && (
                  <Button
                    type="button"
                    size="sm"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => onComplete(request.id)}
                  >
                    {busy ? "Completing..." : "Complete"}
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                {canClose && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => setCloseConfirmOpen(true)}
                  >
                    Close
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {canReopen && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-w-24"
                    disabled={busy}
                    onClick={() => onReopen(request.id)}
                  >
                    Reopen
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
        </CardContent>
      </Card>
      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close request?</DialogTitle>
            <DialogDescription>
              Closing this will count as completed. Continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canClose || busy}
              onClick={() => {
                setCloseConfirmOpen(false);
                onClose(request.id);
              }}
            >
              {busy ? "Closing..." : "Close request"}
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
