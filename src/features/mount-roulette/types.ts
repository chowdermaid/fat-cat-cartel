import type { CollectionScope, Collectible, MemberWithMounts } from "@/features/fc-collection/types";
import type { EXPANSIONS } from "./constants";

export type ExpansionKey = (typeof EXPANSIONS)[number]["key"];
export type OwnershipFilter = "nobody" | "incomplete";

export type DizzyCat = {
  id: number;
  top: number;
  left: number;
  rotation: number;
};

export interface MountRouletteControlsProps {
  selectedExpansions: Set<ExpansionKey>;
  ownershipFilter: OwnershipFilter;
  trialsOn: boolean;
  raidsOn: boolean;
  scopedMembers: MemberWithMounts[];
  selectedMembers: Set<string>;
  scope: CollectionScope;
  filteredMountsCount: number;
  spinning: boolean;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  setSelectedMembers: (members: Set<string>) => void;
  setScope: (scope: CollectionScope) => void;
  toggleExpansion: (key: ExpansionKey) => void;
  toggleTrials: () => void;
  toggleRaids: () => void;
  handleSpin: () => void;
}

export interface SpinWheelProps {
  mounts: Collectible[];
  spinTrigger: number;
  onSpinComplete: (mount: Collectible) => void;
}

export interface MountResultDialogProps {
  mount: Collectible | null;
  members: MemberWithMounts[];
  showFriendBadges?: boolean;
  open: boolean;
  onClose: () => void;
  onSpinAgain: () => void;
}
