import { useEffect, useState } from "react";
import { toast } from "sonner";
import { db, ref, onValue, set, remove, get } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { callAdminFunction } from "../lib/adminFunctions";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowDownUp,
  Activity,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Member } from "@/types";
import type { MemberProfile } from "@/features/member-profile/types";
import {
  FavoriteCollectiblePicker,
  type FavoriteCollectibleOption,
} from "@/features/member-profile/FavoriteCollectiblePicker";
import {
  FAVORITE_CONTENT_OPTIONS,
  PROFILE_TIMEZONES,
  timezoneLabel,
} from "@/features/member-profile/profileOptions";
import type { MemberCacheData } from "@/features/fc-collection/types";
import type { Collectible } from "@/features/fc-collection/types";
import type { ParseEntry, TomestoneActivity } from "@/features/raid-stats/types";

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
type SyncSource = "collection" | "tomestone" | "fflogs" | "lodestone";
type SyncState =
  | "current"
  | "stale"
  | "missing"
  | "no-id"
  | "no-data"
  | "no-activity"
  | "failed"
  | "unknown-age";

type MemberSyncStatus = {
  collection: SourceSyncStatus;
  tomestone: SourceSyncStatus;
  fflogs: SourceSyncStatus;
  lodestone: SourceSyncStatus;
};

type SyncMetadata = {
  status?: "success" | "error";
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  message?: string;
  details?: unknown;
};

type SourceSyncStatus = {
  source: SyncSource;
  state: SyncState;
  label: string;
  detail: string;
  actionable: boolean;
};

const SOURCE_LABEL: Record<SyncSource, string> = {
  collection: "Collection",
  tomestone: "Tomestone",
  fflogs: "FFLogs",
  lodestone: "Lodestone",
};

const FRESHNESS_MS: Record<SyncSource, number> = {
  collection: 4 * 60 * 60 * 1000,
  tomestone: 3 * 60 * 60 * 1000,
  fflogs: 30 * 60 * 60 * 1000,
  lodestone: 7 * 24 * 60 * 60 * 1000,
};

const RANK_ORDER = new Map<string, number>(
  FC_RANKS.map((rank, index) => [rank, index]),
);

const EMPTY_PROFILE: MemberProfile = {
  bio: null,
  birthday: null,
  mainJobs: [],
  timezone: null,
  favoriteMountId: null,
  favoriteMinionId: null,
  favoriteContent: null,
};

function clearRaidStatsCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("fcc_raidstats_")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    return;
  }
}

function clearMembersCache() {
  localStorage.removeItem("fcc_members_v3");
}

function clearCollectionCache() {
  localStorage.removeItem("fcc_collection_v3");
  localStorage.removeItem("fcc_collectibles_v1");
}

function statusVariant(status: SyncState): "default" | "secondary" | "outline" | "destructive" {
  if (status === "current") return "default";
  if (status === "failed") return "destructive";
  if (status === "stale" || status === "unknown-age") return "secondary";
  return "outline";
}

function statusText(status: SyncState): string {
  if (status === "current") return "Current";
  if (status === "stale") return "Stale";
  if (status === "no-id") return "No ID";
  if (status === "no-data") return "No data";
  if (status === "no-activity") return "No activity";
  if (status === "failed") return "Failed";
  if (status === "unknown-age") return "Unknown age";
  return "Missing";
}

function buildStatus(
  source: SyncSource,
  hasData: boolean,
  missingState: SyncState,
  missingDetail: string,
  metadata?: SyncMetadata,
  dataDetail?: string,
  fallbackLastSuccessAt?: number | null,
): SourceSyncStatus {
  const label = SOURCE_LABEL[source];
  if (metadata?.status === "error") {
    return {
      source,
      state: "failed",
      label,
      detail: metadata.message ?? `${label} refresh failed.`,
      actionable: true,
    };
  }
  if (!hasData) {
    return {
      source,
      state: missingState,
      label,
      detail: missingDetail,
      actionable: true,
    };
  }
  const lastSuccessAt = metadata?.lastSuccessAt ?? fallbackLastSuccessAt ?? null;
  if (!lastSuccessAt) {
    return {
      source,
      state: "unknown-age",
      label,
      detail: dataDetail ?? `${label} data exists, but no sync timestamp has been recorded.`,
      actionable: true,
    };
  }

  const age = Date.now() - lastSuccessAt;
  const detail = `${dataDetail ?? `${label} data exists`}. Last synced ${formatTimeAgo(lastSuccessAt)}.`;
  if (age > FRESHNESS_MS[source]) {
    return {
      source,
      state: "stale",
      label,
      detail,
      actionable: true,
    };
  }
  return {
    source,
    state: "current",
    label,
    detail,
    actionable: false,
  };
}

