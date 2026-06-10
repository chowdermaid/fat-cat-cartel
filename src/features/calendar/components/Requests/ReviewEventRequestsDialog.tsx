import { useState } from "react";
import { Check, Clock, Inbox, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { firebaseApp } from "@/lib/firebase";
import {
  approveCalendarEventRequest,
  denyCalendarEventRequest,
  listCalendarEventRequests,
} from "../../api/calendarFunctions";
import {
  RAID_HELPER_PING_ROLES,
  SHORT_DATE_FORMATTER,
  TIME_FORMATTER,
} from "../../constants";
import type { CalendarEventRequest, PlannerEvent } from "../../types";

export function ReviewEventRequestsDialog({
  sessionToken,
  onApproved,
}: {
  sessionToken: string | null;
  onApproved: (event: PlannerEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<CalendarEventRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function loadRequests() {
    if ((!firebaseApp && !DEV_AUTH_LAYER_ENABLED) || !sessionToken) {
      toast.error("Firebase Functions are required to review event requests.");
      return;
    }

    setLoading(true);
    setFailed(false);
    try {
      setRequests(await listCalendarEventRequests(sessionToken));
    } catch (error) {
      setFailed(true);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load event requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(request: CalendarEventRequest) {
    if ((!firebaseApp && !DEV_AUTH_LAYER_ENABLED) || !sessionToken) return;
    setActingId(request.id);
    const toastId = `approve-calendar-event-request-${request.id}`;
    toast.loading("Approving event request...", { id: toastId });
    try {
      const created = await approveCalendarEventRequest(
        sessionToken,
        request.id,
      );
      if (created) onApproved(created);
      setRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );
      toast.success("Event request approved.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to approve event request.",
        { id: toastId },
      );
    } finally {
      setActingId(null);
    }
  }

  async function denyRequest(request: CalendarEventRequest) {
    if ((!firebaseApp && !DEV_AUTH_LAYER_ENABLED) || !sessionToken) return;
    setActingId(request.id);
    const toastId = `deny-calendar-event-request-${request.id}`;
    toast.loading("Denying event request...", { id: toastId });
    try {
      await denyCalendarEventRequest(sessionToken, request.id);
      setRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );
      toast.success("Event request denied.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deny event request.",
        { id: toastId },
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void loadRequests();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Inbox className="h-4 w-4" />
          Review Requests
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Event Requests</DialogTitle>
          <DialogDescription>Review event requests.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading requests...
          </div>
        ) : failed ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load event requests.
          </div>
        ) : requests.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-md border bg-muted/20 px-4 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No pending requests.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Housecat event requests will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[62vh] pr-3">
            <div className="space-y-3">
              {requests.map((request) => {
                const selectedRoles = RAID_HELPER_PING_ROLES.filter((role) =>
                  request.roleIds.includes(role.id),
                );
                const actionPending = actingId === request.id;
                return (
                  <div
                    key={request.id}
                    className="rounded-md border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">
                          {request.title}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {TIME_FORMATTER.format(new Date(request.startAt))}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {SHORT_DATE_FORMATTER.format(
                          new Date(request.submittedAt),
                        )}
                      </Badge>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {request.description || "No description"}
                    </p>

                    <div className="mt-4 flex min-w-0 items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
                      {request.creator.avatarUrl ? (
                        <img
                          src={request.creator.avatarUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {request.creator.characterName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {request.creator.fcRank || "Housecat"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Role pings
                      </p>
                      {selectedRoles.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedRoles.map((role) => {
                            const RoleIcon = role.icon;
                            return (
                              <Badge
                                key={role.id}
                                variant="secondary"
                                className="gap-1.5"
                              >
                                <RoleIcon className="h-3.5 w-3.5" />
                                {role.label}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          No role pings selected.
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => denyRequest(request)}
                        disabled={actingId !== null}
                      >
                        {actionPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Deny
                      </Button>
                      <Button
                        type="button"
                        onClick={() => approveRequest(request)}
                        disabled={actingId !== null}
                      >
                        {actionPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
