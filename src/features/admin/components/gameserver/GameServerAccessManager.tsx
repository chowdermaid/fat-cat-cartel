import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Power,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
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
  GameServerAccessCandidate,
  GameServerAccessEntry,
  GameServerAuditLogEntry,
  GameServerSettings,
} from "@/features/gameserver/types";
import {
  deleteGameServerAccess,
  getGameServerSettings,
  listGameServerAccessCandidates,
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

function rankLabel(value: string | null): string {
  return value || "Unranked";
}

function matchesSearch(candidate: GameServerAccessCandidate, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    candidate.characterName,
    candidate.displayName,
    candidate.discordUserId,
    candidate.lodestoneId,
    candidate.fcRank ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function MemberIdentity({ candidate }: { candidate: GameServerAccessCandidate }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {candidate.avatarUrl ? (
        <img
          src={candidate.avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <span className="text-xs font-medium">
            {candidate.characterName.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">{candidate.characterName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {rankLabel(candidate.fcRank)} · {candidate.discordUserId}
        </div>
      </div>
    </div>
  );
}

function AccessStatusBadge({
  entry,
  implicit,
}: {
  entry: GameServerAccessEntry | null;
  implicit?: boolean;
}) {
  if (implicit) {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheck className="h-3.5 w-3.5" />
        Implicit
      </Badge>
    );
  }
  if (!entry) return <Badge variant="outline">No access</Badge>;
  return (
    <Badge variant={entry.enabled ? "secondary" : "outline"}>
      {entry.enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

export function GameServerAccessManager({
  adminSessionToken,
}: GameServerAccessManagerProps) {
  const [candidates, setCandidates] = useState<GameServerAccessCandidate[]>([]);
  const [legacyEntries, setLegacyEntries] = useState<GameServerAccessEntry[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [auditEntries, setAuditEntries] = useState<GameServerAuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [settings, setSettings] = useState<GameServerSettings | null>(null);
  const [settingsEnabled, setSettingsEnabled] = useState(true);
  const [disabledMessage, setDisabledMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredCandidates = useMemo(
    () => candidates.filter((candidate) => matchesSearch(candidate, memberSearch)),
    [candidates, memberSearch],
  );
  const explicitCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) => !candidate.implicitAccess && candidate.accessEntry,
      ),
    [candidates],
  );
  const implicitCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.implicitAccess),
    [candidates],
  );

  async function loadAccessCandidates() {
    if (!adminSessionToken) return;
    setLoadingAccess(true);
    try {
      const result = await listGameServerAccessCandidates(adminSessionToken);
      setCandidates(result.candidates);
      setLegacyEntries(result.legacyEntries);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load Palworld access.",
      );
    } finally {
      setLoadingAccess(false);
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
    void loadAccessCandidates();
    void loadAuditLog();
    void loadSettings();
  }, [adminSessionToken]);

  async function addCandidate(candidate: GameServerAccessCandidate) {
    if (!adminSessionToken || candidate.implicitAccess) return;
    setSavingId(candidate.discordUserId);
    try {
      await upsertGameServerAccess(adminSessionToken, {
        discordUserId: candidate.discordUserId,
        displayName: candidate.characterName,
        enabled: true,
        notes: null,
      });
      toast.success(`${candidate.characterName} can access Palworld.`);
      await loadAccessCandidates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add Palworld access.",
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
      await loadAccessCandidates();
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
    setSavingId(entry.discordUserId);
    try {
      const result = await upsertGameServerAccess(adminSessionToken, {
        discordUserId: entry.discordUserId,
        displayName: entry.displayName,
        enabled: !entry.enabled,
        notes: entry.notes,
      });
      toast.success(
        `${result.entry.displayName} ${result.entry.enabled ? "enabled" : "disabled"}.`,
      );
      await loadAccessCandidates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update whitelist entry.",
      );
    } finally {
      setSavingId(null);
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Linked Member Access</CardTitle>
            <CardDescription>
              Search linked members and grant explicit Palworld access.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAccessCandidates()}
            disabled={loadingAccess}
          >
            <RefreshCw className="h-4 w-4" />
            {loadingAccess ? "Refreshing" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search linked members..."
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.discordUserId}>
                  <TableCell>
                    <MemberIdentity candidate={candidate} />
                  </TableCell>
                  <TableCell>
                    <AccessStatusBadge
                      entry={candidate.accessEntry}
                      implicit={candidate.implicitAccess}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {candidate.implicitAccess ? (
                        <Button size="sm" variant="ghost" disabled>
                          <ShieldCheck className="h-4 w-4" />
                          Included
                        </Button>
                      ) : candidate.accessEntry ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === candidate.discordUserId}
                          onClick={() => void toggleEnabled(candidate.accessEntry!)}
                        >
                          {candidate.accessEntry.enabled ? "Disable" : "Enable"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={savingId === candidate.discordUserId}
                          onClick={() => void addCandidate(candidate)}
                        >
                          <UserPlus className="h-4 w-4" />
                          Add
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredCandidates.length && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAccess
                      ? "Loading linked members..."
                      : "No linked members match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Explicit Access</CardTitle>
          <CardDescription>
            Non-admin linked members who have a Palworld whitelist entry.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {explicitCandidates.map((candidate) => {
                const entry = candidate.accessEntry!;
                return (
                  <TableRow key={entry.discordUserId}>
                    <TableCell>
                      <MemberIdentity candidate={candidate} />
                    </TableCell>
                    <TableCell>
                      <AccessStatusBadge entry={entry} />
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
                          disabled={savingId === entry.discordUserId}
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
                );
              })}
              {!explicitCandidates.length && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAccess
                      ? "Loading explicit access..."
                      : "No linked members have explicit access yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Implicit Boss / Underpaw Access</CardTitle>
          <CardDescription>
            These linked members can access Palworld through their admin role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {implicitCandidates.map((candidate) => (
                <TableRow key={candidate.discordUserId}>
                  <TableCell>
                    <MemberIdentity candidate={candidate} />
                  </TableCell>
                  <TableCell>
                    <AccessStatusBadge entry={candidate.accessEntry} implicit />
                  </TableCell>
                </TableRow>
              ))}
              {!implicitCandidates.length && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAccess
                      ? "Loading implicit access..."
                      : "No linked Boss or Underpaw members found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legacy Entries</CardTitle>
          <CardDescription>
            Existing whitelist rows that are not linked to a tracked member.
          </CardDescription>
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
              {legacyEntries.map((entry) => (
                <TableRow key={entry.discordUserId}>
                  <TableCell className="font-medium">
                    {entry.displayName}
                  </TableCell>
                  <TableCell>{entry.discordUserId}</TableCell>
                  <TableCell>
                    <AccessStatusBadge entry={entry} />
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
                        disabled={savingId === entry.discordUserId}
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
              {!legacyEntries.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {loadingAccess
                      ? "Loading legacy entries..."
                      : "No legacy entries."}
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
