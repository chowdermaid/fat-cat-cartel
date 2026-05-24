import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, ref, onValue, set, remove, get } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDownUp,
  Database,
  IdCard,
  Search,
  Trash2,
  UserPlus,
  RefreshCw,
  User,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member } from "@/types";
import type { MemberProfile } from "@/features/member-profile/types";

const jobIconMap = import.meta.glob<string>("../../../assets/jobs/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const JOB_ICON_SLUG: Record<string, string> = {
  Paladin: "paladin",
  Warrior: "warrior",
  "Dark Knight": "darkknight",
  Gunbreaker: "gunbreaker",
  "White Mage": "whitemage",
  Scholar: "scholar",
  Astrologian: "astrologian",
  Sage: "sage",
  Monk: "monk",
  Dragoon: "dragoon",
  Ninja: "ninja",
  Samurai: "samurai",
  Reaper: "reaper",
  Viper: "viper",
  Bard: "bard",
  Machinist: "machinist",
  Dancer: "dancer",
  "Black Mage": "blackmage",
  Summoner: "summoner",
  "Red Mage": "redmage",
  Pictomancer: "pictomancer",
};

function jobIcon(fullName: string): string | null {
  const slug = JOB_ICON_SLUG[fullName];
  return slug ? (jobIconMap[`../../../assets/jobs/${slug}.png`] ?? null) : null;
}

const JOBS: { abbr: string; full: string }[] = [
  { abbr: "PLD", full: "Paladin" },
  { abbr: "WAR", full: "Warrior" },
  { abbr: "DRK", full: "Dark Knight" },
  { abbr: "GNB", full: "Gunbreaker" },
  { abbr: "WHM", full: "White Mage" },
  { abbr: "SCH", full: "Scholar" },
  { abbr: "AST", full: "Astrologian" },
  { abbr: "SGE", full: "Sage" },
  { abbr: "MNK", full: "Monk" },
  { abbr: "DRG", full: "Dragoon" },
  { abbr: "NIN", full: "Ninja" },
  { abbr: "SAM", full: "Samurai" },
  { abbr: "RPR", full: "Reaper" },
  { abbr: "VPR", full: "Viper" },
  { abbr: "BRD", full: "Bard" },
  { abbr: "MCH", full: "Machinist" },
  { abbr: "DNC", full: "Dancer" },
  { abbr: "BLM", full: "Black Mage" },
  { abbr: "SMN", full: "Summoner" },
  { abbr: "RDM", full: "Red Mage" },
  { abbr: "PCT", full: "Pictomancer" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function parseBirthday(mmdd: string | null): { month: number; day: number } {
  if (!mmdd) return { month: 0, day: 0 };
  const [m, d] = mmdd.split("-").map(Number);
  return { month: m || 0, day: d || 0 };
}

function encodeBirthday(month: number, day: number): string | null {
  if (!month || !day) return null;
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const FC_RANKS = ["Boss", "Underpaw", "Housecat", "Stray", "Friend"] as const;
type FCRank = (typeof FC_RANKS)[number];
type SortKey = "name" | "rank" | "lodestoneId";
type SortDir = "asc" | "desc";

const RANK_ORDER = new Map<string, number>(
  FC_RANKS.map((rank, index) => [rank, index]),
);

const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
};

function clearRaidStatsCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("fcc_raidstats_v2_")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    return;
  }
}

