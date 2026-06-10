import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "animejs";
import { useFCCollection } from "@/features/fc-collection/api/useFCCollection";
import { useCollectionScope } from "@/features/fc-collection/hooks/useCollectionScope";
import { filterByCollectionScope } from "@/features/fc-collection/utils/collectionScope";
import type { Collectible } from "@/features/fc-collection/types";
import { filterMounts } from "../utils/mountFilters";
import { generateDizzyCats } from "../utils/dizzyCats";
import type { DizzyCat, ExpansionKey, OwnershipFilter } from "../types";

export function useMountRoulette() {
  const { allCollectibles, membersWithMounts, loading } = useFCCollection();
  const { scope, setScope } = useCollectionScope();
  const scopedMembers = filterByCollectionScope(membersWithMounts, scope);

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
  const [dizzyCats, setDizzyCats] = useState<DizzyCat[]>([]);
  const catContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catContainerRef.current || dizzyCats.length === 0) return;
    const catEls =
      catContainerRef.current.querySelectorAll<HTMLImageElement>(".dizzy-cat");
    catEls.forEach((el, i) => {
      const rotation = dizzyCats[i]?.rotation ?? 0;
      animate(el, {
        opacity: [0, 1],
        scale: [0.5, 1],
        rotate: [rotation - 15, rotation],
        delay: i * 60,
        duration: 280,
        easing: "easeOutCubic",
      });
    });
  }, [dizzyCats]);

  useEffect(() => {
    if (selectedMembers.size === 0) return;
    const availableIds = new Set(scopedMembers.map((m) => m.id));
    const pruned = new Set(
      [...selectedMembers].filter((id) => availableIds.has(id)),
    );
    if (pruned.size === selectedMembers.size) return;
    const id = window.setTimeout(() => setSelectedMembers(pruned), 0);
    return () => window.clearTimeout(id);
  }, [scopedMembers, selectedMembers]);

  const activeMembers = useMemo(
    () =>
      selectedMembers.size > 0
        ? scopedMembers.filter((m) => selectedMembers.has(m.id))
        : scopedMembers,
    [scopedMembers, selectedMembers],
  );

  const filteredMounts = useMemo(
    () =>
      filterMounts({
        mounts: allCollectibles.mounts as Collectible[],
        selectedExpansions,
        ownershipFilter,
        trialsOn,
        raidsOn,
        activeMembers,
      }),
    [
      allCollectibles.mounts,
      selectedExpansions,
      ownershipFilter,
      trialsOn,
      raidsOn,
      activeMembers,
    ],
  );

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
    setDizzyCats(generateDizzyCats());
    setSpinTrigger((t) => t + 1);
  }

  function handleSpinComplete(mount: Collectible) {
    setResultMount(mount);
    setDialogOpen(true);
    setSpinning(false);
    setDizzyCats([]);
  }

  return {
    activeMembers,
    catContainerRef,
    dialogOpen,
    dizzyCats,
    filteredMounts,
    handleSpin,
    handleSpinComplete,
    loading,
    ownershipFilter,
    raidsOn,
    resultMount,
    scope,
    scopedMembers,
    selectedExpansions,
    selectedMembers,
    setDialogOpen,
    setOwnershipFilter,
    setScope,
    setSelectedMembers,
    spinning,
    spinTrigger,
    toggleExpansion,
    toggleRaids,
    toggleTrials,
    trialsOn,
  };
}
