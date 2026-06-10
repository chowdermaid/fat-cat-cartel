import type { CalendarEventRequest, PlannerEvent } from "../types";

export function parsePlannerEvents(value: unknown): PlannerEvent[] {
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

export function plannerEventFromRecord(
  id: string,
  value: unknown,
): PlannerEvent | null {
  return parsePlannerEvents({ [id]: value })[0] ?? null;
}

export function parseCalendarEventRequests(
  value: unknown,
): CalendarEventRequest[] {
  const records = Array.isArray(value)
    ? Object.fromEntries(
        value.flatMap((item) => {
          const record =
            typeof item === "object" && item
              ? (item as Record<string, unknown>)
              : {};
          const id = typeof record.id === "string" ? record.id : "";
          return id ? [[id, record]] : [];
        }),
      )
    : typeof value === "object" && value
      ? (value as Record<string, unknown>)
      : {};

  return Object.entries(records)
    .flatMap(([id, raw]) => {
      const record =
        typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {};
      const creator =
        typeof record.creator === "object" && record.creator
          ? (record.creator as Record<string, unknown>)
          : {};
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const startAt =
        typeof record.startAt === "number" ? record.startAt : null;
      const submittedAt =
        typeof record.submittedAt === "number" ? record.submittedAt : null;
      const discordUserId =
        typeof creator.discordUserId === "string"
          ? creator.discordUserId.trim()
          : "";
      const lodestoneId =
        typeof creator.lodestoneId === "string"
          ? creator.lodestoneId.trim()
          : "";
      const characterName =
        typeof creator.characterName === "string"
          ? creator.characterName.trim()
          : "";

      if (
        !id ||
        !title ||
        !startAt ||
        !submittedAt ||
        !discordUserId ||
        !lodestoneId ||
        !characterName
      ) {
        return [];
      }

      const roleIds = Array.isArray(record.roleIds)
        ? record.roleIds.filter(
            (roleId): roleId is string => typeof roleId === "string",
          )
        : [];

      return [
        {
          id,
          title,
          description:
            typeof record.description === "string" && record.description.trim()
              ? record.description.trim()
              : null,
          startAt,
          roleIds,
          submittedAt,
          creator: {
            discordUserId,
            lodestoneId,
            characterName,
            fcRank:
              typeof creator.fcRank === "string" && creator.fcRank.trim()
                ? creator.fcRank.trim()
                : null,
            avatarUrl:
              typeof creator.avatarUrl === "string" && creator.avatarUrl.trim()
                ? creator.avatarUrl.trim()
                : null,
          },
        },
      ];
    })
    .sort((a, b) => a.submittedAt - b.submittedAt);
}
