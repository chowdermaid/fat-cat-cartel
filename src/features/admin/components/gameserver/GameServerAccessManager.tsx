import { useEffect, useMemo, useState } from "react";
import { Activity, Power, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  GameServerAuditLogEntry,
  GameServerSettings,
} from "@/features/gameserver/types";
import {
  deleteGameServerAccess,
  emptyGameServerAccessEntry,
  getGameServerSettings,
  listGameServerAccess,
  listGameServerAuditLog,
  updateGameServerSettings,
  upsertGameServerAccess,
} from "../../api/gameServerAccess";

type GameServerAccessManagerProps = {
  adminSessionToken: string | null;
};

function formatTimestamp(value: number): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function validateDraft(draft: GameServerAccessEntry): string | null {
  if (!/^\d{16,24}$/.test(draft.discordUserId.trim())) {
    return "Discord ID must be 16-24 digits.";
  }
  if (!draft.displayName.trim()) {
    return "Display name is required.";
  }
  return null;
}

export function GameServerAccessManager({
  adminSessionToken,
}: GameServerAccessManagerProps) {
  const [entries, setEntries] = useState<GameServerAccessEntry[]>([]);
  const [draft, setDraft] = useState<GameServerAccessEntry>(
    emptyGameServerAccessEntry(),
  );
  const [loading, setLoading] = useState(false);
  const [auditEntries, setAuditEntries] = useState<GameServerAuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [settings, setSettings] = useState<GameServerSettings | null>(null);
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editingExisting = useMemo(
    () => entries.some((entry) => entry.discordUserId === draft.discordUserId),
    [draft.discordUserId, entries],
  );

  async function loadEntries() {
    if (!adminSessionToken) return;
    setLoading(true);
    try {
      const result = await listGameServerAccess(adminSessionToken);
      setEntries(result.entries);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load whitelist.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLog() {
    if (!adminSessionToken) return;
    setLoadingAudit(true);
    try {
      const result = await listGameServerAuditLog(adminSessionToken, "palworld");
      setAuditEntries(result.entries);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load audit log.",
      );
    } finally {
      setLoadingAudit(false);
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
    void loadEntries();
    void loadAuditLog();
    void loadSettings();
  }, [adminSessionToken]);

  function editEntry(entry: GameServerAccessEntry) {
    setDraft({
      ...entry,
      notes: entry.notes ?? null,
    });
  }

  function resetDraft() {
    setDraft(emptyGameServerAccessEntry());
  }

  async function saveDraft() {
    if (!adminSessionToken) return;
    const error = validateDraft(draft);
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const result = await upsertGameServerAccess(adminSessionToken, {
        discordUserId: draft.discordUserId.trim(),
        displayName: draft.displayName.trim(),
        enabled: draft.enabled,
        notes: draft.notes?.trim() || null,
      });
      setEntries((current) =>
        [...current.filter((entry) => entry.discordUserId !== result.entry.discordUserId), result.entry]
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      toast.success(`${result.entry.displayName} saved.`);
      resetDraft();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save whitelist entry.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: GameServerAccessEntry) {
    if (!adminSessionToken) return;
    setDeletingId(entry.discordUserId);
    try {
      await deleteGameServerAccess(adminSessionToken, entry.discordUserId);
      setEntries((current) =>
        current.filter((item) => item.discordUserId !== entry.discordUserId),
      );
      if (draft.discordUserId === entry.discordUserId) resetDraft();
      toast.success(`${entry.displayName} removed.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete whitelist entry.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleEnabled(entry: GameServerAccessEntry) {
    if (!adminSessionToken) return;
    try {
      const result = await upsertGameServerAccess(adminSessionToken, {
        discordUserId: entry.discordUserId,
        displayName: entry.displayName,
        enabled: !entry.enabled,
        notes: entry.notes,
      });
      setEntries((current) =>
        current.map((item) =>
          item.discordUserId === entry.discordUserId ? result.entry : item,
        ),
      );
      toast.success(
        `${result.entry.displayName} ${result.entry.enabled ? "enabled" : "disabled"}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update whitelist entry.",
      );
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
      toast.success(result.settings.enabled ? "Palworld enabled." : "Palworld disabled.");
      void loadAuditLog();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save Palworld settings.",
      );
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-muted-foreground" />
              Palworld Availability
            </CardTitle>
          </div>
          <Badge variant={settingsEnabled ? "secondary" : "outline"}>
            {settingsEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border px-3 py-3">
            <Checkbox
              id="palworld-enabled"
              checked={settingsEnabled}
              onCheckedChange={(checked) => setSettingsEnabled(checked === true)}
              disabled={loadingSettings || savingSettings}
            />
            <div className="space-y-1">
              <Label htmlFor="palworld-enabled" className="text-sm font-medium">
                Palworld enabled
              </Label>
              <p className="text-xs text-muted-foreground">
                Turning this off blocks user controls and skips idle auto-stop checks.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="palworld-disabled-message">Disabled Message</Label>
            <Input
              id="palworld-disabled-message"
              value={disabledMessage}
              onChange={(event) => setDisabledMessage(event.target.value)}
              placeholder="Optional message shown on the Palworld page"
              disabled={loadingSettings || savingSettings}
              maxLength={240}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void saveSettings()}
              disabled={loadingSettings || savingSettings}
            >
              <Save className="h-4 w-4" />
              {savingSettings ? "Saving" : "Save Settings"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void loadSettings()}
              disabled={loadingSettings || savingSettings}
            >
              <RefreshCw className="h-4 w-4" />
              {loadingSettings ? "Refreshing" : "Refresh"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Updated {formatTimestamp(settings?.updatedAt ?? 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Whitelist Entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(14rem,2fr)_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="game-server-discord-id">Discord ID</Label>
            <Input
              id="game-server-discord-id"
              value={draft.discordUserId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  discordUserId: event.target.value,
                }))
              }
              placeholder="123456789012345678"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-server-display-name">Display Name</Label>
            <Input
              id="game-server-display-name"
              value={draft.displayName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              placeholder="Discord name or nickname"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-server-notes">Notes</Label>
            <Input
              id="game-server-notes"
              value={draft.notes ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value || null,
                }))
              }
              placeholder="Optional"
            />
          </div>
          <div className="flex h-10 items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="game-server-enabled"
                checked={draft.enabled}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    enabled: checked === true,
                  }))
                }
              />
              <Label htmlFor="game-server-enabled" className="text-sm">
                Enabled
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:col-span-4">
            <Button onClick={() => void saveDraft()} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving" : editingExisting ? "Save Changes" : "Add Entry"}
            </Button>
            <Button variant="outline" onClick={resetDraft} disabled={saving}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Discord IDs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Discord ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.discordUserId}>
                  <TableCell className="font-medium">
                    {entry.displayName}
                  </TableCell>
                  <TableCell>{entry.discordUserId}</TableCell>
                  <TableCell>
                    <Badge variant={entry.enabled ? "secondary" : "outline"}>
                      {entry.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate">
                    {entry.notes ?? "None"}
                  </TableCell>
                  <TableCell>{formatTimestamp(entry.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editEntry(entry)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleEnabled(entry)}
                      >
                        {entry.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === entry.discordUserId}
                        onClick={() => void removeEntry(entry)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!entries.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loading ? "Loading whitelist..." : "No whitelist entries yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Recent Game Server Actions
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAuditLog()}
            disabled={loadingAudit}
          >
            <RefreshCw className="h-4 w-4" />
            {loadingAudit ? "Refreshing" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatTimestamp(entry.createdAt)}</TableCell>
                  <TableCell className="font-medium capitalize">
                    {entry.action}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        entry.result === "failed" || entry.result === "blocked"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {entry.result}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48 truncate">
                      {entry.requestedByDisplayName ||
                        entry.requestedByDiscordUserId}
                    </div>
                    {entry.isAdmin && (
                      <div className="text-xs text-muted-foreground">
                        Admin
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {entry.statusAfter
                      ? `${entry.statusBefore} -> ${entry.statusAfter}`
                      : entry.statusBefore}
                  </TableCell>
                  <TableCell className="max-w-80 truncate">
                    {entry.message}
                  </TableCell>
                </TableRow>
              ))}
              {!auditEntries.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAudit
                      ? "Loading audit log..."
                      : "No game server actions logged yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
