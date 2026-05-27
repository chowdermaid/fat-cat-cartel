import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import {
  Cake,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMembers } from "@/hooks/useMembers";
import { cn } from "@/lib/utils";
import { db, get, ref } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import type { Member } from "@/types";
import type { MemberProfile } from "@/features/member-profile/types";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { callAdminFunction } from "@/features/admin/lib/adminFunctions";
import happyCat from "@/assets/fatcat/fc_happy_outline.png";

type BirthdayEvent = {
  type: "birthday";
  lodestoneId: string;
  name: string;
  avatarUrl: string | null;
  month: number;
  day: number;
};

type PlannerEvent = {
  type: "planner";
  id: string;
  title: string;
  description: string | null;
  startAt: number;
  endAt: number | null;
  location: string | null;
  sourceUrl: string | null;
  lastSyncedAt: number | null;
  status: string | null;
};

type CalendarEvent = BirthdayEvent | PlannerEvent;

type CalendarDay = {
  date: Date;
  inMonth: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const SHORT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  timeStyle: "short",
});
const DATE_BUTTON_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const RAID_HELPER_PING_ROLES: Array<{ label: string; id: string }> = [
  { label: "ROULETTES", id: "1339834783064264715" },
  { label: "MOUNT FARMING", id: "1375069801244004462" },
  { label: "TREASURE MAPS", id: "1339828715164532846" },
  { label: "FIELD OPERATIONS", id: "1339834667561648198" },
  { label: "RAIDS / TRIALS / VARIANT / DD", id: "1339833818055446621" },
  { label: "SOCIAL EVENTS", id: "1339835677457514567" },
  { label: "HUNTS / FATES / RED ALERTS", id: "1374967120235855946" },
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isValidBirthday(month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(2024, month);
}

function parseBirthday(
  value: string | null | undefined,
): { month: number; day: number } | null {
  if (!value) return null;
  const [monthRaw, dayRaw] = value.split("-");
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (!isValidBirthday(month, day)) return null;
  return { month, day };
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate: Date): CalendarDay[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === month,
    };
  });
}

function eventVisibleInYear(event: BirthdayEvent, year: number): boolean {
  return event.day <= daysInMonth(year, event.month);
}

