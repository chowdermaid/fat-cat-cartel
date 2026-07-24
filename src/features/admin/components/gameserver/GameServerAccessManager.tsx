import { useEffect, useMemo, useState } from "react";
import { Power, RefreshCw, Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  GameServerAccessEntry,
  GameServerSettings,
} from "@/features/gameserver/types";
import {
  deleteGameServerAccess,
  getGameServerSettings,
  listGameServerAccess,
  updateGameServerSettings,
  upsertGameServerAccess,
} from "../../api/gameServerAccess";

type GameServerAccessManagerProps = {
  adminSessionToken: string | null;
};

function formatTimestamp(value: number | null): string {
  return value ? new Date(value).toLocaleString() : "Never";
}

function AccessStatusBadge({
  entry,
  now,
}: {
  entry: GameServerAccessEntry;
  now: number;
}) {
  const expired = entry.expiresAt !== null && entry.expiresAt <= now;
  return (
    <Badge variant={entry.enabled && !expired ? "secondary" : "outline"}>
      {expired ? "Expired" : entry.enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

export function GameServerAccessManager({
  adminSessionToken,
}: GameServerAccessManagerProps) {
  const [entries, setEntries] = useState<GameServerAccessEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [settings, setSettings] = useState<GameServerSettings | null>(null);
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renderedAt] = useState(Date.now);
  const [newDiscordUserId, setNewDiscordUserId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.displayName, entry.discordUserId, entry.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  async function loadAccess() {
    if (!adminSessionToken) return;
    setLoadingAccess(true);
    try {
      const result = await listGameServerAccess(adminSessionToken);
      setEntries(result.entries);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Palworld access.",
      );
    } finally {
      setLoadingAccess(false);
    }
  }

  async function loadSettings() {
    if (!adminSessionToken) return;
    setLoadingSettings(true);
    try {
      const result = await getGameServerSettings(adminSessionToken);
      setSettings(result.settings);
      setSettingsEnabled(result.settings.enabled);
      setDisabledMessage(result.settings.disabledMessage ?? "");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Palworld settings.",
      );
    } finally {
      setLoadingSettings(false);
    }
  }

  useEffect(() => {
    void loadAccess();
    void loadSettings();
  }, [adminSessionToken]);

  async function grantDiscordUser() {
    if (!adminSessionToken) return;
    const discordUserId = newDiscordUserId.trim();
    const displayName = newDisplayName.trim();
    const expiresAt = newExpiresAt
      ? new Date(`${newExpiresAt}T23:59:59`).getTime()
      : null;
    setSavingId(discordUserId);
    try {
      await upsertGameServerAccess(adminSessionToken, {
        discordUserId,
        displayName,
        enabled: true,
        expiresAt,
        notes: newNotes.trim() || null,
      });
      toast.success(`${displayName} can access Palworld.`);
      setNewDiscordUserId("");
      setNewDisplayName("");
      setNewNotes("");
      setNewExpiresAt("");
      await loadAccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to grant Palworld access.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function toggleEnabled(entry: GameServerAccessEntry) {
    if (!adminSessionToken) return;
    setSavingId(entry.discordUserId);
    try {
      const result = await upsertGameServerAccess(adminSessionToken, {
        discordUserId: entry.discordUserId,
        displayName: entry.displayName,
        enabled: !entry.enabled,
        expiresAt:
          !entry.enabled &&
          entry.expiresAt !== null &&
          entry.expiresAt <= Date.now()
            ? null
            : entry.expiresAt,
        notes: entry.notes,
      });
      toast.success(
        `${result.entry.displayName} ${result.entry.enabled ? "enabled" : "disabled"}.`,
      );
      await loadAccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update access.",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function removeEntry(entry: GameServerAccessEntry) {
    if (!adminSessionToken) return;
    setDeletingId(entry.discordUserId);
    try {
      await deleteGameServerAccess(adminSessionToken, entry.discordUserId);
      toast.success(`${entry.displayName} removed.`);
      await loadAccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove access.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function saveSettings() {
    if (!adminSessionToken) return;
    setSavingSettings(true);
    try {
      const result = await updateGameServerSettings(adminSessionToken, {
        serverId: "palworld",
        enabled: settingsEnabled,
        disabledMessage: disabledMessage.trim() || null,
      });
      setSettings(result.settings);
      setSettingsEnabled(result.settings.enabled);
      setDisabledMessage(result.settings.disabledMessage ?? "");
      toast.success(
        result.settings.enabled ? "Palworld enabled." : "Palworld disabled.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save Palworld settings.",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-muted-foreground" />
            Palworld
          </CardTitle>
          <CardDescription>
            Manage availability and Discord user access.
          </CardDescription>
        </div>
        <Badge variant={settingsEnabled ? "secondary" : "outline"}>
          {settingsEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-3 rounded-md border px-3 py-3">
            <Checkbox
              id="palworld-enabled"
              checked={settingsEnabled}
              onCheckedChange={(checked) => setSettingsEnabled(checked === true)}
              disabled={loadingSettings || savingSettings}
            />
            <Label htmlFor="palworld-enabled">Palworld enabled</Label>
          </div>
          <Input
            aria-label="Disabled message"
            value={disabledMessage}
            onChange={(event) => setDisabledMessage(event.target.value)}
            placeholder="Optional message shown while disabled"
            disabled={loadingSettings || savingSettings}
            maxLength={240}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void saveSettings()}
              disabled={loadingSettings || savingSettings}
            >
              <Save className="h-4 w-4" />
              {savingSettings ? "Saving" : "Save"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Updated {formatTimestamp(settings?.updatedAt ?? null)}
            </span>
          </div>
        </section>

        <section className="grid gap-3 border-t pt-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="palworld-discord-id">Discord User ID</Label>
            <Input
              id="palworld-discord-id"
              value={newDiscordUserId}
              onChange={(event) => setNewDiscordUserId(event.target.value)}
              placeholder="123456789012345678"
              inputMode="numeric"
              maxLength={24}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palworld-display-name">Display Name</Label>
            <Input
              id="palworld-display-name"
              value={newDisplayName}
              onChange={(event) => setNewDisplayName(event.target.value)}
              placeholder="Friend name"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palworld-expiry">Expiry (optional)</Label>
            <Input
              id="palworld-expiry"
              type="date"
              value={newExpiresAt}
              onChange={(event) => setNewExpiresAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palworld-notes">Note (optional)</Label>
            <Input
              id="palworld-notes"
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              maxLength={500}
            />
          </div>
          <div className="md:col-span-2">
            <Button
              onClick={() => void grantDiscordUser()}
              disabled={
                !newDiscordUserId.trim() ||
                !newDisplayName.trim() ||
                savingId === newDiscordUserId.trim()
              }
            >
              <UserPlus className="h-4 w-4" />
              Grant Access
            </Button>
          </div>
        </section>

        <section className="space-y-3 border-t pt-6">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search access..."
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => void loadAccess()}
              disabled={loadingAccess}
              aria-label="Refresh access"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.discordUserId}>
                  <TableCell>
                    <div className="font-medium">{entry.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.discordUserId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AccessStatusBadge entry={entry} now={renderedAt} />
                  </TableCell>
                  <TableCell>
                    {entry.expiresAt
                      ? formatTimestamp(entry.expiresAt)
                      : "No expiry"}
                  </TableCell>
                  <TableCell className="max-w-52 truncate">
                    {entry.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingId === entry.discordUserId}
                        onClick={() => void toggleEnabled(entry)}
                      >
                        {entry.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={deletingId === entry.discordUserId}
                        onClick={() => void removeEntry(entry)}
                        aria-label={`Remove ${entry.displayName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredEntries.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAccess ? "Loading access..." : "No access entries."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </CardContent>
    </Card>
  );
}
