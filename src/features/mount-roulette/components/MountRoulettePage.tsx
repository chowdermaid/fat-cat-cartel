import { Dices } from "lucide-react";
import { useMountRoulette } from "../hooks/useMountRoulette";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MountRouletteControls } from "./controls/MountRouletteControls";
import { MountResultDialog } from "./result/MountResultDialog";
import { SpinWheel } from "./wheel/SpinWheel";
import fcDizzy from "@/assets/fatcat/fc_dizzy.png";

export function MountRoulettePage() {
  const roulette = useMountRoulette();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
          <Dices className="h-7 w-7 text-muted-foreground" />
          Mount Roulette
        </h1>
        <p className="mt-1 text-muted-foreground">WAT ARE WE FARMING</p>
      </div>

      {roulette.loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          <MountRouletteControls
            selectedExpansions={roulette.selectedExpansions}
            ownershipFilter={roulette.ownershipFilter}
            trialsOn={roulette.trialsOn}
            raidsOn={roulette.raidsOn}
            scopedMembers={roulette.scopedMembers}
            selectedMembers={roulette.selectedMembers}
            scope={roulette.scope}
            filteredMountsCount={roulette.filteredMounts.length}
            spinning={roulette.spinning}
            setOwnershipFilter={roulette.setOwnershipFilter}
            setSelectedMembers={roulette.setSelectedMembers}
            setScope={roulette.setScope}
            toggleExpansion={roulette.toggleExpansion}
            toggleTrials={roulette.toggleTrials}
            toggleRaids={roulette.toggleRaids}
            handleSpin={roulette.handleSpin}
          />

          <div className="flex-1 flex flex-col items-center min-w-0">
            <div
              ref={roulette.catContainerRef}
              className="relative w-full max-w-2xl"
            >
              <SpinWheel
                mounts={roulette.filteredMounts}
                spinTrigger={roulette.spinTrigger}
                onSpinComplete={roulette.handleSpinComplete}
              />
              {roulette.dizzyCats.map((cat) => (
                <img
                  key={cat.id}
                  src={fcDizzy}
                  alt=""
                  className="dizzy-cat absolute h-20 pointer-events-none"
                  style={{ top: cat.top, left: cat.left }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <MountResultDialog
        mount={roulette.resultMount}
        members={roulette.activeMembers}
        showFriendBadges={roulette.scope === "all"}
        open={roulette.dialogOpen}
        onClose={() => roulette.setDialogOpen(false)}
        onSpinAgain={() => {
          roulette.setDialogOpen(false);
          roulette.handleSpin();
        }}
      />
    </div>
  );
}