function birthdayKey(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function sameMonth(date: Date, monthDate: Date): boolean {
  return (
    date.getFullYear() === monthDate.getFullYear() &&
    date.getMonth() === monthDate.getMonth()
  );
}

function BirthdayChip({ event }: { event: BirthdayEvent }) {
  return (
    <Link
      to="/members/$lodestoneId"
      params={{ lodestoneId: event.lodestoneId }}
      className="group flex min-w-0 items-center gap-1.5 rounded-md border bg-background/90 px-1.5 py-1 text-left text-[0.68rem] shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/10"
    >
      {event.avatarUrl ? (
        <img
          src={event.avatarUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
      <span className="truncate font-medium group-hover:text-primary">
        {event.name}
      </span>
    </Link>
  );
}

function PlannerTooltipContent({ event }: { event: PlannerEvent }) {
  return (
    <TooltipContent className="max-w-72 text-xs">
      <div className="space-y-2">
        <div>
          <p className="font-semibold text-popover-foreground">{event.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {TIME_FORMATTER.format(new Date(event.startAt))}
            {event.endAt
              ? ` - ${SHORT_TIME_FORMATTER.format(new Date(event.endAt))}`
              : ""}
          </p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {event.location}
            </p>
          )}
        </div>
        {event.description && (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {event.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-2 text-muted-foreground">
          <span>
            Synced{" "}
            {event.lastSyncedAt
              ? SHORT_DATE_FORMATTER.format(new Date(event.lastSyncedAt))
              : "recently"}
          </span>
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary"
            >
              Discord
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </TooltipContent>
  );
}

function PlannerChip({ event }: { event: PlannerEvent }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group flex w-full min-w-0 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-1 text-left text-[0.68rem] shadow-sm transition-colors hover:border-primary/60 hover:bg-primary/15"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate font-medium group-hover:text-primary">
            {event.title}
          </span>
        </button>
      </TooltipTrigger>
      <PlannerTooltipContent event={event} />
    </Tooltip>
  );
}

function LoadingGrid() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }, (_, index) => (
          <div
            key={index}
            className="min-h-28 border-b border-r p-2 last:border-r-0 sm:min-h-32"
          >
            <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-6 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarDayCell({
  day,
  events,
  today,
}: {
  day: CalendarDay;
  events: CalendarEvent[];
  today: Date;
}) {
  const isToday = sameDate(day.date, today);

  return (
    <div
      className={cn(
        "calendar-cell min-h-28 border-b border-r p-2 transition-colors last:border-r-0 sm:min-h-32",
        day.inMonth ? "bg-card" : "bg-muted/25 text-muted-foreground",
        isToday && "bg-primary/5",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-md text-xs font-semibold",
            isToday && "bg-primary text-primary-foreground",
          )}
        >
          {day.date.getDate()}
        </span>
        {events.length > 0 && (
          <Badge
            variant="outline"
            className="hidden px-1.5 py-0 text-[0.62rem] sm:inline-flex"
          >
            {events.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {events.map((event) =>
          event.type === "birthday" ? (
            <BirthdayChip key={`birthday-${event.lodestoneId}`} event={event} />
          ) : (
            <PlannerChip key={`planner-${event.id}`} event={event} />
          ),
        )}
      </div>
    </div>
  );
}

function parsePlannerEvents(value: unknown): PlannerEvent[] {
  const records =
    typeof value === "object" && value
      ? (value as Record<string, unknown>)
      : {};
  return Object.entries(records)
    .flatMap(([id, raw]) => {
      const event =
        typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      const title = typeof event.title === "string" ? event.title.trim() : "";
      const startAt = typeof event.startAt === "number" ? event.startAt : null;
      if (!title || !startAt) return [];
      return [
        {
          type: "planner" as const,
          id,
          title,
          description:
            typeof event.description === "string" && event.description.trim()
              ? event.description.trim()
              : null,
          startAt,
          endAt: typeof event.endAt === "number" ? event.endAt : null,
          location:
            typeof event.location === "string" && event.location.trim()
              ? event.location.trim()
              : null,
          sourceUrl:
            typeof event.sourceUrl === "string" && event.sourceUrl.trim()
              ? event.sourceUrl.trim()
              : null,
          lastSyncedAt:
            typeof event.lastSyncedAt === "number" ? event.lastSyncedAt : null,
          status:
            typeof event.status === "string" && event.status.trim()
              ? event.status.trim()
              : null,
        },
      ];
    })
    .sort((a, b) => a.startAt - b.startAt);
}

function plannerEventFromRecord(
  id: string,
  value: unknown,
): PlannerEvent | null {
  return parsePlannerEvents({ [id]: value })[0] ?? null;
}

function initialEventDate(): Date {
  const nextHour = new Date(Date.now() + 60 * 60_000);
  nextHour.setMinutes(0, 0, 0);
  return nextHour;
}

function timeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function dateAndTimeToTimestamp(date: Date | undefined, time: string): number {
  if (!date) return Number.NaN;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return Number.NaN;
  const next = new Date(date);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next.getTime();
}

function CreateEventDialog({
  adminSessionToken,
  onCreated,
}: {
  adminSessionToken: string | null;
  onCreated: (event: PlannerEvent) => void;
}) {
  const [open, setOpen] = useState(false);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseApp || !adminSessionToken) {
      toast.error(
        "Firebase Functions are required to create Raid Helper events.",
      );
      return;
    }

    const parsedStartAt = dateAndTimeToTimestamp(selectedDate, selectedTime);
    if (!title.trim() || !Number.isFinite(parsedStartAt)) {
      toast.error("Title and start time are required.");
      return;
    }

    setSubmitting(true);
    const id = "create-raid-helper-event";
    toast.loading("Creating Raid Helper event...", { id });
    try {
      const result = await callAdminFunction<{
        eventId: string;
        event: unknown;
      }>("createRaidHelperEvent", adminSessionToken, {
        title,
        description,
        startAt: parsedStartAt,
        // roleIds: selectedRoleIds,
      });
      const created = plannerEventFromRecord(result.eventId, result.event);
      if (created) onCreated(created);
      toast.success("Event created.", { id });
      setTitle("");
      setDescription("");
      const nextDate = initialEventDate();
      setSelectedDate(nextDate);
      setSelectedTime(timeInputValue(nextDate));
      setSelectedRoleIds([]);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create event.",
        { id },
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Raid Helper Event</DialogTitle>
          <DialogDescription>
            (currently uses my discord id plz dont make me look bad)
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="calendar-event-title">Title</Label>
            <Input
              id="calendar-event-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Start</Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarDays className="h-4 w-4" />
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
              <Input
                aria-label="Event start time"
                type="time"
                value={selectedTime}
                onChange={(event) => setSelectedTime(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-event-description">Description</Label>
            <textarea
              id="calendar-event-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1200}
              rows={5}
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <div>
              <p className="text-sm font-medium">
                Role Pings (doesnt work currently)
              </p>
            </div>
            {RAID_HELPER_PING_ROLES.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {RAID_HELPER_PING_ROLES.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={(event) => {
                        setSelectedRoleIds((current) =>
                          event.target.checked
                            ? [...current, role.id]
                            : current.filter((roleId) => roleId !== role.id),
                        );
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                No ping roles configured yet.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CalendarPage() {
  const members = useMembers();
  const auth = useAdminAuth();
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      setFailed(false);
      const [profileSnap, plannerSnap] = await Promise.all([
        get(ref(db, "memberProfiles")),
        get(ref(db, "calendarEvents")),
      ]);
      if (cancelled) return;
      setProfiles((profileSnap.val() ?? {}) as Record<string, MemberProfile>);
      setPlannerEvents(parsePlannerEvents(plannerSnap.val()));
      setLoading(false);
    }

    loadProfiles().catch(() => {
      if (cancelled) return;
      setProfiles({});
      setPlannerEvents([]);
      setFailed(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const birthdayEvents = useMemo(() => {
    return Object.entries(profiles)
      .flatMap(([lodestoneId, profile]) => {
        const birthday = parseBirthday(profile.birthday);
        const member = (members as Record<string, Member | undefined>)[
          lodestoneId
        ];
        if (!birthday || !member) return [];
        return [
          {
            type: "birthday" as const,
            lodestoneId,
            name: member.name,
            avatarUrl: member.avatarUrl,
            month: birthday.month,
            day: birthday.day,
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, profiles]);

  const visibleYear = visibleMonth.getFullYear();
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of birthdayEvents) {
      if (!eventVisibleInYear(event, visibleYear)) continue;
      const key = birthdayKey(event.month, event.day);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    for (const event of plannerEvents) {
      const key = dateKey(new Date(event.startAt));
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    for (const [key, items] of grouped) {
      grouped.set(
        key,
        items.sort((a, b) => {
          if (a.type === b.type) {
            if (a.type === "planner" && b.type === "planner")
              return a.startAt - b.startAt;
            return 0;
          }
          return a.type === "planner" ? -1 : 1;
        }),
      );
    }
    return grouped;
  }, [birthdayEvents, plannerEvents, visibleYear]);

  const visibleBirthdays = birthdayEvents.filter(
    (event) =>
      event.month === visibleMonth.getMonth() + 1 &&
      eventVisibleInYear(event, visibleYear),
  );
  const visiblePlannerEvents = plannerEvents.filter((event) =>
    sameMonth(new Date(event.startAt), visibleMonth),
  );
  const totalEvents = birthdayEvents.length + plannerEvents.length;
  const canCreateEvents = auth.authed && auth.session?.isAdmin === true;

  useEffect(() => {
    if (!pageRef.current || loading) return;
    animate(pageRef.current.querySelectorAll(".calendar-cell"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(8),
      duration: 220,
      easing: "easeOutQuad",
    });
  }, [loading, visibleMonth]);

  const today = new Date();

  return (
    <div ref={pageRef} className="relative space-y-5 overflow-hidden">
      <img
        src={happyCat}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 hidden w-28 opacity-60 sm:block md:w-36"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3 pr-0 sm:pr-32">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <CalendarDays className="h-7 w-7 text-muted-foreground" />
            Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Birthdays & Events!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const now = new Date();
              setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold font-serif">
                {MONTH_FORMATTER.format(visibleMonth)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleBirthdays.length + visiblePlannerEvents.length > 0
                  ? `${visibleBirthdays.length + visiblePlannerEvents.length} calendar item${visibleBirthdays.length + visiblePlannerEvents.length === 1 ? "" : "s"} this month`
                  : "No calendar items this month"}
              </p>
            </div>
            <div className="flex min-w-32 items-center gap-2 rounded-md border bg-background/70 px-3 py-2 ml-5">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold leading-none">
                  {visibleBirthdays.length}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Birthday{visibleBirthdays.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex min-w-32 items-center gap-2 rounded-md border bg-background/70 px-3 py-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold leading-none">
                  {visiblePlannerEvents.length}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Event{visiblePlannerEvents.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
          {canCreateEvents && (
            <CreateEventDialog
              adminSessionToken={auth.sessionToken}
              onCreated={(event) => {
                setPlannerEvents((current) => {
                  const withoutExisting = current.filter(
                    (item) => item.id !== event.id,
                  );
                  return [...withoutExisting, event].sort(
                    (a, b) => a.startAt - b.startAt,
                  );
                });
                const eventDate = new Date(event.startAt);
                setVisibleMonth(
                  new Date(eventDate.getFullYear(), eventDate.getMonth(), 1),
                );
              }}
            />
          )}
        </div>
      </div>

      {failed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load birthdays right now.
        </div>
      )}

      {loading ? (
        <LoadingGrid />
      ) : totalEvents === 0 ? (
        <div className="rounded-lg border bg-card px-4 py-10 text-center">
          <Cake className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No calendar items found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add birthdays to member profiles or sync Discord planner events.
          </p>
        </div>
      ) : (
        <TooltipProvider delayDuration={120}>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-1.5 py-2 text-center text-[0.68rem] font-medium text-muted-foreground sm:px-2 sm:text-xs"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const keys = [
                  birthdayKey(day.date.getMonth() + 1, day.date.getDate()),
                  dateKey(day.date),
                ];
                const dayEvents = day.inMonth
                  ? keys.flatMap((key) => eventsByDate.get(key) ?? [])
                  : [];
                return (
                  <CalendarDayCell
                    key={day.date.toISOString()}
                    day={day}
                    events={dayEvents}
                    today={today}
                  />
                );
              })}
            </div>
          </div>
        </TooltipProvider>
      )}

      {(visiblePlannerEvents.length > 0 || visibleBirthdays.length > 0) && (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">This Month</h2>
          </div>
          <div className="divide-y">
            {visiblePlannerEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIME_FORMATTER.format(new Date(event.startAt))}
                  </p>
                </div>
                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Open ${event.title} in Discord`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
            {visibleBirthdays.map((event) => (
              <Link
                key={event.lodestoneId}
                to="/members/$lodestoneId"
                params={{ lodestoneId: event.lodestoneId }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                {event.avatarUrl ? (
                  <img
                    src={event.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {SHORT_DATE_FORMATTER.format(
                      new Date(visibleYear, event.month - 1, event.day),
                    )}
                  </p>
                </div>
                <Cake className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