function StatusCell({
  status,
  loading,
  onRefresh,
}: {
  status: SourceSyncStatus;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1.5">
          <Badge
            variant={statusVariant(status.state)}
            className={cn(
              "whitespace-nowrap text-[10px]",
              (status.state === "missing" || status.state === "no-id") && "text-muted-foreground",
            )}
          >
            {statusText(status.state)}
          </Badge>
          {status.actionable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onRefresh();
              }}
              disabled={loading}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="sr-only">Refresh {status.label}</span>
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="font-medium">{status.label}: {statusText(status.state)}</p>
        <p className="text-xs text-muted-foreground">{status.detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function hasParseData(parse: ParseEntry | null | undefined): boolean {
  return Object.keys(parse?.savage ?? {}).length > 0
    || Object.keys(parse?.normal ?? {}).length > 0
    || parse?.allStars != null;
}

async function readValue<T>(path: string, fallback: T): Promise<T> {
  try {
    const snap = await get(ref(db, path));
    return (snap.val() ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function isCollectible(value: unknown): value is Collectible {
  return value != null && typeof value === "object" && "id" in value && "name" in value;
}

function buildFavoriteOptions(
  ownedIds: number[] | undefined,
  collectiblesById: Record<string, Collectible>,
): FavoriteCollectibleOption[] {
  return (ownedIds ?? [])
    .map((id) => collectiblesById[String(id)])
    .filter(isCollectible)
    .map((item) => ({ id: item.id, name: item.name, icon: item.icon ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface FCMembersManagerProps {
  adminSessionToken: string | null;
}

export function FCMembersManager({ adminSessionToken }: FCMembersManagerProps) {
  const [members, setMembers] = useState<Array<Member & { id: string }>>([]);
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [syncStatuses, setSyncStatuses] = useState<Record<string, MemberSyncStatus>>({});
  const [sourceRefreshing, setSourceRefreshing] = useState<Record<string, boolean>>({});
  const [syncReloadToken, setSyncReloadToken] = useState(0);

  const [fetchingCollection, setFetchingCollection] = useState(false);
  const [collectionLastFetched, setCollectionLastFetched] = useState<
    number | null
  >(null);
  const [raidLastUpdated, setRaidLastUpdated] = useState<number | null>(null);
  const [fetchingTomestone, setFetchingTomestone] = useState(false);
  const [fetchingFFLogs, setFetchingFFLogs] = useState(false);
  const [fetchingLodestone, setFetchingLodestone] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<MemberProfile>({
    ...EMPTY_PROFILE,
  });
  const [rankDraft, setRankDraft] = useState<FCRank | "">("");
  const [bdMonth, setBdMonth] = useState(0);
  const [bdDay, setBdDay] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [favoriteMountOptions, setFavoriteMountOptions] = useState<FavoriteCollectibleOption[]>([]);
  const [favoriteMinionOptions, setFavoriteMinionOptions] = useState<FavoriteCollectibleOption[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadSyncStatuses() {
      const [
        collectionData,
        activityData,
        parseData,
        sourceStatusData,
      ] = await Promise.all([
        readValue<Record<string, MemberCacheData>>("fcCollection/memberData", {}),
        readValue<Record<string, { tomestone?: { recent?: TomestoneActivity[] | Record<string, TomestoneActivity> } }>>("memberActivity", {}),
        readValue<Record<string, ParseEntry>>("raidStats/zones/73/parses", {}),
        readValue<Record<string, Partial<Record<SyncSource, SyncMetadata>>>>("memberSyncStatus", {}),
      ]);

      if (cancelled) return;

      const next: Record<string, MemberSyncStatus> = {};

      for (const member of members) {
        const collection = collectionData[member.id];
        const tomestoneRecent = activityData[member.id]?.tomestone?.recent;
        const tomestoneCount = Array.isArray(tomestoneRecent)
          ? tomestoneRecent.length
          : Object.keys(tomestoneRecent ?? {}).length;
        const parse = parseData[member.id];
        const collectionCount = collection
          ? Object.values(collection.owned ?? {}).reduce((total, owned) => total + owned.length, 0)
          : 0;
        const hasTomestoneProfile = member.tomestoneProfile != null;
        const hasLodestoneData = Boolean(member.avatarUrl || (member.jobLevels && Object.keys(member.jobLevels).length > 0));
        const sourceStatus = sourceStatusData[member.id] ?? {};

        next[member.id] = {
          collection: buildStatus(
            "collection",
            Boolean(collection),
            "missing",
            "No collection member data.",
            sourceStatus.collection,
            collection
              ? `${collectionCount} tracked collectibles, member data fetched ${formatTimeAgo(collection.lastFetched)}`
              : undefined,
            sourceStatus.collection?.lastSuccessAt ? null : collection?.lastFetched,
          ),
          tomestone: buildStatus(
            "tomestone",
            hasTomestoneProfile && tomestoneCount > 0,
            hasTomestoneProfile ? "no-activity" : "missing",
            hasTomestoneProfile
              ? "Tomestone profile exists, but no recent activity rows are stored."
              : "No Tomestone profile is stored.",
            sourceStatus.tomestone,
            hasTomestoneProfile
              ? `${tomestoneCount} recent activity rows`
              : undefined,
          ),
          fflogs: buildStatus(
            "fflogs",
            hasParseData(parse),
            member.fflogsId ? "no-data" : "no-id",
            member.fflogsId
              ? `Linked FFLogs ID ${member.fflogsId}, but no default-zone parses are stored.`
              : "No FFLogs ID has been resolved for this character.",
            sourceStatus.fflogs,
            hasParseData(parse)
              ? "Parse data found in the current default zone"
              : undefined,
          ),
          lodestone: buildStatus(
            "lodestone",
            hasLodestoneData,
            "missing",
            "No Lodestone portrait or job levels are stored.",
            sourceStatus.lodestone,
            hasLodestoneData
              ? member.jobLevelsLastFetched
                ? `Job levels fetched ${formatTimeAgo(member.jobLevelsLastFetched)}`
                : "Portrait loaded"
              : undefined,
            sourceStatus.lodestone?.lastSuccessAt ? null : member.jobLevelsLastFetched,
          ),
        };
      }

      setSyncStatuses(next);
    }

    if (members.length === 0) {
      setSyncStatuses({});
      return;
    }

    loadSyncStatuses().catch(() => {
      if (!cancelled) setSyncStatuses({});
    });

    return () => {
      cancelled = true;
    };
  }, [members, syncReloadToken]);

  async function handleRefreshCollection() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingCollection(true);
    const id = toast.loading("Refreshing collection data...");
    try {
      await callAdminFunction(
        "triggerFCCollectionRefresh",
        adminSessionToken,
        {},
        { timeout: 300_000 },
      );
      toast.success("Collection data refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingCollection(false);
    }
  }

  async function handleRefreshTomestone() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingTomestone(true);
    const id = toast.loading("Refreshing Tomestone activity...");
    try {
      await callAdminFunction("triggerTomestoneRaidStatsRefresh", adminSessionToken, {}, { timeout: 300_000 });
      clearMembersCache();
      clearRaidStatsCache();
      toast.success("Tomestone activity refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingTomestone(false);
    }
  }

  async function handleRefreshFFLogs() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingFFLogs(true);
    const id = toast.loading("Refreshing FFLogs parses...");
    try {
      await callAdminFunction("triggerFFLogsRefresh", adminSessionToken, {}, { timeout: 300_000 });
      clearMembersCache();
      clearRaidStatsCache();
      toast.success("FFLogs parses refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingFFLogs(false);
    }
  }

  async function handleRefreshMemberSource(member: Member & { id: string }, source: SyncSource) {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }

    const key = `${member.id}:${source}`;
    setSourceRefreshing((current) => ({ ...current, [key]: true }));
    const label = SOURCE_LABEL[source];
    const id = toast.loading(`Refreshing ${label} for ${member.name}...`);
    try {
      await callAdminFunction(
        "refreshMemberSource",
        adminSessionToken,
        { lodestoneId: member.id, source },
        { timeout: 300_000 },
      );

      if (source === "lodestone") clearMembersCache();
      if (source === "collection") clearCollectionCache();
      if (source === "tomestone" || source === "fflogs") {
        clearMembersCache();
        clearRaidStatsCache();
      }
      setSyncReloadToken((value) => value + 1);
      toast.success(`${label} refreshed for ${member.name}.`, { id });
    } catch (e) {
      setSyncReloadToken((value) => value + 1);
      toast.error(e instanceof Error ? e.message : `${label} refresh failed.`, { id });
    } finally {
      setSourceRefreshing((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function handleImportLodestone() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingLodestone(true);
    const id = toast.loading("Syncing Lodestone portraits...");
    try {
      const result = await callAdminFunction<{ total: number; written: number; failed: number }>(
        "importLodestoneMembers",
        adminSessionToken,
        {},
        { timeout: 300_000 },
      );
      clearMembersCache();
      const failedText = result.failed > 0 ? `, ${result.failed} failed` : "";
      toast.success(`${result.written}/${result.total} tracked members synced${failedText}.`, { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed.", { id });
    } finally {
      setFetchingLodestone(false);
    }
  }

  async function handleAdd() {
    if (!name.trim() || !lodestoneId.trim()) return;
    const memberName = name.trim();
    const memberLodestoneId = lodestoneId.trim();
    if (firebaseApp) {
      if (!adminSessionToken) throw new Error("Admin session is required.");
      await callAdminFunction(
        "upsertMember",
        adminSessionToken,
        { lodestoneId: memberLodestoneId, name: memberName },
      );
    } else {
      await Promise.all([
        set(ref(db, `members/${memberLodestoneId}`), {
          name: memberName,
          avatarUrl: null,
        }),
        set(ref(db, "membersLastUpdated"), Date.now()),
      ]);
    }
    clearMembersCache();
    setName("");
    setLodestoneId("");
    toast.success(`${memberName} added to roster.`);
  }

  function handleDeleteMember(id: string, memberName: string) {
    setDeleteTarget({ id, name: memberName });
  }

  async function confirmDeleteMember() {
    if (!deleteTarget) return;
    setDeletingMember(true);
    try {
      if (firebaseApp) {
        if (!adminSessionToken) throw new Error("Admin session is required.");
        await callAdminFunction(
          "deleteMember",
          adminSessionToken,
          { lodestoneId: deleteTarget.id, name: deleteTarget.name },
        );
      } else {
        await Promise.all([
          remove(ref(db, `members/${deleteTarget.id}`)),
          set(ref(db, "membersLastUpdated"), Date.now()),
        ]);
      }
      clearMembersCache();
      localStorage.removeItem("fcc_collection_v2");
      localStorage.removeItem("fcc_collectibles_v1");
      clearRaidStatsCache();
      toast.success(`${deleteTarget.name} removed from roster.`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member.");
    } finally {
      setDeletingMember(false);
    }
  }

  async function openProfileEditor(memberId: string) {
    setProfileDraft({ ...EMPTY_PROFILE });
    setFavoriteMountOptions([]);
    setFavoriteMinionOptions([]);
    setBdMonth(0);
    setBdDay(0);
    const currentRank = members.find((m) => m.id === memberId)?.fcRank;
    setRankDraft(
      FC_RANKS.includes(currentRank as FCRank) ? (currentRank as FCRank) : "",
    );
    setEditingMemberId(memberId);
    try {
      const [snap, collectionData, mounts, minions] = await Promise.all([
        get(ref(db, `memberProfiles/${memberId}`)),
        readValue<MemberCacheData | null>(`fcCollection/memberData/${memberId}`, null),
        readValue<Record<string, Collectible>>("fcCollection/collectibles/mounts", {}),
        readValue<Record<string, Collectible>>("fcCollection/collectibles/minions", {}),
      ]);
      const existing = snap.val() as Partial<MemberProfile> | null;
      if (existing) {
        setProfileDraft({
          bio: existing.bio ?? null,
          birthday: existing.birthday ?? null,
          mainJobs: Array.isArray(existing.mainJobs) ? existing.mainJobs : [],
          timezone: existing.timezone ?? null,
          favoriteMountId: existing.favoriteMountId ?? null,
          favoriteMinionId: existing.favoriteMinionId ?? null,
          favoriteContent: existing.favoriteContent ?? null,
        });
        const { month, day } = parseBirthday(existing.birthday ?? null);
        setBdMonth(month);
        setBdDay(day);
      }
      setFavoriteMountOptions(buildFavoriteOptions(collectionData?.owned.mounts, mounts));
      setFavoriteMinionOptions(buildFavoriteOptions(collectionData?.owned.minions, minions));
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
        timezone: profileDraft.timezone ?? null,
        favoriteMountId: profileDraft.favoriteMountId ?? null,
        favoriteMinionId: profileDraft.favoriteMinionId ?? null,
        favoriteContent: profileDraft.favoriteContent ?? null,
      };
      if (firebaseApp) {
        if (!adminSessionToken) throw new Error("Admin session is required.");
        await callAdminFunction("updateMemberProfileAdmin", adminSessionToken, {
          lodestoneId: editingMemberId,
          profile: profileData,
          fcRank: rankDraft || null,
        });
      } else {
        await Promise.all([
          set(ref(db, `memberProfiles/${editingMemberId}`), profileData),
          set(ref(db, `members/${editingMemberId}/fcRank`), rankDraft || null),
          set(ref(db, "membersLastUpdated"), Date.now()),
        ]);
      }
      clearMembersCache();
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              Tomestone
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Activity and profiles
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshTomestone}
            disabled={fetchingTomestone}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", fetchingTomestone && "animate-spin")}
            />
            {fetchingTomestone ? "Fetching" : "Refresh"}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              FFLogs
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {raidLastUpdated ? formatTimeAgo(raidLastUpdated) : "Never fetched"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshFFLogs}
            disabled={fetchingFFLogs}
            className="shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", fetchingFFLogs && "animate-spin")}
            />
            {fetchingFFLogs ? "Fetching" : "Refresh"}
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
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto rounded-lg border">
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
                  <TableHead className="hidden lg:table-cell">Collection</TableHead>
                  <TableHead className="hidden lg:table-cell">Tomestone</TableHead>
                  <TableHead className="hidden lg:table-cell">FFLogs</TableHead>
                  <TableHead className="hidden lg:table-cell">Lodestone</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((m) => {
                  const status = syncStatuses[m.id];
                  return (
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
                      <TableCell className="hidden lg:table-cell">
                        {status ? (
                          <StatusCell
                            status={status.collection}
                            loading={Boolean(sourceRefreshing[`${m.id}:collection`])}
                            onRefresh={() => handleRefreshMemberSource(m, "collection")}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">...</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {status ? (
                          <StatusCell
                            status={status.tomestone}
                            loading={Boolean(sourceRefreshing[`${m.id}:tomestone`])}
                            onRefresh={() => handleRefreshMemberSource(m, "tomestone")}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">...</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {status ? (
                          <StatusCell
                            status={status.fflogs}
                            loading={Boolean(sourceRefreshing[`${m.id}:fflogs`])}
                            onRefresh={() => handleRefreshMemberSource(m, "fflogs")}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">...</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {status ? (
                          <StatusCell
                            status={status.lodestone}
                            loading={Boolean(sourceRefreshing[`${m.id}:lodestone`])}
                            onRefresh={() => handleRefreshMemberSource(m, "lodestone")}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">...</span>
                        )}
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
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No members match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </div>
          </TooltipProvider>
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deletingMember) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name ?? "member"}?</DialogTitle>
            <DialogDescription>
              This removes the character from the tracked roster and blocks automatic reimport from future syncs until an admin adds them again.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-sm font-medium">{deleteTarget?.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {deleteTarget?.id}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingMember}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMember}
              disabled={deletingMember}
            >
              <Trash2 className="h-4 w-4" />
              {deletingMember ? "Removing..." : "Remove Character"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Select
                  value={profileDraft.timezone ?? "none"}
                  onValueChange={(value) =>
                    setProfileDraft((d) => ({
                      ...d,
                      timezone: value === "none" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No timezone</SelectItem>
                    {PROFILE_TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezoneLabel(timezone)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Favorite Content</Label>
                <Select
                  value={profileDraft.favoriteContent ?? "none"}
                  onValueChange={(value) =>
                    setProfileDraft((d) => ({
                      ...d,
                      favoriteContent: value === "none" ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Favorite content" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No favorite</SelectItem>
                    {FAVORITE_CONTENT_OPTIONS.map((content) => (
                      <SelectItem key={content} value={content}>
                        {content}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FavoriteCollectiblePicker
                label="Favorite Mount"
                emptyText="No synced owned mounts yet."
                options={favoriteMountOptions}
                value={profileDraft.favoriteMountId}
                onChange={(value) =>
                  setProfileDraft((d) => ({ ...d, favoriteMountId: value }))
                }
              />

              <FavoriteCollectiblePicker
                label="Favorite Minion"
                emptyText="No synced owned minions yet."
                options={favoriteMinionOptions}
                value={profileDraft.favoriteMinionId}
                onChange={(value) =>
                  setProfileDraft((d) => ({ ...d, favoriteMinionId: value }))
                }
              />
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
