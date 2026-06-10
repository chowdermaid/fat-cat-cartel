import { JOB_ICON_SLUG } from "../constants";

const jobIconMap = import.meta.glob<string>("../../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export function jobIconSrc(job: string | undefined): string | null {
  if (!job) return null;
  const slug = JOB_ICON_SLUG[job];
  return slug ? (jobIconMap[`../../../assets/jobs/${slug}.png`] ?? null) : null;
}
