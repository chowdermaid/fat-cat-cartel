import { useState } from "react";
import { toast } from "sonner";
import { db, ref, set, remove, get } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import type { MemberProfile } from "@/features/member-profile/types";
import type { FavoriteCollectibleOption } from "@/features/member-profile/FavoriteCollectiblePicker";
import type { MemberCacheData } from "@/features/fc-collection/types";
import type { Collectible } from "@/features/fc-collection/types";
import {
  EMPTY_PROFILE,
  FC_RANKS,
  RANK_ORDER,
  SOURCE_LABEL,
} from "../../constants";
import type {
  AdminMember,
  FCRank,
  SortDir,
  SortKey,
  SyncSource,
} from "../../types";
import {
  deleteMember,
  importLodestoneMembers,
  refreshMemberSource,
  triggerFCCollectionRefresh,
  triggerFFLogsRefresh,
  triggerTomestoneRaidStatsRefresh,
  upsertMember,
  updateMemberProfileAdmin,
} from "../../api/adminMemberFunctions";
import { useAdminMemberSyncStatuses } from "../../hooks/useAdminMemberSyncStatuses";
import { useAdminMembers } from "../../hooks/useAdminMembers";
import { parseBirthday, encodeBirthday } from "../../utils/birthdays";
import {
  clearCollectionCache,
  clearMembersCache,
  clearRaidStatsCache,
} from "../../utils/cacheInvalidation";
import { buildFavoriteOptions } from "../../utils/favorites";
import { MemberDeleteDialog } from "./MemberDeleteDialog";
import { MemberProfileDialog } from "./MemberProfileDialog";
import { MemberRosterTable } from "./MemberRosterTable";
import { MemberSyncToolbar } from "./MemberSyncToolbar";

async function readValue<T>(path: string, fallback: T): Promise<T> {
  try {
    const snap = await get(ref(db, path));
    return (snap.val() ?? fallback) as T;
  } catch {
    return fallback;
  }
}

interface FCMembersManagerProps {
  adminSessionToken: string | null;
}

export function FCMembersManager({ adminSessionToken }: FCMembersManagerProps) {
  const { members, collectionLastFetched, raidLastUpdated } = useAdminMembers();
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sourceRefreshing, setSourceRefreshing] = useState<Record<string, boolean>>({});
  const [syncReloadToken, setSyncReloadToken] = useState(0);
  const syncStatuses = useAdminMemberSyncStatuses(members, syncReloadToken);

  const [fetchingCollection, setFetchingCollection] = useState(false);
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

  async function handleRefreshCollection() {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }
    setFetchingCollection(true);
    const id = toast.loading("Refreshing collection data...");
    try {
      await triggerFCCollectionRefresh(adminSessionToken);
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
      await triggerTomestoneRaidStatsRefresh(adminSessionToken);
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
      await triggerFFLogsRefresh(adminSessionToken);
      clearMembersCache();
      clearRaidStatsCache();
      toast.success("FFLogs parses refreshed.", { id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed.", { id });
    } finally {
      setFetchingFFLogs(false);
    }
  }

  async function handleRefreshMemberSource(member: AdminMember, source: SyncSource) {
    if (!firebaseApp || !adminSessionToken) {
      toast.error("Not available in local dev mode.");
      return;
    }

    const key = `${member.id}:${source}`;
    setSourceRefreshing((current) => ({ ...current, [key]: true }));
    const label = SOURCE_LABEL[source];
    const id = toast.loading(`Refreshing ${label} for ${member.name}...`);
    try {
      await refreshMemberSource(adminSessionToken, member.id, source);

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
      const result = await importLodestoneMembers(adminSessionToken);
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
      await upsertMember(adminSessionToken, { lodestoneId: memberLodestoneId, name: memberName });
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
        await deleteMember(adminSessionToken, { lodestoneId: deleteTarget.id, name: deleteTarget.name });
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
      setFavoriteMountOptions(buildFavoriteOptions(collectionData?.owned?.mounts, mounts));
      setFavoriteMinionOptions(buildFavoriteOptions(collectionData?.owned?.minions, minions));
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
        await updateMemberProfileAdmin(adminSessionToken, {
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

  return (
    <div className="space-y-6">
      <MemberSyncToolbar
        collectionLastFetched={collectionLastFetched}
        raidLastUpdated={raidLastUpdated}
        fetchingCollection={fetchingCollection}
        fetchingTomestone={fetchingTomestone}
        fetchingFFLogs={fetchingFFLogs}
        fetchingLodestone={fetchingLodestone}
        onRefreshCollection={handleRefreshCollection}
        onRefreshTomestone={handleRefreshTomestone}
        onRefreshFFLogs={handleRefreshFFLogs}
        onImportLodestone={handleImportLodestone}
      />

      <MemberRosterTable
        members={members}
        filteredMembers={filteredMembers}
        friendCount={friendCount}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        syncStatuses={syncStatuses}
        sourceRefreshing={sourceRefreshing}
        updateSort={updateSort}
        onRefreshMemberSource={handleRefreshMemberSource}
        onOpenProfileEditor={openProfileEditor}
        onDeleteMember={handleDeleteMember}
      />
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

      <MemberDeleteDialog
        deleteTarget={deleteTarget}
        deletingMember={deletingMember}
        onOpenChange={(open) => {
          if (!open && !deletingMember) setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteMember}
      />
      <MemberProfileDialog
        editingMemberId={editingMemberId}
        editingMember={editingMember}
        profileDraft={profileDraft}
        setProfileDraft={setProfileDraft}
        rankDraft={rankDraft}
        setRankDraft={setRankDraft}
        bdMonth={bdMonth}
        setBdMonth={setBdMonth}
        bdDay={bdDay}
        setBdDay={setBdDay}
        favoriteMountOptions={favoriteMountOptions}
        favoriteMinionOptions={favoriteMinionOptions}
        profileSaving={profileSaving}
        onOpenChange={(open) => {
          if (!open) setEditingMemberId(null);
        }}
        onCancel={() => setEditingMemberId(null)}
        onSave={handleSaveProfile}
        onToggleJob={toggleJob}
      />    </div>
  );
}
