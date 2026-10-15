import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, Minus, Search, ImageOff } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberHeader } from "./MemberHeader";
import { CollectibleDetailDialog } from "./CollectibleDetailDialog";
import { EXPANSIONS } from "../../constants";
import type {
  Collectible,
  CollectibleConfig,
  MemberWithMounts,
} from "../../types";

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      barRef.current.style.width = `${pct}%`;
      return;
    }
    const animation = animate(barRef.current, {
      width: `${pct}%`,
      duration: 600,
      easing: "easeOutQuart",
    });
    return () => {
      animation.revert();
    };
  }, [pct]);
  return (
    <div className="flex-1 bg-muted rounded-full h-1.5">
      <div
        ref={barRef}
        className="bg-primary h-1.5 rounded-full"
        style={{ width: "0%" }}
      />
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

export function CollectibleGrid({
  items,
  members,
  config,
  showFriendBadges = false,
}: CollectibleGridProps) {
  const sourceId = useId();
  const [search, setSearch] = useState("");
  const [expansion, setExpansion] = useState<ExpansionKey>("all");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("patch");
  const storageKey = `fc-member-filter-${config.key}`;
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    () => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
      } catch {
        return new Set();
      }
    },
  );

  const updateSelectedMemberIds = useCallback(
    (ids: Set<string>) => {
      setSelectedMemberIds(ids);
      try {
        if (ids.size === 0) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, JSON.stringify([...ids]));
      } catch {
        return;
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (selectedMemberIds.size === 0) return;
    const availableIds = new Set(members.map((m) => m.id));
    const pruned = new Set(
      [...selectedMemberIds].filter((id) => availableIds.has(id)),
    );
    if (pruned.size === selectedMemberIds.size) return;
    const id = window.setTimeout(() => updateSelectedMemberIds(pruned), 0);
    return () => window.clearTimeout(id);
  }, [members, selectedMemberIds, updateSelectedMemberIds]);

  const visibleMembers =
    selectedMemberIds.size === 0
      ? members
      : members.filter((m) => selectedMemberIds.has(m.id));

  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const allSourceTypes = useMemo(
    () =>
      [
        ...new Set(
          items.flatMap((item) => item.sources?.map((s) => s.type) ?? []),
        ),
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
    if (!body || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const rows = Array.from(body.querySelectorAll(".collectible-row")).slice(
      0,
      80,
    );
    if (!rows.length) return;
    const animation = animate(rows, {
      opacity: [0, 1],
      translateY: [5, 0],
      delay: stagger(6),
      duration: 160,
      easing: "easeOutQuad",
    });
    return () => {
      animation.revert();
    };
  }, [filtered]);

  useEffect(() => {
    if (
      !countRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = animate(countRef.current, {
      opacity: [0, 1],
      duration: 200,
      easing: "easeOutQuad",
    });
    return () => {
      animation.revert();
    };
  }, [filtered.length]);

  return (
    <div className="space-y-4">
      <div
        aria-label="Collection filters"
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/50 p-3 sm:gap-3"
      >
        <div className="relative min-w-40 flex-1 sm:max-w-80">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
          />
          <Input
            aria-label={`Search ${config.label.toLowerCase()}`}
            placeholder={`Search ${config.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <MemberPicker
          members={members}
          selected={selectedMemberIds}
          onChange={updateSelectedMemberIds}
          showFriendBadges={showFriendBadges}
        />
        <Select
          value={expansion}
          onValueChange={(value) => setExpansion(value as ExpansionKey)}
        >
          <SelectTrigger
            aria-label="Expansion"
            className="w-36 shrink-0 sm:w-40"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPANSIONS.map((exp) => (
              <SelectItem key={exp.key} value={exp.key}>
                {exp.key === "all" ? "All expansions" : exp.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-36 shrink-0 justify-between"
              disabled={allSourceTypes.length === 0}
            >
              Sources
              {selectedSources.size > 0 ? ` (${selectedSources.size})` : ""}
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 text-muted-foreground"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 max-w-[calc(100vw-2rem)] p-2"
          >
            <div className="flex items-center justify-between border-b px-2 pb-2">
              <span className="text-sm font-semibold">Sources</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={selectedSources.size === 0}
                onClick={() => setSelectedSources(new Set())}
              >
                Clear
              </Button>
            </div>
            <ScrollArea
              className="h-60"
              viewportClassName="h-60 [&>div]:!block"
            >
              <div className="space-y-1 py-2 pr-3">
                {allSourceTypes.map((type, index) => (
                  <div
                    key={type}
                    className="flex items-start gap-2 rounded px-2 py-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      id={`${sourceId}-${index}`}
                      className="mt-0.5"
                      checked={selectedSources.has(type)}
                      onCheckedChange={() => toggleSource(type)}
                    />
                    <label
                      htmlFor={`${sourceId}-${index}`}
                      className="min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <div
          role="group"
          aria-label="Ownership by selected members"
          className="flex max-w-full flex-wrap gap-1 rounded-md border p-0.5"
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "fc-missing", label: "Nobody has" },
              { key: "fc-complete", label: "Everyone has" },
            ] as { key: QuickFilter; label: string }[]
          ).map((q) => (
            <Button
              key={q.key}
              aria-pressed={quickFilter === q.key}
              variant={quickFilter === q.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setQuickFilter(q.key)}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Sort items"
          className="ml-auto flex items-center gap-2 text-sm"
        >
          <span className="text-muted-foreground">Sort:</span>
          <div className="flex gap-0.5 rounded-md border p-0.5">
            {(["patch", "name"] as SortKey[]).map((sort) => (
              <Button
                key={sort}
                aria-pressed={sortBy === sort}
                variant={sortBy === sort ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortBy(sort)}
              >
                {sort === "patch" ? "Patch" : "Name"}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Showing {visibleMembers.length} of {members.length} members
        </p>
        <p ref={countRef} role="status">
          {filtered.length.toLocaleString()} results
        </p>
      </div>

      {/* Table */}
      <ScrollArea
        type="always"
        className="isolate h-[max(20rem,calc(100dvh-27rem))] rounded-lg border [&>[data-orientation=horizontal]]:z-40 [&>[data-orientation=horizontal]]:bg-background"
        viewportClassName="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        ref={(root) => {
          const viewport = root?.querySelector<HTMLElement>(
            "[data-radix-scroll-area-viewport]",
          );
          if (viewport) {
            viewport.tabIndex = 0;
            viewport.setAttribute("role", "region");
            viewport.setAttribute(
              "aria-label",
              `${config.label} comparison, scroll for more items and members`,
            );
          }
        }}
      >
        <table className="w-full border-separate border-spacing-0 text-sm [&_td]:border-b [&_th]:border-b">
          <caption className="sr-only">
            {config.label} ownership comparison for selected members
          </caption>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background border-b">
              <TableHead
                scope="col"
                className="sticky left-0 top-0 bg-background z-30 w-40 min-w-40 max-w-40 sm:w-72 sm:min-w-72 sm:max-w-72 border-r font-semibold text-foreground px-3 py-2 h-auto"
              >
                {config.singular}
              </TableHead>
              {visibleMembers.map((m) => (
                <TableHead
                  key={m.id}
                  scope="col"
                  className="sticky top-0 z-20 bg-background border-r last:border-r-0 p-0 h-auto"
                >
                  <MemberHeader
                    member={m}
                    total={items.length}
                    count={m.owned[config.key].size}
                    showFriendBadge={showFriendBadges}
                  />
                </TableHead>
              ))}
              <TableHead
                scope="col"
                className="sticky top-0 z-20 min-w-32 bg-background px-3 h-auto text-xs font-semibold text-foreground text-center"
              >
                Owned by selected
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody ref={tableBodyRef}>
            {filtered.map((item) => (
              <TableRow
                key={item.id}
                className="collectible-row group border-b last:border-0"
              >
                <TableCell className="sticky left-0 bg-background group-hover:bg-muted z-10 w-40 min-w-40 max-w-40 sm:w-72 sm:min-w-72 sm:max-w-72 px-3 py-1.5 border-r">
                  <CollectibleDetailDialog item={item}>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-start gap-2 whitespace-normal px-0 py-0 text-left hover:bg-transparent hover:text-primary"
                    >
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                        <ImageOff
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        {item.icon && (
                          <img
                            key={item.icon}
                            src={item.icon}
                            alt=""
                            className="absolute inset-0 h-full w-full rounded bg-background object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </span>
                      <span className="min-w-0 break-words text-sm leading-tight">
                        {item.name}
                      </span>
                    </Button>
                  </CollectibleDetailDialog>
                </TableCell>
                {visibleMembers.map((m) => (
                  <TableCell
                    key={m.id}
                    className="text-center px-3 py-1.5 border-r last:border-r-0"
                  >
                    {m.owned[config.key].has(item.id) ? (
                      <>
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mx-auto"
                        />
                        <span className="sr-only">Owned by {m.name}</span>
                      </>
                    ) : (
                      <>
                        <Minus
                          aria-hidden="true"
                          className="h-3 w-3 text-muted-foreground mx-auto"
                        />
                        <span className="sr-only">
                          Not recorded as owned by {m.name}
                        </span>
                      </>
                    )}
                  </TableCell>
                ))}
                <TableCell className="px-3 py-1.5">
                  <FCOwnerBar
                    item={item}
                    members={visibleMembers}
                    config={config}
                  />
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
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <p className="flex flex-wrap items-center gap-2">
          <Check
            aria-hidden="true"
            className="h-4 w-4 text-emerald-700 dark:text-emerald-400"
          />
          Owned <Minus aria-hidden="true" className="ml-2 h-3 w-3" />
          Not recorded as owned
        </p>
        <p>Select {config.singular.toLowerCase()} name to view details.</p>
      </div>
    </div>
  );
}
