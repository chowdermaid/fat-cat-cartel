import type { MemberData, ParseBuckets } from "../types";

export function emptyBuckets(): ParseBuckets {
  return { grey: 0, green: 0, blue: 0, purple: 0, orange: 0, pink: 0, gold: 0 };
}

export function percentileBucket(p: number): keyof ParseBuckets {
  if (p >= 100) return "gold";
  if (p >= 99) return "pink";
  if (p >= 95) return "orange";
  if (p >= 75) return "purple";
  if (p >= 50) return "blue";
  if (p >= 25) return "green";
  return "grey";
}

export function buildScopedHistogram(
  members: Record<string, MemberData>,
  encounters: Array<{ key: string }>,
): Record<string, { savage: ParseBuckets; normal: ParseBuckets }> {
  const histogram = Object.fromEntries(
    encounters.map((enc) => [
      enc.key,
      { savage: emptyBuckets(), normal: emptyBuckets() },
    ]),
  ) as Record<string, { savage: ParseBuckets; normal: ParseBuckets }>;

  for (const member of Object.values(members)) {
    for (const [key, parse] of Object.entries(member.savage ?? {})) {
      if (!parse || !histogram[key]) continue;
      histogram[key].savage[percentileBucket(parse.percentile)]++;
    }
    for (const [key, parse] of Object.entries(member.normal ?? {})) {
      if (!parse || !histogram[key]) continue;
      histogram[key].normal[percentileBucket(parse.percentile)]++;
    }
  }

  return histogram;
}
