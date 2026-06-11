import { callAdminFunction } from "@/features/admin/api/adminFunctions";
import type { CalendarEventRequest, PlannerEvent } from "../types";
import {
  parseCalendarEventRequests,
  plannerEventFromRecord,
} from "../utils/eventParsing";

export async function createRaidHelperEvent(
  sessionToken: string,
  data: {
    title: string;
    description: string;
    startAt: number;
    roleIds: string[];
  },
): Promise<PlannerEvent | null> {
  const result = await callAdminFunction<{
    eventId: string;
    event: unknown;
  }>("createRaidHelperEvent", sessionToken, data);
  return plannerEventFromRecord(result.eventId, result.event);
}

export async function submitCalendarEventRequest(
  sessionToken: string,
  data: {
    title: string;
    description: string;
    startAt: number;
    roleIds: string[];
  },
): Promise<CalendarEventRequest | null> {
  const result = await callAdminFunction<{
    request: unknown;
  }>("submitCalendarEventRequest", sessionToken, data);
  return parseCalendarEventRequests([result.request])[0] ?? null;
}

export async function listCalendarEventRequests(
  sessionToken: string,
): Promise<CalendarEventRequest[]> {
  const result = await callAdminFunction<{
    requests: unknown;
  }>("listCalendarEventRequests", sessionToken);
  return parseCalendarEventRequests(result.requests);
}

export async function approveCalendarEventRequest(
  sessionToken: string,
  requestId: string,
): Promise<PlannerEvent | null> {
  const result = await callAdminFunction<{
    eventId: string;
    event: unknown;
  }>("approveCalendarEventRequest", sessionToken, {
    requestId,
  });
  return plannerEventFromRecord(result.eventId, result.event);
}

export function denyCalendarEventRequest(
  sessionToken: string,
  requestId: string,
): Promise<unknown> {
  return callAdminFunction("denyCalendarEventRequest", sessionToken, {
    requestId,
  });
}