export function FCMembersManager() {
  const [members, setMembers] = useState<Array<Member & { id: string }>>([]);
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [fetchingCollection, setFetchingCollection] = useState(false);
  const [collectionLastFetched, setCollectionLastFetched] = useState<
    number | null
  >(null);
  const [raidLastUpdated, setRaidLastUpdated] = useState<number | null>(null);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [fetchingLodestone, setFetchingLodestone] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<MemberProfile>({
    ...EMPTY_PROFILE,
  });
  const [rankDraft, setRankDraft] = useState<FCRank | "">("");
  const [bdMonth, setBdMonth] = useState(0);
  const [bdDay, setBdDay] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    return onValue(ref(db, "members"), (snap: { val(): Record<string, Member> | null }) => {
      const val = snap.val() as Record<string, Member> | null;
      if (!val) {
        setMembers([]);
        return;
      }
      setMembers(
        Object.entries(val)
          .map(([id, m]) => ({ id, ...m }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "raidStats/lastUpdated"), (snap: { val(): number | null }) => {
      setRaidLastUpdated(snap.val() ?? null);
    });
  }, []);

  useEffect(() => {
    return onValue(
      ref(db, "fcCollection/collectibles/lastFetched"),
      (snap: { val(): number | null }) => {
        setCollectionLastFetched(snap.val() ?? null);
      },
    );
  }, []);

  async function handleRefreshCollection() {
    if (!firebaseApp) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingCollection(true);
    const id = toast.loading("Refreshing collection data...");
    try {
      const { getFunctions, httpsCallable } =
        await import("firebase/functions");
      await httpsCallable(
        getFunctions(firebaseApp),
        "triggerFCCollectionRefresh",
        { timeout: 300_000 },
      )();
      toast.success("Collection data refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingCollection(false);
    }
  }

  async function handleRefreshLogs() {
    if (!firebaseApp) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingLogs(true);
    const id = toast.loading("Refreshing raid stats...");
    try {
      const { getFunctions, httpsCallable } =
        await import("firebase/functions");
      await httpsCallable(getFunctions(firebaseApp), "triggerFFLogsRefresh", {
        timeout: 300_000,
      })();
      localStorage.removeItem("fcc_members_v3");
      clearRaidStatsCache();
      toast.success("Raid stats refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingLogs(false);
    }
  }

  async function handleImportLodestone() {
    if (!firebaseApp) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingLodestone(true);
    const id = toast.loading("Syncing Lodestone portraits...");
    try {
      const { getFunctions, httpsCallable } =
        await import("firebase/functions");
      const fn = httpsCallable<unknown, { total: number; written: number; failed: number }>(
        getFunctions(firebaseApp),
        "importLodestoneMembers",
        { timeout: 300_000 },
      );
      const res = await fn();
      const failedText = res.data.failed > 0 ? `, ${res.data.failed} failed` : "";
      toast.success(`${res.data.written}/${res.data.total} tracked members synced${failedText}.`, { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed.", { id });
    } finally {
      setFetchingLodestone(false);
    }
  }

  function handleAdd() {
    if (!name.trim() || !lodestoneId.trim()) return;
    const memberName = name.trim();
    set(ref(db, `members/${lodestoneId.trim()}`), {
      name: memberName,
      fflogsId: null,
      avatarUrl: null,
    });
    setName("");
    setLodestoneId("");
    toast.success(`${memberName} added to roster.`);
  }

  async function handleDeleteMember(id: string, memberName: string) {
    await remove(ref(db, `members/${id}`));
    toast.success(`${memberName} removed from roster.`);
  }

  async function openProfileEditor(memberId: string) {
    setProfileDraft({ ...EMPTY_PROFILE });
    setBdMonth(0);
    setBdDay(0);
    const currentRank = members.find((m) => m.id === memberId)?.fcRank;
    setRankDraft(
      FC_RANKS.includes(currentRank as FCRank) ? (currentRank as FCRank) : "",
    );
    setEditingMemberId(memberId);
    try {
      const snap = await get(ref(db, `memberProfiles/${memberId}`));
      const existing = snap.val() as Partial<MemberProfile> | null;
      if (existing) {
        setProfileDraft({
          bio: existing.bio ?? null,
          birthday: existing.birthday ?? null,
          mainJobs: Array.isArray(existing.mainJobs) ? existing.mainJobs : [],
        });
        const { month, day } = parseBirthday(existing.birthday ?? null);
        setBdMonth(month);
        setBdDay(day);
      }
    } catch {
      toast.error("Failed to load profile.");
    }
  }

  async function handleSaveProfile() {
    if (!editingMemberId) return;
    setProfileSaving(true);
    try {
      const profileData: MemberProfile = {
        bio: profileDraft.bio?.trim() || null,
        birthday: encodeBirthday(bdMonth, bdDay),
        mainJobs: profileDraft.mainJobs ?? [],
      };
      await Promise.all([
        set(ref(db, `memberProfiles/${editingMemberId}`), profileData),
        set(ref(db, `members/${editingMemberId}/fcRank`), rankDraft || null),
      ]);
      localStorage.removeItem("fcc_members_v3");
      localStorage.removeItem("fcc_collection_v3");
      clearRaidStatsCache();
      setEditingMemberId(null);
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function toggleJob(full: string) {
    const current = profileDraft.mainJobs ?? [];
    const next = current.includes(full)
      ? current.filter((j) => j !== full)
      : [...current, full];
    setProfileDraft((d) => ({ ...d, mainJobs: next }));
  }

  const editingMember = members.find((m) => m.id === editingMemberId);
  const friendCount = members.filter((m) => m.fcRank === "Friend").length;
  const filteredMembers = members
    .filter((m) => {
      const q = memberSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.includes(q) ||
        (m.fcRank ?? "").toLowerCase().includes(q) ||
        (m.server ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "rank") {
        const rankA = RANK_ORDER.get(a.fcRank ?? "") ?? 999;
        const rankB = RANK_ORDER.get(b.fcRank ?? "") ?? 999;
        return (rankA - rankB || a.name.localeCompare(b.name)) * dir;
      }
      if (sortKey === "lodestoneId") return a.id.localeCompare(b.id) * dir;
      return a.name.localeCompare(b.name) * dir;
    });

  function updateSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const selectClass =
    "rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              Collection
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {collectionLastFetched
                ? formatTimeAgo(collectionLastFetched)
                : "Never fetched"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshCollection}
            disabled={fetchingCollection}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", fetchingCollection && "animate-spin")}
            />
            {fetchingCollection ? "Fetching" : "Refresh"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
              Raid Stats
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {raidLastUpdated ? formatTimeAgo(raidLastUpdated) : "Never fetched"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshLogs}
            disabled={fetchingLogs}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", fetchingLogs && "animate-spin")}
            />
            {fetchingLogs ? "Fetching" : "Refresh"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
              Lodestone
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Names and portraits
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleImportLodestone}
            disabled={fetchingLodestone}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", fetchingLodestone && "animate-spin")}
            />
            {fetchingLodestone ? "Syncing" : "Sync"}
          </Button>
        </div>
      </div>

      {/* Member roster */}
      {members.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Members</p>
              <p className="text-xs text-muted-foreground">
                {members.length} tracked · {friendCount} friends
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-8"
              />
            </div>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => updateSort("name")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Name
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => updateSort("rank")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Rank
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button
                      type="button"
                      onClick={() => updateSort("lodestoneId")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Lodestone
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="font-mono text-xs text-muted-foreground md:hidden">
                            {m.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.fcRank ? (
                        <Badge variant={m.fcRank === "Friend" ? "secondary" : "outline"}>
                          {m.fcRank}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No rank</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {m.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openProfileEditor(m.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No members match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Manual add */}
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="fc-member-name">Character Name</Label>
          <Input
            id="fc-member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Firstname Lastname"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fc-lodestone-id">Lodestone ID</Label>
          <Input
            id="fc-lodestone-id"
            value={lodestoneId}
            onChange={(e) => setLodestoneId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="12345678"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!name.trim() || !lodestoneId.trim()}
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Add tracked characters by Lodestone ID. Find IDs at{" "}
        <a
          href="https://na.finalfantasyxiv.com/lodestone/character/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          na.finalfantasyxiv.com/lodestone/character
        </a>
      </p>

      {/* Profile editor dialog */}
      <Dialog
        open={!!editingMemberId}
        onOpenChange={(open) => {
          if (!open) setEditingMemberId(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile: {editingMember?.name ?? ""}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Rank */}
            <div className="space-y-1.5">
              <Label>FC Rank</Label>
              <select
                value={rankDraft}
                onChange={(e) => setRankDraft(e.target.value as FCRank | "")}
                className={cn(selectClass, "w-full")}
              >
                <option value="">No rank</option>
                {FC_RANKS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {editingMember?.fflogsId && (
              <div className="space-y-1.5">
                <Label htmlFor="member-fflogs-id">Resolved FFLogs ID</Label>
                <Input
                  id="member-fflogs-id"
                  value={editingMember.fflogsId}
                  disabled
                  className="font-mono text-xs"
                />
              </div>
            )}

            {/* Bio */}
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <textarea
                value={profileDraft.bio ?? ""}
                onChange={(e) =>
                  setProfileDraft((d) => ({
                    ...d,
                    bio: e.target.value || null,
                  }))
                }
                placeholder="A short bio..."
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Birthday */}
            <div className="space-y-1.5">
              <Label>Birthday</Label>
              <div className="flex gap-2">
                <Select
                  value={bdMonth ? String(bdMonth) : ""}
                  onValueChange={(v) => setBdMonth(Number(v))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((label, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={bdDay ? String(bdDay) : ""}
                  onValueChange={(v) => setBdDay(Number(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Main jobs */}
            <div className="space-y-2">
              <Label>Main Jobs</Label>
              <div className="grid grid-cols-7 gap-1.5">
                {JOBS.map(({ abbr, full }) => {
                  const selected = (profileDraft.mainJobs ?? []).includes(full);
                  const icon = jobIcon(full);
                  return (
                    <button
                      key={abbr}
                      type="button"
                      title={full}
                      onClick={() => toggleJob(full)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/60",
                      )}
                    >
                      {icon ? (
                        <img
                          src={icon}
                          alt={abbr}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center text-xs font-mono">
                          {abbr}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-mono leading-none",
                          selected
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {abbr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditingMemberId(null)}
              disabled={profileSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
