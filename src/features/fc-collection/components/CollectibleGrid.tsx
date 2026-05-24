import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus } from "lucide-react";
import { MemberPicker } from "./MemberPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { animate, stagger } from "animejs";
import { cn } from "@/lib/utils";
import { MemberHeader } from "./MemberHeader";
import { CollectibleDetailDialog } from "./CollectibleDetailDialog";
import type { Collectible, MemberWithMounts } from "../types";
import type { CollectibleConfig } from "../collectibleConfig";

const EXPANSIONS = [
  { key: "all", label: "All" },
  { key: "ARR", label: "ARR", min: 2, max: 3 },
  { key: "HW", label: "HW", min: 3, max: 4 },
  { key: "SB", label: "SB", min: 4, max: 5 },
  { key: "ShB", label: "ShB", min: 5, max: 6 },
  { key: "EW", label: "EW", min: 6, max: 7 },
  { key: "DT", label: "DT", min: 7, max: 8 },
] as const;

type ExpansionKey = (typeof EXPANSIONS)[number]["key"];
type SortKey = "patch" | "name";
type QuickFilter = "all" | "fc-complete" | "fc-missing";

interface CollectibleGridProps {
  items: Collectible[];
  members: MemberWithMounts[];
  config: CollectibleConfig;
  showFriendBadges?: boolean;
}

function AnimatedBar({ pct }: { pct: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!barRef.current) return;
    animate(barRef.current, { width: `${pct}%`, duration: 600, easing: "easeOutQuart" });
  }, [pct]);
  return (
    <div className="flex-1 bg-muted rounded-full h-1.5">
      <div ref={barRef} className="bg-primary h-1.5 rounded-full" style={{ width: "0%" }} />
    </div>
  );
}

function FCOwnerBar({
  item,
  members,
  config,
}: {
  item: Collectible;
  members: MemberWithMounts[];
  config: CollectibleConfig;
}) {
  const count = members.filter((m) => m.owned[config.key].has(item.id)).length;
  const pct = members.length > 0 ? (count / members.length) * 100 : 0;
  return (
    <div className="flex items-center gap-2 w-24">
      <AnimatedBar pct={pct} />
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {count}/{members.length}
      </span>
    </div>
  );
}

function animateFilterClick(target: HTMLElement) {
  animate(target, { scale: [0.93, 1], duration: 200, easing: "easeOutCubic" });
}

