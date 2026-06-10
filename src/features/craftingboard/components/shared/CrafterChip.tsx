import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CombinedEligibleCrafter } from "../../utils/eligibility";
import { JobIcon } from "./JobIcon";
import { MemberAvatar } from "./MemberAvatar";

export function CrafterChip({ crafter }: { crafter: CombinedEligibleCrafter }) {
  const jobs =
    crafter.jobs.length > 0
      ? crafter.jobs
      : [{ job: crafter.job, level: crafter.level }];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-muted">
            <MemberAvatar member={crafter} size="md" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="space-y-1">
          <p className="font-medium">{crafter.characterName}</p>
          {jobs.map((job) => (
            <div key={job.job} className="flex items-center gap-1.5 text-xs">
              <JobIcon job={job.job} />
              <span>
                {job.job} Lv. {job.level}
              </span>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
