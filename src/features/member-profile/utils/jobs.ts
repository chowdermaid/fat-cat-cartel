import { formatJobName } from "@/features/raid-stats/constants";
import { JOB_ICON_SLUG, JOB_NAME_ALIASES, DEFAULT_MAX_JOB_LEVEL, JOB_MAX_LEVELS } from "../constants";

const jobIconMap = import.meta.glob<string>("../../../assets/jobs/*.png", { eager: true, import: "default" }) as Record<string, string>;

export function displayJobName(jobName: string): string {
  return JOB_NAME_ALIASES[jobName] ?? formatJobName(jobName);
}

export function jobIconSrc(fullName: string): string | null {
  const slug = JOB_ICON_SLUG[displayJobName(fullName)];
  return slug ? (jobIconMap[`../../../assets/jobs/${slug}.png`] ?? null) : null;
}

export function maxLevelForJob(job: string) {
  return JOB_MAX_LEVELS[job] ?? DEFAULT_MAX_JOB_LEVEL;
}
