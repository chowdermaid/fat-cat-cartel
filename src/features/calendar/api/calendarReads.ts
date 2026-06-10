import { getDevCalendarEvents } from "@/lib/dev/callables";
import { db, get, ref } from "@/lib/db";
import type { MemberProfile } from "@/features/member-profile/types";
import type { PlannerEvent } from "../types";
import { parsePlannerEvents } from "../utils/eventParsing";

export async function readCalendarData(): Promise<{
  profiles: Record<string, MemberProfile>;
  plannerEvents: PlannerEvent[];
}> {
  const [profileSnap, plannerSnap] = await Promise.all([
    get(ref(db, "memberProfiles")),
    get(ref(db, "calendarEvents")),
  ]);

  return {
    profiles: (profileSnap.val() ?? {}) as Record<string, MemberProfile>,
    plannerEvents: parsePlannerEvents({
      ...((plannerSnap.val() ?? {}) as Record<string, unknown>),
      ...getDevCalendarEvents(),
    }),
  };
}
