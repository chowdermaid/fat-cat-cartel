import type { Collectible, MemberWithMounts } from "@/features/fc-collection/types";
import { EXPANSIONS, RAID_TYPES } from "../constants";
import type { ExpansionKey, OwnershipFilter } from "../types";

interface FilterMountsOptions {
  mounts: Collectible[];
  selectedExpansions: Set<ExpansionKey>;
  ownershipFilter: OwnershipFilter;
  trialsOn: boolean;
  raidsOn: boolean;
  activeMembers: MemberWithMounts[];
}

export function filterMounts({
  mounts,
  selectedExpansions,
  ownershipFilter,
  trialsOn,
  raidsOn,
  activeMembers,
}: FilterMountsOptions) {
  return mounts.filter((mount) => {
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
}
