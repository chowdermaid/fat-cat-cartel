import { readCalendarData } from "@/features/calendar/api/calendarReads";
import type { HomeWeeklyData } from "../types";

export async function readHomeWeeklyData(): Promise<HomeWeeklyData> {
  return readCalendarData();
}
