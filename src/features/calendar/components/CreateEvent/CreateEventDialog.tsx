import { useEffect, useState, type FormEvent } from "react";
import ReactCountryFlag from "react-country-flag";
import { CalendarDays, Clock, Globe2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTrigger,
} from "@/components/reui/stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEV_AUTH_LAYER_ENABLED } from "@/lib/dev/personas";
import { firebaseApp } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  createRaidHelperEvent,
  submitCalendarEventRequest,
} from "../../api/calendarFunctions";
import {
  DATE_BUTTON_FORMATTER,
  DATE_TIME_PREVIEW_FORMATTER,
  HOURS,
  MINUTES,
  RAID_HELPER_PING_ROLES,
  TIME_ZONE_PREVIEWS,
} from "../../constants";
import type { CalendarEventRequest, PlannerEvent } from "../../types";
import {
  dateAndTimeToTimestamp,
  formatTimeZonePreview,
  initialEventDate,
  timeHour,
  timeInputValue,
  timeMinute,
  updateTimePart,
} from "../../utils/timeSelection";

export function CreateEventDialog({
  sessionToken,
  mode,
  onCreated,
  onSubmitted,
}: {
  sessionToken: string | null;
  mode: "direct" | "request";
  onCreated: (event: PlannerEvent) => void;
  onSubmitted?: (request: CalendarEventRequest) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    initialEventDate(),
  );
  const [selectedTime, setSelectedTime] = useState(() =>
    timeInputValue(initialEventDate()),
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);
  const parsedStartAt = dateAndTimeToTimestamp(selectedDate, selectedTime);
  const titleValid = title.trim().length > 0;
  const startValid =
    Number.isFinite(parsedStartAt) && parsedStartAt > Date.now() - 60_000;
  const canSubmit = titleValid && startValid;
  const selectedRoles = RAID_HELPER_PING_ROLES.filter((role) =>
    selectedRoleIds.includes(role.id),
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    const nextDate = initialEventDate();
    setSelectedDate(nextDate);
    setSelectedTime(timeInputValue(nextDate));
    setSelectedRoleIds([]);
    setStep(1);
    setConfirmReady(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step !== 4) {
      setStep((current) => Math.min(4, current + 1));
    }
  }

  async function createEvent() {
    if (step !== 4 || !confirmReady) return;
    if ((!firebaseApp && !DEV_AUTH_LAYER_ENABLED) || !sessionToken) {
      toast.error(
        mode === "direct"
          ? "Firebase Functions are required to create Raid Helper events."
          : "Firebase Functions are required to submit event requests.",
      );
      return;
    }

    if (!canSubmit) {
      toast.error("Title and start time are required.");
      return;
    }

    setSubmitting(true);
    const id =
      mode === "direct"
        ? "create-raid-helper-event"
        : "submit-calendar-event-request";
    toast.loading(
      mode === "direct"
        ? "Creating Raid Helper event..."
        : "Submitting event request...",
      { id },
    );
    try {
      if (mode === "direct") {
        const created = await createRaidHelperEvent(sessionToken, {
          title,
          description,
          startAt: parsedStartAt,
          roleIds: selectedRoleIds,
        });
        if (created) onCreated(created);
        toast.success("Event created.", { id });
      } else {
        const request = await submitCalendarEventRequest(sessionToken, {
          title,
          description,
          startAt: parsedStartAt,
          roleIds: selectedRoleIds,
        });
        if (request) onSubmitted?.(request);
        toast.success("Event request submitted.", { id });
      }
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : mode === "direct"
            ? "Failed to create event."
            : "Failed to submit event request.",
        { id },
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    setConfirmReady(false);
    if (step !== 4) return;
    const timeoutId = window.setTimeout(() => setConfirmReady(true), 350);
    return () => window.clearTimeout(timeoutId);
  }, [step]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setStep(1);
          setConfirmReady(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90vh,760px)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Raid Helper Event</DialogTitle>
          <DialogDescription>
            {mode === "direct"
              ? "Admin detected, you can create events directly."
              : "Create an event!"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Stepper value={step} onValueChange={setStep}>
            <StepperNav>
              {[
                { step: 1, label: "Details" },
                { step: 2, label: "Date" },
                { step: 3, label: "Pings" },
                { step: 4, label: "Confirm" },
              ].map((item) => (
                <StepperItem key={item.step} step={item.step}>
                  <StepperTrigger step={item.step}>
                    <StepperIndicator>{item.step}</StepperIndicator>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                  </StepperTrigger>
                </StepperItem>
              ))}
            </StepperNav>

            <StepperPanel>
              <StepperContent value={1}>
                <div className="space-y-2">
                  <Label htmlFor="calendar-event-title">Title</Label>
                  <Input
                    id="calendar-event-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                    required
                    aria-invalid={!titleValid}
                  />
                  {!titleValid && (
                    <p className="text-xs text-destructive">
                      Title is required.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-event-description">
                    Description
                  </Label>
                  <textarea
                    id="calendar-event-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={1200}
                    rows={8}
                    className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </StepperContent>

              <StepperContent value={2}>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground",
                            )}
                          >
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {selectedDate
                              ? DATE_BUTTON_FORMATTER.format(selectedDate)
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Start time</Label>
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                        <Select
                          value={timeHour(selectedTime)}
                          onValueChange={(value) =>
                            setSelectedTime((current) =>
                              updateTimePart(current, "hour", value),
                            )
                          }
                        >
                          <SelectTrigger aria-label="Event start hour">
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {HOURS.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={timeMinute(selectedTime)}
                          onValueChange={(value) =>
                            setSelectedTime((current) =>
                              updateTimePart(current, "minute", value),
                            )
                          }
                        >
                          <SelectTrigger aria-label="Event start minute">
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {MINUTES.map((minute) => (
                              <SelectItem key={minute} value={minute}>
                                {minute}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {!startValid && (
                        <p className="text-xs text-destructive">
                          Pick a future date and time.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                      Local previews
                    </div>
                    <div className="space-y-2">
                      {TIME_ZONE_PREVIEWS.map((zone) => (
                        <div
                          key={zone.timeZone}
                          className="flex min-w-0 items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-xs"
                        >
                          <ReactCountryFlag
                            countryCode={zone.countryCode}
                            svg
                            aria-hidden="true"
                            className="shrink-0 text-sm leading-none"
                          />
                          <div className="min-w-0">
                            <p className="font-medium">{zone.label}</p>
                            <p className="truncate text-muted-foreground">
                              {formatTimeZonePreview(
                                parsedStartAt,
                                zone.timeZone,
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </StepperContent>

              <StepperContent value={3}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {RAID_HELPER_PING_ROLES.map((role) => {
                    const checked = selectedRoleIds.includes(role.id);
                    const RoleIcon = role.icon;
                    return (
                      <label
                        key={role.id}
                        className={cn(
                          "flex min-h-16 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/60",
                          checked && "border-primary bg-primary/10",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            setSelectedRoleIds((current) =>
                              nextChecked === true
                                ? [...current, role.id]
                                : current.filter(
                                    (roleId) => roleId !== role.id,
                                  ),
                            );
                          }}
                        />
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70">
                          <RoleIcon className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1 font-medium">
                          {role.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Role pings are optional. Selected roles will be mentioned
                  after the planner post is created.
                </p>
              </StepperContent>

              <StepperContent value={4}>
                <div className="grid gap-3">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Event
                    </p>
                    <p className="mt-1 text-base font-semibold">
                      {title.trim() || "Missing title"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {description.trim() || "No description"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Start
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {Number.isFinite(parsedStartAt)
                        ? DATE_TIME_PREVIEW_FORMATTER.format(
                            new Date(parsedStartAt),
                          )
                        : "Missing date or time"}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
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
                  {!canSubmit && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      Add a title and a future start date before creating the
                      event.
                    </div>
                  )}
                </div>
              </StepperContent>
            </StepperPanel>
          </Stepper>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={submitting || step === 1}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep((current) => Math.min(4, current + 1))}
                disabled={submitting}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={createEvent}
                disabled={submitting || !canSubmit || !confirmReady}
              >
                {submitting
                  ? mode === "direct"
                    ? "Creating..."
                    : "Submitting..."
                  : mode === "direct"
                    ? "Create Event"
                    : "Submit for Approval"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
