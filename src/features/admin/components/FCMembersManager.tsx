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
import { Trash2, UserPlus, RefreshCw, User, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
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

const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
};

export function FCMembersManager() {
  const [members, setMembers] = useState<Array<Member & { id: string }>>([]);
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");

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
    return onValue(ref(db, "members"), (snap: any) => {
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
    return onValue(ref(db, "raidStats/lastUpdated"), (snap: any) => {
      setRaidLastUpdated(snap.val() ?? null);
    });
  }, []);

  useEffect(() => {
    return onValue(
      ref(db, "fcCollection/collectibles/lastFetched"),
      (snap: any) => {
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
    const id = toast.loading("Syncing Lodestone roster...");
    try {
      const { getFunctions, httpsCallable } =
        await import("firebase/functions");
      const fn = httpsCallable<unknown, { total: number; written: number }>(
        getFunctions(firebaseApp),
        "importLodestoneMembers",
        { timeout: 120_000 },
      );
      const res = await fn();
      toast.success(`${res.data.written}/${res.data.total} members synced.`, {
        id,
      });
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

  const matchedCount = members.filter((m) => m.fflogsId).length;
  const editingMember = members.find((m) => m.id === editingMemberId);

  const selectClass =
    "rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      {/* Collection refresh */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Collection Data</p>
          <p className="text-xs text-muted-foreground">
            {collectionLastFetched
              ? `Updated ${formatTimeAgo(collectionLastFetched)}`
              : "Never fetched"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleRefreshCollection}
          disabled={fetchingCollection}
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingCollection && "animate-spin")}
          />
          {fetchingCollection ? "Fetching..." : "Refresh Data"}
        </Button>
      </div>

      {/* Raid stats refresh */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Raid Stats</p>
          <p className="text-xs text-muted-foreground">
            {raidLastUpdated
              ? `Updated ${formatTimeAgo(raidLastUpdated)}`
              : "Never fetched"}
          </p>
        </div>
        <Button size="sm" onClick={handleRefreshLogs} disabled={fetchingLogs}>
          <RefreshCw
            className={cn("h-4 w-4", fetchingLogs && "animate-spin")}
          />
          {fetchingLogs ? "Fetching..." : "Refresh Logs"}
        </Button>
      </div>

      {/* Lodestone sync */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Portrait Sync</p>
          <p className="text-xs text-muted-foreground">
            Scrapes Lodestone FC page to sync member roster and portraits
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleImportLodestone}
          disabled={fetchingLodestone}
        >
          <RefreshCw
            className={cn("h-4 w-4", fetchingLodestone && "animate-spin")}
          />
          {fetchingLodestone ? "Syncing..." : "Sync Lodestone"}
        </Button>
      </div>

      {/* Member roster */}
      {members.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Members</p>
            <p className="text-xs text-muted-foreground">
              {matchedCount}/{members.length} linked to FFLogs
            </p>
          </div>
          <div className="rounded-lg border divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    className="w-8 h-8 rounded-full shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {m.id}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mr-1",
                      m.fflogsId ? "bg-green-500" : "bg-amber-400",
                    )}
                  />
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
              </div>
            ))}
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
            placeholder="Chow Chow"
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
        Manual adds are overwritten on the next Lodestone sync. Find IDs at{" "}
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
                      <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
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
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
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
