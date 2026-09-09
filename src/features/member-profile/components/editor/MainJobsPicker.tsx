import { Button } from "@/components/ui/button";
import { JOB_ABBR, JOB_LEVEL_GROUPS } from "../../constants";
import { jobIconSrc } from "../../utils/jobs";

const groups = [
  {
    label: "Combat",
    jobs: JOB_LEVEL_GROUPS.filter(
      (group) => group.label !== "Crafting" && group.label !== "Gathering",
    ).flatMap((group) => [...group.jobs]),
  },
  ...JOB_LEVEL_GROUPS.filter(
    (group) => group.label === "Crafting" || group.label === "Gathering",
  ),
];

export function MainJobsPicker({
  value,
  onToggle,
  disabled = false,
}: {
  value: string[];
  onToggle: (job: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium">
        Main Jobs{" "}
        <span className="font-normal text-muted-foreground">
          ({value.length}/8)
        </span>
      </legend>
      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{group.label}</p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {group.jobs.map((job) => {
              const selected = value.includes(job);
              const icon = jobIconSrc(job);
              return (
                <Button
                  key={job}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  aria-label={job}
                  aria-pressed={selected}
                  title={job}
                  disabled={disabled || (!selected && value.length >= 8)}
                  onClick={() => onToggle(job)}
                  className={`h-12 min-w-0 flex-col gap-0.5 px-1 py-1 [&_img]:h-5 [&_img]:w-5 ${selected ? "border border-primary bg-primary/15 text-primary hover:bg-primary/20" : ""}`}
                >
                  {icon && <img src={icon} alt="" className="object-contain" />}
                  <span className="text-[10px] leading-none">
                    {JOB_ABBR[job] ?? job}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Choose up to 8 across all groups.
      </p>
    </fieldset>
  );
}
