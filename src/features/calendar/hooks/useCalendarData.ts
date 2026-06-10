import { useEffect, useMemo, useState } from "react";
import { useMembers } from "@/hooks/useMembers";
import type { Member } from "@/types";
import type { MemberProfile } from "@/features/member-profile/types";
import { readCalendarData } from "../api/calendarReads";
import type { PlannerEvent } from "../types";
import { parseBirthday } from "../utils/birthday";
import {
  buildCalendarDays,
  eventVisibleInYear,
  sameMonth,
} from "../utils/calendarDates";
import { groupEventsByDate } from "../utils/eventGrouping";

export function useCalendarData(visibleMonth: Date) {
  const members = useMembers();
  const [profiles, setProfiles] = useState<Record<string, MemberProfile>>({});
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      setLoading(true);
      setFailed(false);
      const result = await readCalendarData();
      if (cancelled) return;
      setProfiles(result.profiles);
      setPlannerEvents(result.plannerEvents);
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
  const eventsByDate = useMemo(
    () =>
      groupEventsByDate({
        birthdayEvents,
        plannerEvents,
        visibleYear,
      }),
    [birthdayEvents, plannerEvents, visibleYear],
  );
  const visibleBirthdays = birthdayEvents.filter(
    (event) =>
      event.month === visibleMonth.getMonth() + 1 &&
      eventVisibleInYear(event, visibleYear),
  );
  const visiblePlannerEvents = plannerEvents.filter((event) =>
    sameMonth(new Date(event.startAt), visibleMonth),
  );
  const totalEvents = birthdayEvents.length + plannerEvents.length;

  return {
    birthdayEvents,
    calendarDays,
    eventsByDate,
    failed,
    loading,
    plannerEvents,
    setPlannerEvents,
    totalEvents,
    visibleBirthdays,
    visiblePlannerEvents,
    visibleYear,
  };
}
