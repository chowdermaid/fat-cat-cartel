import { jobIconSrc } from "../../utils/icons";

export function JobIcon({ job }: { job: string }) {
  const icon = jobIconSrc(job);
  if (!icon) return null;
  return (
    <img src={icon} alt="" className="h-4 w-4 object-contain" loading="lazy" />
  );
}
