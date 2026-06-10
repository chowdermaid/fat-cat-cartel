import type { Member } from "@/types";
import type { CraftingEligibleCrafter, CraftingRequestDashboardItem } from "../types";
import { safeArray } from "./arrays";

export type EligibilityResult = {
  status: "known" | "unknown";
  crafters: CombinedEligibleCrafter[];
};

type ItemEligibilityResult = {
  status: "known" | "unknown";
  crafters: CraftingEligibleCrafter[];
};

export type CombinedEligibleCrafter = CraftingEligibleCrafter & {
  jobs: Array<{ job: string; level: number }>;
};

export function combinedEligibility(
  items: CraftingRequestDashboardItem[],
  members: Record<string, Member>,
): EligibilityResult {
  const itemList = safeArray(items);
  if (itemList.length === 0) return { status: "known", crafters: [] };

  let intersection: Map<string, CombinedEligibleCrafter> | null = null;

  for (const item of itemList) {
    const eligibility = eligibleCraftersForItem(item, members);
    if (eligibility.status === "unknown") {
      return { status: "unknown", crafters: [] };
    }

    const itemCrafters = new Map<string, CombinedEligibleCrafter>();
    for (const crafter of eligibility.crafters) {
      itemCrafters.set(crafter.lodestoneId, {
        ...crafter,
        jobs: [{ job: crafter.job, level: crafter.level }],
      });
    }

    if (!intersection) {
      intersection = itemCrafters;
      continue;
    }

    for (const [lodestoneId, crafter] of Array.from(intersection.entries())) {
      const nextCrafter = itemCrafters.get(lodestoneId);
      if (!nextCrafter) {
        intersection.delete(lodestoneId);
        continue;
      }
      crafter.jobs = mergeCrafterJobs(crafter.jobs, nextCrafter.jobs);
      crafter.avatarUrl = crafter.avatarUrl ?? nextCrafter.avatarUrl;
    }
  }

  const result = Array.from(intersection?.values() ?? []).sort((a, b) =>
    a.characterName.localeCompare(b.characterName),
  );
  return { status: "known", crafters: result };
}

function eligibleCraftersForItem(
  item: CraftingRequestDashboardItem,
  members: Record<string, Member>,
): ItemEligibilityResult {
  const recipe = item.recipeSnapshot ?? {};
  const snapshotted = safeArray(recipe.eligibleCrafters);
  if (snapshotted.length > 0) {
    return {
      status: "known",
      crafters: snapshotted.map((crafter) => {
        const member = members[crafter.lodestoneId];
        return {
          ...crafter,
          characterName: member?.name ?? crafter.characterName,
          avatarUrl: member?.avatarUrl ?? crafter.avatarUrl,
        };
      }),
    };
  }

  const crafterJob = recipe.crafter;
  if (!crafterJob) return { status: "unknown", crafters: [] };
  const requiredLevel = recipe.recipeLevel ?? 0;
  const memberEntries = Object.entries(members);
  if (memberEntries.length === 0) return { status: "unknown", crafters: [] };

  let sawSyncedJob = false;
  const crafters = memberEntries
    .flatMap(([lodestoneId, member]) => {
      if (member.fcRank === "Friend") return [];
      const level = member.jobLevels?.[crafterJob];
      if (typeof level === "number") sawSyncedJob = true;
      if (typeof level !== "number" || level < requiredLevel) return [];
      return [
        {
          lodestoneId,
          characterName: member.name,
          fcRank: member.fcRank,
          avatarUrl: member.avatarUrl,
          job: crafterJob,
          level,
        },
      ];
    })
    .sort((a, b) => a.characterName.localeCompare(b.characterName));

  if (!sawSyncedJob) return { status: "unknown", crafters: [] };
  return { status: "known", crafters };
}

function mergeCrafterJobs(
  current: Array<{ job: string; level: number }>,
  next: Array<{ job: string; level: number }>,
) {
  const jobs = new Map(current.map((job) => [job.job, job]));
  for (const job of next) jobs.set(job.job, job);
  return Array.from(jobs.values()).sort((a, b) => a.job.localeCompare(b.job));
}
