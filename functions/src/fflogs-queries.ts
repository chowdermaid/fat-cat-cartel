export const GUILD_ID = 139556;

export const DIFFICULTY = { normal: 100, savage: 101 } as const;

export async function queryFFLogs(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
  maxRetries = 2,
): Promise<unknown> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch("https://www.fflogs.com/api/v2/client", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfterSec = parseInt(res.headers.get("Retry-After") ?? "0") || 0;
      // If FFLogs wants us to wait > 30s, fail immediately — can't hold a cloud function that long
      if (attempt === maxRetries || retryAfterSec > 30) {
        throw new Error(`FFLogs GraphQL request failed: 429 (retry-after=${retryAfterSec}s)`);
      }
      const delayMs = retryAfterSec > 0 ? retryAfterSec * 1000 : (attempt + 1) * 1000;
      console.warn(`[fflogs] 429 — waiting ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    if (!res.ok) throw new Error(`FFLogs GraphQL request failed: ${res.status}`);
    const json = (await res.json()) as { data?: unknown; errors?: unknown[] };
    if (json.errors?.length) throw new Error(`FFLogs errors: ${JSON.stringify(json.errors)}`);
    return json.data;
  }
  throw new Error("FFLogs query failed: unreachable");
}

export const GUILD_MEMBERS_QUERY = `
  query GuildMembers($guildID: Int!) {
    guildData {
      guild(id: $guildID) {
        members {
          data {
            id
            name
            server { slug }
          }
        }
      }
    }
  }
`;

/**
 * Builds a combined per-character zone rankings query using GraphQL aliases.
 * Savage zones fetch both savage (diff 101) and normal (diff 100).
 * All other zones fetch without explicit difficulty.
 * Zones with fflogsZoneId use that for the API call; multiple zones sharing the
 * same fflogsZoneId are deduplicated to a single query alias (z{fflogsZoneId}).
 */
export function buildCharacterZonesQuery(zones: Array<{ id: number; fflogsZoneId?: number; contentType: string }>): string {
  const seen = new Set<number>();
  const fields = zones.flatMap((z) => {
    if (z.contentType === "savage") {
      return [
        `z${z.id}_s: zoneRankings(zoneID: ${z.id}, difficulty: 101, metric: rdps)`,
        `z${z.id}_n: zoneRankings(zoneID: ${z.id}, difficulty: 100, metric: rdps)`,
      ];
    }
    const fflogsId = z.fflogsZoneId ?? z.id;
    if (seen.has(fflogsId)) return [];
    seen.add(fflogsId);
    return [`z${fflogsId}: zoneRankings(zoneID: ${fflogsId})`];
  });
  return `
  query($charID: Int!) {
    characterData {
      character(id: $charID) {
        ${fields.join("\n        ")}
      }
    }
  }`;
}

export const GUILD_REPORTS_QUERY = `
  query GuildReports($guildID: Int!, $zoneID: Int!) {
    reportData {
      reports(guildID: $guildID, zoneID: $zoneID, limit: 50) {
        data {
          code
          title
          startTime
          zone { id name }
          fights(killType: Kills) {
            id
            name
            kill
            startTime
            difficulty
            encounterID
            friendlyPlayers
          }
        }
      }
    }
  }
`;
