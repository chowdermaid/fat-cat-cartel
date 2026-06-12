import { useEffect, useMemo, useState } from "react";
import { useMembers } from "@/hooks/useMembers";
import { readHomeOpenErrands } from "../api/openErrand";
import { readHomeWeeklyData } from "../api/weeklyCalendar";
import type { CraftingRequestDashboardRecord } from "@/features/craftingboard/types";
import type { HomeWeeklyData } from "../types";
import { HOME_NOTICES } from "../constants";
import { summarizeOpenErrand } from "../utils/openErrand";
import {
  formatBirthdaySummary,
  summarizeCalendarNotices,
  summarizeNextWeeklyEvent,
  summarizeWeeklyBirthdays,
} from "../utils/weeklyCalendar";

export function useHomeDashboardData() {
  const members = useMembers();
  const [data, setData] = useState<HomeWeeklyData>({
    profiles: {},
    plannerEvents: [],
  });
  const [openErrands, setOpenErrands] = useState<
    CraftingRequestDashboardRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyData() {
      setLoading(true);
      setFailed(false);
      const [result, nextOpenErrands] = await Promise.all([
        readHomeWeeklyData(),
        readHomeOpenErrands(),
      ]);
      if (cancelled) return;
      setData(result);
      setOpenErrands(nextOpenErrands);
      setLoading(false);
    }

    loadWeeklyData().catch(() => {
      if (cancelled) return;
      setData({ profiles: {}, plannerEvents: [] });
      setOpenErrands([]);
      setFailed(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const nextEvent = summarizeNextWeeklyEvent(data.plannerEvents);
    const birthdaySummary = summarizeWeeklyBirthdays({
      members,
      profiles: data.profiles,
    });
    const openErrand = summarizeOpenErrand(openErrands);

    return {
      birthdayPeople: birthdaySummary?.people ?? [],
      birthdayText: formatBirthdaySummary(birthdaySummary),
      failed,
      loading,
      nextEventText: nextEvent?.title ?? "No events posted yet.",
      nextEventWhen: nextEvent?.when ?? "Calendar is clear for now.",
      notices: summarizeCalendarNotices({
        fallbackNotices: HOME_NOTICES,
        plannerEvents: data.plannerEvents,
      }),
      openErrand,
    };
  }, [data.plannerEvents, data.profiles, failed, loading, members, openErrands]);
}
