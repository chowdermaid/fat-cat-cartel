import { useEffect, useState } from "react";
import { db, ref, onValue, push, remove, set } from "@/lib/db";
import { firebaseApp } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFCCollection } from "@/features/fc-collection/api/useFCCollection";
import { fetchAndCacheFCData } from "@/features/fc-collection/api/fetchAndCacheFCData";
import type { FCMember } from "@/features/fc-collection/types";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type RaidMember = {
  id: string;
  name: string;
  server: string;
  lodestoneId: string | null;
  avatarUrl: string | null;
};

export function FCMembersManager() {
  const [members, setMembers] = useState<FCMember[]>([]);
  const [name, setName] = useState("");
  const [lodestoneId, setLodestoneId] = useState("");

  const { memberData, lastFetched, loading } = useFCCollection();
  const [fetchingCollection, setFetchingCollection] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);

  const [raidLastUpdated, setRaidLastUpdated] = useState<number | null>(null);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const [guildMembers, setGuildMembers] = useState<Record<string, { name: string; server: string }> | null>(null);
  const [portraitCache, setPortraitCache] = useState<Record<string, { lodestoneId?: string | null; avatarUrl?: string | null }> | null>(null);
  const [overrideInputs, setOverrideInputs] = useState<Record<string, string>>({});
  const [savingOverrides, setSavingOverrides] = useState<Set<string>>(new Set());

  async function handleRefreshCollection() {
    if (members.length === 0) { setCollectionError("No members added yet."); return; }
    setFetchingCollection(true);
    setCollectionError(null);
    try {
      await fetchAndCacheFCData(members, memberData);
    } catch (e) {
      setCollectionError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetchingCollection(false);
    }
  }

  async function handleRefreshLogs() {
    if (!firebaseApp) {
      setLogsError("Not available in local dev mode.");
      return;
    }
    setFetchingLogs(true);
    setLogsError(null);
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const fn = httpsCallable(getFunctions(firebaseApp), "triggerFFLogsRefresh", { timeout: 300_000 });
      await fn();
    } catch (e) {
      setLogsError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setFetchingLogs(false);
    }
  }

  useEffect(() => {
    const unsub = onValue(ref(db, "fcCollection/members"), (snap: any) => {
      const val = snap.val();
      setMembers(
        val
          ? Object.entries(val).map(([id, data]) => ({ id, ...(data as Omit<FCMember, "id">) }))
          : [],
      );
    });
    return unsub;
  }, []);

  useEffect(() => {
    return onValue(ref(db, "raidStats/lastUpdated"), (snap: any) => {
      setRaidLastUpdated(snap.val() ?? null);
    });
  }, []);

  useEffect(() => {
    const unsubGM = onValue(ref(db, "guildMembers"), (snap: any) => {
      setGuildMembers(snap.val() ?? null);
    });
    const unsubPC = onValue(ref(db, "portraitCache"), (snap: any) => {
      setPortraitCache(snap.val() ?? null);
    });
    return () => { unsubGM(); unsubPC(); };
  }, []);

  function handleAdd() {
    if (!name.trim() || !lodestoneId.trim()) return;
    push(ref(db, "fcCollection/members"), {
      name: name.trim(),
      lodestoneId: lodestoneId.trim(),
    });
    setName("");
    setLodestoneId("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  async function handleSaveOverride(fflogsId: string) {
    const val = overrideInputs[fflogsId]?.trim();
    if (!val) return;
    setSavingOverrides((prev) => new Set([...prev, fflogsId]));
    try {
      await set(ref(db, `portraitOverrides/${fflogsId}`), { lodestoneId: val });
      setOverrideInputs((prev) => ({ ...prev, [fflogsId]: "" }));
    } finally {
      setSavingOverrides((prev) => {
        const s = new Set(prev);
        s.delete(fflogsId);
        return s;
      });
    }
  }

  const raidMembers: RaidMember[] = guildMembers
    ? Object.entries(guildMembers)
        .map(([id, gm]) => ({
          id,
          name: gm.name,
          server: gm.server,
          lodestoneId: portraitCache?.[id]?.lodestoneId ?? null,
          avatarUrl: portraitCache?.[id]?.avatarUrl ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const matchedCount = raidMembers.filter((m) => m.lodestoneId).length;

  return (
    <div className="space-y-6">
      {/* FC Collection refresh */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Collection Data</p>
          <p className="text-xs text-muted-foreground">
            {lastFetched ? `Updated ${formatTimeAgo(lastFetched)}` : "Never fetched"}
          </p>
          {collectionError && <p className="text-xs text-destructive mt-0.5">{collectionError}</p>}
        </div>
        <Button size="sm" onClick={handleRefreshCollection} disabled={fetchingCollection || loading}>
          <RefreshCw className={cn("h-4 w-4", fetchingCollection && "animate-spin")} />
          {fetchingCollection ? "Fetching…" : "Refresh Data"}
        </Button>
      </div>

      {/* FFLogs / Raid Stats refresh */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Raid Stats</p>
          <p className="text-xs text-muted-foreground">
            {raidLastUpdated ? `Updated ${formatTimeAgo(raidLastUpdated)}` : "Never fetched"}
          </p>
          {logsError && <p className="text-xs text-destructive mt-0.5">{logsError}</p>}
        </div>
        <Button size="sm" onClick={handleRefreshLogs} disabled={fetchingLogs}>
          <RefreshCw className={cn("h-4 w-4", fetchingLogs && "animate-spin")} />
          {fetchingLogs ? "Fetching…" : "Refresh Logs"}
        </Button>
      </div>

      {/* Portrait links */}
      {raidMembers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Portrait Links</p>
            <p className="text-xs text-muted-foreground">
              {matchedCount}/{raidMembers.length} matched
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            FFLogs members are auto-matched to Lodestone portraits on each refresh via XIVAPI.
            Enter a Lodestone ID manually for unmatched members — takes effect after the next Refresh Logs.
          </p>
          <div className="rounded-lg border divide-y">
            {raidMembers.map((m) => (
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
                  <p className="text-xs text-muted-foreground">{m.server}</p>
                </div>
                {m.lodestoneId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">{m.lodestoneId}</span>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      className="h-7 w-28 text-xs font-mono"
                      placeholder="Lodestone ID"
                      value={overrideInputs[m.id] ?? ""}
                      onChange={(e) =>
                        setOverrideInputs((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveOverride(m.id);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleSaveOverride(m.id)}
                      disabled={!overrideInputs[m.id]?.trim() || savingOverrides.has(m.id)}
                    >
                      Link
                    </Button>
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="fc-member-name">Character Name</Label>
          <Input
            id="fc-member-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Chow Chow"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fc-lodestone-id">Lodestone ID</Label>
          <Input
            id="fc-lodestone-id"
            value={lodestoneId}
            onChange={(e) => setLodestoneId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="12345678"
          />
        </div>
        <Button onClick={handleAdd} disabled={!name.trim() || !lodestoneId.trim()}>
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Find Lodestone IDs at{" "}
        <a
          href="https://na.finalfantasyxiv.com/lodestone/character/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          na.finalfantasyxiv.com/lodestone/character
        </a>
      </p>

      <div className="rounded-lg border divide-y">
        {members.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No members added yet.
          </p>
        )}
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{m.lodestoneId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(ref(db, `fcCollection/members/${m.id}`))}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
