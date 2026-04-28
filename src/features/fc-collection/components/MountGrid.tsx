import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { MemberHeader } from "./MemberHeader";
import { MountDetailDialog } from "./MountDetailDialog";
import type { Mount, MemberWithMounts } from "../types";

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

const ALL_SOURCE_TYPES = [
  "Achievement",
  "Chaotic Raid",
  "Cosmic Exploration",
  "Deep Dungeon",
  "Event",
  "FATE",
  "Gathering",
  "Hunts",
  "Island Sanctuary",
  "Premium",
  "Purchase",
  "PvP",
  "Quest",
  "Raid",
  "Treasure Hunt",
  "Tribal",
  "Trial",
  "V&C Dungeon",
  "Wondrous Tails",
];

interface MountGridProps {
  mounts: Mount[];
  members: MemberWithMounts[];
}

function FCOwnerBar({
  mount,
  members,
}: {
  mount: Mount;
  members: MemberWithMounts[];
}) {
  const count = members.filter((m) => m.ownedMountIds.has(mount.id)).length;
  const pct = members.length > 0 ? (count / members.length) * 100 : 0;
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {count}/{members.length}
      </span>
    </div>
  );
}

export function MountGrid({ mounts, members }: MountGridProps) {
  const [search, setSearch] = useState("");
  const [expansion, setExpansion] = useState<ExpansionKey>("all");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("patch");
  function toggleSource(type: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return mounts
      .filter((mount) => {
        if (search && !mount.name.toLowerCase().includes(search.toLowerCase()))
          return false;

        if (expansion !== "all") {
          const exp = EXPANSIONS.find((e) => e.key === expansion);
          if (exp && "min" in exp) {
            const patch = parseFloat(mount.patch);
            if (patch < exp.min || patch >= exp.max) return false;
          }
        }

        if (selectedSources.size > 0) {
          const types = new Set(mount.sources.map((s) => s.type));
          if (![...selectedSources].some((t) => types.has(t))) return false;
        }

        if (quickFilter === "fc-complete") {
          if (!members.every((m) => m.ownedMountIds.has(mount.id)))
            return false;
        }
        if (quickFilter === "fc-missing") {
          if (members.some((m) => m.ownedMountIds.has(mount.id))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return parseFloat(a.patch) - parseFloat(b.patch);
      });
  }, [
    mounts,
    search,
    expansion,
    selectedSources,
    quickFilter,
    sortBy,
    members,
  ]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search mounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-56"
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
                onClick={() => setSortBy(s.key)}
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
              onClick={() => setExpansion(exp.key)}
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
              onClick={() => setQuickFilter(q.key)}
              className="h-7 text-xs"
            >
              {q.label}
            </Button>
          ))}
        </div>

        {/* Source type chips */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SOURCE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleSource(type)}
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border transition-colors",
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
              className="text-xs px-2 py-0.5 text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {mounts.length} mounts
        </p>
      </div>

      {/* Table */}
      <ScrollArea className="rounded-lg border h-[calc(100vh-22rem)]">
        <table className="text-sm w-full">
          <TableHeader>
            <TableRow className="bg-background hover:bg-background border-b">
              <TableHead className="sticky left-0 top-0 bg-background z-30 min-w-[200px] border-r font-semibold text-foreground px-3 py-2 h-auto">
                Mount
              </TableHead>
              {members.map((m) => (
                <TableHead
                  key={m.id}
                  className="sticky top-0 bg-background z-20 border-r last:border-r-0 p-0 h-auto"
                >
                  <MemberHeader member={m} totalMounts={mounts.length} />
                </TableHead>
              ))}
              <TableHead className="sticky top-0 bg-background z-20 px-3 h-auto text-xs font-semibold text-muted-foreground whitespace-nowrap text-center">
                Owned
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((mount) => (
              <TableRow key={mount.id} className="group border-b last:border-0">
                <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-10 px-3 py-1.5 border-r">
                  <MountDetailDialog mount={mount}>
                    <button className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full">
                      <img
                        src={mount.icon}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded"
                      />
                      <span className="text-sm leading-tight">
                        {mount.name}
                      </span>
                    </button>
                  </MountDetailDialog>
                </TableCell>
                {members.map((m) => (
                  <TableCell
                    key={m.id}
                    className="text-center px-3 py-1.5 border-r last:border-r-0"
                  >
                    {m.ownedMountIds.has(mount.id) ? (
                      <Check className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground/30 mx-auto" />
                    )}
                  </TableCell>
                ))}
                <TableCell className="px-3 py-1.5">
                  <FCOwnerBar mount={mount} members={members} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={members.length + 2}
                  className="text-center text-sm text-muted-foreground py-12"
                >
                  No mounts match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </ScrollArea>
    </div>
  );
}
