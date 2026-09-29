import { useState } from "react";
import { Power, RefreshCw, Save, Trash2, UserPlus } from "lucide-react";
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
  GameServerId,
} from "@/features/gameserver/types";
import { useGameServerAccessManager } from "../../hooks/useGameServerAccessManager";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

function GameServerAccessForm({ serverId, adminSessionToken, discordUserId, busy, onBusy }: {
  serverId: GameServerId; adminSessionToken: string; discordUserId: string; busy: boolean; onBusy: (busy: boolean) => void;
}) {
  const { gameName, filteredEntries, search, setSearch, loadingAccess, settings, settingsEnabled, setSettingsEnabled,
    disabledMessage, setDisabledMessage, loadingSettings, savingSettings, renderedAt,
    newDiscordUserId, setNewDiscordUserId, newDisplayName, setNewDisplayName, newNotes, setNewNotes,
    newExpiresAt, setNewExpiresAt, loadAccess, loadSettings, grantDiscordUser, toggleEnabled, removeEntry, saveSettings
  } = useGameServerAccessManager(serverId, adminSessionToken, discordUserId, onBusy);
  const [deleteEntry, setDeleteEntry] = useState<GameServerAccessEntry | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5 text-muted-foreground" />
            Game Server Access: {gameName}
          </CardTitle>
          <CardDescription>
            Grants apply only to {gameName}. Live Boss/Underpaw admins bypass both lists.
          </CardDescription>
        </div>
        <Badge variant={settingsEnabled ? "secondary" : "outline"}>
          {!settings ? loadingSettings ? "Loading settings" : "Settings unavailable" : settingsEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-3 rounded-md border px-3 py-3">
            <Checkbox
              id="game-server-enabled"
              checked={settingsEnabled}
              onCheckedChange={(checked) => setSettingsEnabled(checked === true)}
              disabled={loadingSettings || busy || !settings}
            />
            <Label htmlFor="game-server-enabled">{gameName} enabled</Label>
          </div>
          <Input
            aria-label={`${gameName} disabled message`}
            value={disabledMessage}
            onChange={(event) => setDisabledMessage(event.target.value)}
            placeholder="Optional message shown while disabled"
            disabled={loadingSettings || busy || !settings}
            maxLength={240}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void saveSettings()}
              disabled={loadingSettings || busy || !settings}
            >
              <Save className="h-4 w-4" />
              {savingSettings ? "Saving" : `Save ${gameName} settings`}
            </Button>
            <Button variant="outline" size="icon" onClick={() => void loadSettings()} disabled={loadingSettings || busy} aria-label={`Refresh ${gameName} settings`}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Updated {formatTimestamp(settings?.updatedAt ?? null)}
            </span>
          </div>
        </section>

        <section className="grid gap-3 border-t pt-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="game-server-discord-id">Discord User ID</Label>
            <Input
              id="game-server-discord-id"
              value={newDiscordUserId}
              onChange={(event) => setNewDiscordUserId(event.target.value)}
              placeholder="123456789012345678"
              inputMode="numeric"
              maxLength={24}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-server-display-name">Display Name</Label>
            <Input
              id="game-server-display-name"
              value={newDisplayName}
              onChange={(event) => setNewDisplayName(event.target.value)}
              placeholder="Friend name"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-server-expiry">Expiry (optional)</Label>
            <Input
              id="game-server-expiry"
              type="date"
              value={newExpiresAt}
              onChange={(event) => setNewExpiresAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="game-server-notes">Note (optional)</Label>
            <Input
              id="game-server-notes"
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
                busy || loadingAccess
              }
            >
              <UserPlus className="h-4 w-4" />
              Grant {gameName} Access
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
              disabled={loadingAccess || busy}
              aria-label={`Refresh ${gameName} access`}
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
                        disabled={busy}
                        onClick={() => void toggleEnabled(entry)}
                        aria-label={`${entry.enabled ? "Disable" : "Enable"} ${gameName} access for ${entry.displayName}`}
                      >
                        {entry.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setDeleteEntry(entry)}
                        aria-label={`Remove ${entry.displayName} from ${gameName}`}
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
      <Dialog open={Boolean(deleteEntry)} onOpenChange={(open) => { if (!open && !busy) setDeleteEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove {gameName} access?</DialogTitle>
            <DialogDescription>Remove {deleteEntry?.displayName} from {gameName}? Their other game access stays unchanged.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setDeleteEntry(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={() => { if (deleteEntry) { const entry = deleteEntry; setDeleteEntry(null); void removeEntry(entry); } }}>Remove {gameName} access</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function GameServerAccessSelection({ adminSessionToken, discordUserId }: { adminSessionToken: string; discordUserId: string }) {
  const [serverId, setServerId] = useState<GameServerId>("palworld");
  const [busy, setBusy] = useState(false);
  return <div className="space-y-3">
    <div className="max-w-sm space-y-2">
      <Label htmlFor="managed-game">Game</Label>
      <Select value={serverId} onValueChange={(value) => setServerId(value as GameServerId)} disabled={busy}>
        <SelectTrigger id="managed-game"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="palworld">Palworld</SelectItem><SelectItem value="dragonwilds">Dragonwilds</SelectItem></SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Switching games clears unsaved fields. Disabling a game blocks controls; it does not stop its host or remove grants.</p>
    </div>
    <GameServerAccessForm key={serverId} serverId={serverId} adminSessionToken={adminSessionToken} discordUserId={discordUserId} busy={busy} onBusy={setBusy} />
  </div>;
}

export function GameServerAccessManager({ adminSessionToken }: GameServerAccessManagerProps) {
  const auth = useAdminAuth();
  if (!adminSessionToken || !auth.authed || auth.checking || !auth.session?.isAdmin || auth.sessionToken !== adminSessionToken) return null;
  const identity = JSON.stringify([adminSessionToken, auth.session.discordUserId, auth.session.isAdmin]);
  return <GameServerAccessSelection key={identity} adminSessionToken={adminSessionToken} discordUserId={auth.session.discordUserId} />;
}
