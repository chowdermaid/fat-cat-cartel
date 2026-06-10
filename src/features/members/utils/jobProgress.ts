import { JOB_MAX_LEVELS } from "../constants";

export function isOmniMaxed(jobLevels?: Record<string, number | null>) {
  if (!jobLevels) return false;

  return Object.entries(JOB_MAX_LEVELS).every(([job, maxLevel]) => {
    const level = jobLevels[job];
    return typeof level === "number" && level >= maxLevel;
  });
}

export function jobLevelProgress(jobLevels?: Record<string, number | null>) {
  const entries = Object.entries(JOB_MAX_LEVELS);
  const maxTotal = entries.reduce((sum, [, maxLevel]) => sum + maxLevel, 0);
  const currentTotal = entries.reduce((sum, [job, maxLevel]) => {
    const level = jobLevels?.[job] ?? 0;
    return sum + Math.min(typeof level === "number" ? level : 0, maxLevel);
  }, 0);

  return (currentTotal / maxTotal) * 100;
}
