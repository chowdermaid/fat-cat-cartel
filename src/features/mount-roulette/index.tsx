import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFCCollection } from "@/features/fc-collection/api/useFCCollection";
import { MemberPicker } from "@/features/fc-collection/components/MemberPicker";
import type { Collectible } from "@/features/fc-collection/types";
import { SpinWheel } from "./components/SpinWheel";
import { MountResultDialog } from "./components/MountResultDialog";

const EXPANSIONS = [
  { key: "ARR", label: "ARR", min: 2, max: 3 },
  { key: "HW", label: "HW", min: 3, max: 4 },
  { key: "SB", label: "SB", min: 4, max: 5 },
  { key: "ShB", label: "ShB", min: 5, max: 6 },
  { key: "EW", label: "EW", min: 6, max: 7 },
  { key: "DT", label: "DT", min: 7, max: 8 },
] as const;

type ExpansionKey = (typeof EXPANSIONS)[number]["key"];
type OwnershipFilter = "nobody" | "incomplete";

const RAID_TYPES = new Set(["Raid", "Chaotic Raid"]);

function LoadingSkeleton() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current.querySelectorAll(".sk"), {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(35),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, []);
  return (
    <div ref={ref} className="flex flex-col md:flex-row gap-8">
      <div className="md:w-72 space-y-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="sk h-8 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="sk h-[480px] w-[480px] max-w-full rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function MountRoulettePage() {
  const { allCollectibles, membersWithMounts, loading } = useFCCollection();

  const [selectedExpansions, setSelectedExpansions] = useState<
    Set<ExpansionKey>
  >(new Set(["DT"] as ExpansionKey[]));
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("incomplete");
  const [trialsOn, setTrialsOn] = useState(true);
  const [raidsOn, setRaidsOn] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [resultMount, setResultMount] = useState<Collectible | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeMembers = useMemo(
    () =>
      selectedMembers.size > 0
        ? membersWithMounts.filter((m) => selectedMembers.has(m.id))
        : membersWithMounts,
    [membersWithMounts, selectedMembers],
  );

  const filteredMounts = useMemo(() => {
    return (allCollectibles.mounts as Collectible[]).filter((mount) => {
      const patch = parseFloat(mount.patch);
      const inExpansion = [...selectedExpansions].some((k) => {
        const exp = EXPANSIONS.find((e) => e.key === k)!;
        return patch >= exp.min && patch < exp.max;
      });
      if (!inExpansion) return false;

      const sourceTypes = new Set(mount.sources?.map((s) => s.type) ?? []);
      const matchesSource =
        (trialsOn && sourceTypes.has("Trial")) ||
        (raidsOn && [...sourceTypes].some((t) => RAID_TYPES.has(t)));
      if (!matchesSource) return false;

      if (ownershipFilter === "nobody") {
        if (!activeMembers.every((m) => !m.owned.mounts.has(mount.id)))
          return false;
      } else {
        if (!activeMembers.some((m) => !m.owned.mounts.has(mount.id)))
          return false;
      }

      return true;
    });
  }, [allCollectibles.mounts, selectedExpansions, ownershipFilter, trialsOn, raidsOn, activeMembers]);

  function toggleExpansion(key: ExpansionKey) {
    setSelectedExpansions((prev) => {
      if (prev.has(key) && prev.size === 1) return prev;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleTrials() {
    if (trialsOn && !raidsOn) return;
    setTrialsOn((v) => !v);
  }

  function toggleRaids() {
    if (raidsOn && !trialsOn) return;
    setRaidsOn((v) => !v);
  }

  function handleSpin() {
    if (spinning || filteredMounts.length === 0) return;
    setSpinning(true);
    setSpinTrigger((t) => t + 1);
  }

  function handleSpinComplete(mount: Collectible) {
    setResultMount(mount);
    setDialogOpen(true);
    setSpinning(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif">Mount Roulette</h1>
        <p className="mt-1 text-muted-foreground">GOTTA CATCH EM ALL</p>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
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
                  variant={
                    ownershipFilter === "incomplete" ? "default" : "outline"
                  }
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
              <MemberPicker
                members={membersWithMounts}
                selected={selectedMembers}
                onChange={setSelectedMembers}
                defaultToAll={false}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {filteredMounts.length} mount
              {filteredMounts.length !== 1 ? "s" : ""} in pool
            </p>

            <Button
              size="lg"
              className="w-full"
              onClick={handleSpin}
              disabled={filteredMounts.length === 0 || spinning}
            >
              {spinning ? "Spinning..." : "Spin the Wheel"}
            </Button>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <SpinWheel
              mounts={filteredMounts}
              spinTrigger={spinTrigger}
              onSpinComplete={handleSpinComplete}
            />
          </div>
        </div>
      )}

      <MountResultDialog
        mount={resultMount}
        members={activeMembers}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSpinAgain={() => { setDialogOpen(false); handleSpin(); }}
      />
    </div>
  );
}
