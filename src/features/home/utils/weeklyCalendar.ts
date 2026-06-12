import type { Member } from "@/types";
import { parseBirthday } from "@/features/calendar/utils/birthday";
import type { MemberProfile } from "@/features/member-profile/types";
import type { PlannerEvent } from "@/features/calendar/types";
import type {
  HomeNotice,
  HomeNoticeItem,
  HomeWeeklyBirthdaySummary,
  HomeWeeklyEventSummary,
} from "../types";

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const NOTICE_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfWeekWindow(now: Date): Date {
  const end = startOfDay(now);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return end;
}

function nextBirthdayDate(month: number, day: number, now: Date): Date | null {
  const today = startOfDay(now);
  const candidates = [
    new Date(now.getFullYear(), month - 1, day),
    new Date(now.getFullYear() + 1, month - 1, day),
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day &&
        candidate >= today,
    ) ?? null
  );
}

export function summarizeNextWeeklyEvent(
  plannerEvents: PlannerEvent[],
  now = new Date(),
): HomeWeeklyEventSummary | null {
  const nextEvent = plannerEvents
    .filter((event) => event.startAt >= now.getTime())
    .sort((a, b) => a.startAt - b.startAt)[0];

  if (!nextEvent) return null;

  const start = new Date(nextEvent.startAt);
  return {
    title: nextEvent.title,
    when: `${DATE_FORMATTER.format(start)} at ${TIME_FORMATTER.format(start)}`,
  };
}

export function summarizeWeeklyBirthdays({
  members,
  now = new Date(),
  profiles,
}: {
  members: Record<string, Member>;
  now?: Date;
  profiles: Record<string, MemberProfile>;
}): HomeWeeklyBirthdaySummary | null {
  const today = startOfDay(now);
  const windowEnd = endOfWeekWindow(now);

  const birthdays = Object.entries(profiles)
    .flatMap(([lodestoneId, profile]) => {
      const birthday = parseBirthday(profile.birthday);
      const member = members[lodestoneId];
      if (!birthday || !member) return [];
      const nextDate = nextBirthdayDate(birthday.month, birthday.day, now);
      if (!nextDate || nextDate < today || nextDate > windowEnd) return [];
      return [{ name: member.name, avatarUrl: member.avatarUrl, nextDate }];
    })
    .sort((a, b) => {
      const dateDiff = a.nextDate.getTime() - b.nextDate.getTime();
      return dateDiff === 0 ? a.name.localeCompare(b.name) : dateDiff;
    });

  if (birthdays.length === 0) return null;

  return {
    people: birthdays.slice(0, 2).map((birthday) => ({
      name: birthday.name,
      avatarUrl: birthday.avatarUrl,
    })),
    remaining: Math.max(0, birthdays.length - 2),
  };
}

export function formatBirthdaySummary(
  summary: HomeWeeklyBirthdaySummary | null,
): string {
  if (!summary) return "No birthdays this week.";
  const names = summary.people.map((person) => person.name).join(", ");
  return summary.remaining > 0 ? `${names} +${summary.remaining} more` : names;
}

export function summarizeCalendarNotices({
  fallbackNotices,
  minimumCount = 9,
  now = new Date(),
  plannerEvents,
}: {
  fallbackNotices: readonly HomeNotice[];
  minimumCount?: number;
  now?: Date;
  plannerEvents: PlannerEvent[];
}): HomeNoticeItem[] {
  const calendarNotices = plannerEvents
    .filter((event) => event.startAt >= now.getTime())
    .sort((a, b) => a.startAt - b.startAt)
    .map((event) => ({
      title: event.title,
      body:
        event.description?.trim() ||
        event.location?.trim() ||
        "See calendar for details.",
      tag: NOTICE_DATE_FORMATTER.format(new Date(event.startAt)),
      to: "/calendar" as const,
    }));

  if (calendarNotices.length >= minimumCount) return calendarNotices;

  const missingCount = minimumCount - calendarNotices.length;
  const fallbackFill =
    fallbackNotices.length === 0
      ? []
      : Array.from(
          { length: missingCount },
          (_, index) => fallbackNotices[index % fallbackNotices.length],
        );

  return [...calendarNotices, ...fallbackFill];
}
