import type { MemberData, ParseEntry, ZoneData } from "../types";

interface MemberIdentity {
  name?: string;
  server?: string;
  avatarUrl?: string | null;
  fcRank?: string | null;
}

export function mergeRaidStatsMembers(
  data: ZoneData | null,
  members: Record<string, MemberIdentity>,
): Record<string, MemberData> {
  if (!data) return {};
  const ids = new Set([
    ...Object.keys(data.parses ?? {}),
    ...Object.keys(data.members ?? {}),
  ]);
  return Object.fromEntries(
    [...ids].map((id) => {
      const parse: ParseEntry = data.parses?.[id] ?? {
        savage: {},
        normal: {},
        allStars: null,
      };
      const identity = members[id];
      return [
        id,
        {
          ...parse,
          name: identity?.name ?? "Unknown",
          server: identity?.server ?? "",
          lodestoneId: id,
          avatarUrl: identity?.avatarUrl ?? null,
          fcRank: identity?.fcRank ?? null,
          isFriend: identity?.fcRank === "Friend",
          tomestone: data.members?.[id] ?? null,
        },
      ];
    }),
  );
}
