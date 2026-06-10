import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MemberPicker } from "@/features/fc-collection/components/detail/MemberPicker";
import { CollectionScopeToggle } from "@/features/fc-collection/components/scope/CollectionScopeToggle";
import { EXPANSIONS } from "../../constants";
import type { MountRouletteControlsProps } from "../../types";

export function MountRouletteControls({
  selectedExpansions,
  ownershipFilter,
  trialsOn,
  raidsOn,
  scopedMembers,
  selectedMembers,
  scope,
  filteredMountsCount,
  spinning,
  setOwnershipFilter,
  setSelectedMembers,
  setScope,
  toggleExpansion,
  toggleTrials,
  toggleRaids,
  handleSpin,
}: MountRouletteControlsProps) {
  return (
    <div className="md:w-72 shrink-0 space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Expansion
        </p>
        <div className="flex flex-wrap gap-1.5">
          {EXPANSIONS.map((exp) => (
            <button
              key={exp.key}
              onClick={() => toggleExpansion(exp.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedExpansions.has(exp.key)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground",
              )}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ownership
        </p>
        <div className="flex flex-col gap-1.5">
          <Button
            variant={ownershipFilter === "nobody" ? "default" : "outline"}
            size="sm"
            className="justify-start"
            onClick={() => setOwnershipFilter("nobody")}
          >
            Nobody has it
          </Button>
          <Button
            variant={ownershipFilter === "incomplete" ? "default" : "outline"}
            size="sm"
            className="justify-start"
            onClick={() => setOwnershipFilter("incomplete")}
          >
            At least one missing
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Source
        </p>
        <div className="flex gap-1.5">
          <Button
            variant={trialsOn ? "default" : "outline"}
            size="sm"
            onClick={toggleTrials}
          >
            Trials
          </Button>
          <Button
            variant={raidsOn ? "default" : "outline"}
            size="sm"
            onClick={toggleRaids}
          >
            Raids
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Members
        </p>
        <CollectionScopeToggle scope={scope} onChange={setScope} />
        <MemberPicker
          members={scopedMembers}
          selected={selectedMembers}
          onChange={setSelectedMembers}
          defaultToAll={false}
          showFriendBadges={scope === "all"}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredMountsCount} mount
        {filteredMountsCount !== 1 ? "s" : ""} in pool
      </p>

      <Button
        size="lg"
        className="w-full"
        onClick={handleSpin}
        disabled={filteredMountsCount === 0 || spinning}
      >
        {spinning ? "Spinning..." : "Spin the Wheel"}
      </Button>
    </div>
  );
}
