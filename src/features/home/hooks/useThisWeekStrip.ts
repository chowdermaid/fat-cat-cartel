import { useEffect, useMemo, useState } from "react";
import { useMembers } from "@/hooks/useMembers";
import { readHomeCraftingStatus } from "../api/craftingStatus";
import { readHomeWeeklyData } from "../api/weeklyCalendar";
import type { HomeCraftingStatus, HomeWeeklyData } from "../types";
import {
  formatBirthdaySummary,
  summarizeCalendarNotices,
  summarizeNextBirthday,
  summarizeNextWeeklyEvent,
  summarizeWeeklyBirthdays,
} from "../utils/weeklyCalendar";

export function useHomeDashboardData() {
  const members = useMembers();
  const [data, setData] = useState<HomeWeeklyData>({
    profiles: {},
    plannerEvents: [],
  });
  const [craftingStatus, setCraftingStatus] = useState<HomeCraftingStatus>({
    inProgressCount: 0,
    openCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWeeklyData() {
      setLoading(true);
      setFailed(false);
      const [result, nextCraftingStatus] = await Promise.all([
        readHomeWeeklyData(),
        readHomeCraftingStatus(),
      ]);
      if (cancelled) return;
      setData(result);
      setCraftingStatus(nextCraftingStatus);
      setLoading(false);
    }

    loadWeeklyData().catch(() => {
      if (cancelled) return;
      setData({ profiles: {}, plannerEvents: [] });
      setCraftingStatus({ inProgressCount: 0, openCount: 0 });
      setFailed(true);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const memberCount = Object.values(members).filter(
      (member) => member.fcRank !== "Friend",
    ).length;
    const nextEvent = summarizeNextWeeklyEvent(data.plannerEvents);
    const birthdaySummary = summarizeWeeklyBirthdays({
      members,
      profiles: data.profiles,
    });
    const nextBirthday = summarizeNextBirthday({
      members,
      profiles: data.profiles,
    });

    return {
      birthdayPeople: birthdaySummary?.people ?? [],
      birthdayText: formatBirthdaySummary(birthdaySummary),
      craftingStatus,
      failed,
      loading,
      memberCount,
      nextBirthdayText: nextBirthday
        ? `${nextBirthday.name} - ${nextBirthday.when}`
        : "No birthdays on file.",
      nextEventText: nextEvent?.title ?? "No events posted yet.",
      nextEventWhen: nextEvent?.when ?? "Calendar is clear for now.",
      notices: summarizeCalendarNotices({
        plannerEvents: data.plannerEvents,
      }),
      profiles: data.profiles,
    };
  }, [craftingStatus, data.plannerEvents, data.profiles, failed, loading, members]);
}