export function CollectibleGrid({
  items,
  members,
  config,
  showFriendBadges = false,
}: CollectibleGridProps) {
  const [search, setSearch] = useState("");
  const [expansion, setExpansion] = useState<ExpansionKey>("all");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("patch");
  const storageKey = `fc-member-filter-${config.key}`;
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  });

  const updateSelectedMemberIds = useCallback((ids: Set<string>) => {
    setSelectedMemberIds(ids);
    try {
      if (ids.size === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify([...ids]));
    } catch {
      return;
    }
  }, [storageKey]);

  useEffect(() => {
    if (selectedMemberIds.size === 0) return;
    const availableIds = new Set(members.map((m) => m.id));
    const pruned = new Set([...selectedMemberIds].filter((id) => availableIds.has(id)));
    if (pruned.size === selectedMemberIds.size) return;
    const id = window.setTimeout(() => updateSelectedMemberIds(pruned), 0);
    return () => window.clearTimeout(id);
  }, [members, selectedMemberIds, updateSelectedMemberIds]);

  const visibleMembers = selectedMemberIds.size === 0
    ? members
    : members.filter((m) => selectedMemberIds.has(m.id));

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const allSourceTypes = useMemo(
    () =>
      [
        ...new Set(items.flatMap((item) => item.sources?.map((s) => s.type) ?? [])),
      ].sort(),
    [items],
  );

  function toggleSource(type: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
          return false;

        if (expansion !== "all") {
          const exp = EXPANSIONS.find((e) => e.key === expansion);
          if (exp && "min" in exp) {
            const patch = parseFloat(item.patch);
            if (patch < exp.min || patch >= exp.max) return false;
          }
        }

        if (selectedSources.size > 0) {
          const types = new Set(item.sources?.map((s) => s.type));
          if (![...selectedSources].some((t) => types.has(t))) return false;
        }

        if (quickFilter === "fc-complete") {
          if (!visibleMembers.every((m) => m.owned[config.key].has(item.id)))
            return false;
        }
        if (quickFilter === "fc-missing") {
          if (visibleMembers.some((m) => m.owned[config.key].has(item.id)))
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return parseFloat(a.patch) - parseFloat(b.patch);
      });
  }, [
    items,
    search,
    expansion,
    selectedSources,
    quickFilter,
    sortBy,
    visibleMembers,
    config.key,
  ]);

  useEffect(() => {
    const body = tableBodyRef.current;
    if (!body) return;
    const rows = Array.from(body.querySelectorAll(".collectible-row")).slice(0, 80);
    if (!rows.length) return;
    animate(rows, {
      opacity: [0, 1],
      translateY: [5, 0],
      delay: stagger(6),
      duration: 160,
      easing: "easeOutQuad",
    });
  }, [filtered]);

  useEffect(() => {
    if (!countRef.current) return;
    animate(countRef.current, { opacity: [0, 1], duration: 200, easing: "easeOutQuad" });
  }, [filtered.length]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder={`Search ${config.label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-56"
          />
          <MemberPicker
            members={members}
            selected={selectedMemberIds}
            onChange={updateSelectedMemberIds}
            showFriendBadges={showFriendBadges}
          />
          <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
            <span>Sort:</span>
            {(
              [
                { key: "patch", label: "Patch" },
                { key: "name", label: "Name" },
              ] as { key: SortKey; label: string }[]
            ).map((s) => (
              <Button
                key={s.key}
                variant={sortBy === s.key ? "secondary" : "ghost"}
                size="sm"
                onClick={(e) => { animateFilterClick(e.currentTarget); setSortBy(s.key); }}
                className="h-7 text-xs"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Expansion tabs */}
        <div className="flex gap-1 flex-wrap">
          {EXPANSIONS.map((exp) => (
            <Button
              key={exp.key}
              variant={expansion === exp.key ? "default" : "outline"}
              size="sm"
              onClick={(e) => { animateFilterClick(e.currentTarget); setExpansion(exp.key); }}
              className="h-7 text-xs"
            >
              {exp.label}
            </Button>
          ))}
        </div>

        {/* Quick filters */}
        <div className="flex gap-1 flex-wrap">
          {(
            [
              { key: "all", label: "All" },
              { key: "fc-missing", label: "Nobody has" },
              { key: "fc-complete", label: "Everyone has" },
            ] as { key: QuickFilter; label: string }[]
          ).map((q) => (
            <Button
              key={q.key}
              variant={quickFilter === q.key ? "default" : "outline"}
              size="sm"
              onClick={(e) => { animateFilterClick(e.currentTarget); setQuickFilter(q.key); }}
              className="h-7 text-xs"
            >
              {q.label}
            </Button>
          ))}
        </div>

        {/* Source type chips */}
        {allSourceTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allSourceTypes.map((type) => (
              <button
                key={type}
                onClick={(e) => { animateFilterClick(e.currentTarget); toggleSource(type); }}
                className={cn(
                  "cursor-pointer text-xs px-2 py-0.5 rounded-full border transition-colors",
                  selectedSources.has(type)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground",
                )}
              >
                {type}
              </button>
            ))}
            {selectedSources.size > 0 && (
              <button
                onClick={() => setSelectedSources(new Set())}
                className="cursor-pointer text-xs px-2 py-0.5 text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <p ref={countRef} className="text-xs text-muted-foreground">
          {filtered.length} of {items.length} {config.label.toLowerCase()}
          {selectedMemberIds.size > 0 && ` · ${visibleMembers.length} of ${members.length} members`}
        </p>
      </div>

      {/* Table */}
      <ScrollArea className="rounded-lg border h-[calc(100vh-22rem)] z-1">
        <table className="text-sm w-full">
          <TableHeader>
            <TableRow className="bg-background hover:bg-background border-b">
              <TableHead className="sticky left-0 top-0 bg-background z-30 min-w-[200px] border-r font-semibold text-foreground px-3 py-2 h-auto">
                {config.label}
              </TableHead>
              {visibleMembers.map((m) => (
                <TableHead
                  key={m.id}
                  className="sticky top-0 bg-background border-r last:border-r-0 p-0 h-auto"
                >
                  <MemberHeader
                    member={m}
                    total={items.length}
                    count={m.owned[config.key].size}
                    showFriendBadge={showFriendBadges}
                  />
                </TableHead>
              ))}
              <TableHead className="sticky top-0 bg-background px-3 h-auto text-xs font-semibold text-muted-foreground whitespace-nowrap text-center">
                Owned
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={tableBodyRef}>
            {filtered.map((item) => (
              <TableRow key={item.id} className="collectible-row group border-b last:border-0">
                <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-10 px-3 py-1.5 border-r">
                  <CollectibleDetailDialog item={item}>
                    <button className="cursor-pointer flex items-center gap-2 text-left hover:text-primary transition-colors w-full">
                      <img
                        src={item.icon}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded"
                      />
                      <span className="text-sm leading-tight">{item.name}</span>
                    </button>
                  </CollectibleDetailDialog>
                </TableCell>
                {visibleMembers.map((m) => (
                  <TableCell
                    key={m.id}
                    className="text-center px-3 py-1.5 border-r last:border-r-0"
                  >
                    {m.owned[config.key].has(item.id) ? (
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground/30 mx-auto" />
                    )}
                  </TableCell>
                ))}
                <TableCell className="px-3 py-1.5">
                  <FCOwnerBar item={item} members={visibleMembers} config={config} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={visibleMembers.length + 2}
                  className="text-center text-sm text-muted-foreground py-12"
                >
                  No {config.label.toLowerCase()} match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </ScrollArea>
    </div>
  );
}
