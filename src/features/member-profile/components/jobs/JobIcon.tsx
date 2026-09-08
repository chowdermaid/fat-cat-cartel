import { JOB_ICONS } from "@/features/raid-stats/jobIcons";
import { JOB_ABBR } from "../../constants";
import { displayJobName, jobIconSrc } from "../../utils/jobs";

export function JobIcon({ fullName, size = 20 }: { fullName: string; size?: number }) {
  const displayName = displayJobName(fullName);
  const src =
    JOB_ICONS[fullName] ??
    JOB_ICONS[displayName.replace(/\s/g, "")] ??
    jobIconSrc(fullName);
  const abbr = JOB_ABBR[displayName] ?? displayName;
  if (!src) return <span className="font-mono text-xs">{abbr}</span>;
  return (
    <img
      src={src}
      alt={abbr}
      title={displayName}
      width={size}
      height={size}
      className="object-contain"
    />
  );
}
