import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DEV_AUTH_LAYER_ENABLED, getSelectedDevPersona } from "@/lib/dev/personas";
import type { GameServerAccessEntry, GameServerId, GameServerSettings } from "@/features/gameserver/types";
import { deleteGameServerAccess, getGameServerSettings, listGameServerAccess, updateGameServerSettings, upsertGameServerAccess } from "../api/gameServerAccess";

export function useGameServerAccessManager(serverId: GameServerId, adminSessionToken: string, discordUserId: string, onBusy: (busy: boolean) => void) {
  const gameName = serverId === "palworld" ? "Palworld" : "Dragonwilds";
  const active = useRef(false);
  const epoch = useRef(0);
  const mutation = useRef(false);
  const accessRead = useRef(0);
  const settingsRead = useRef(0);
  const current = () => active.current && (!DEV_AUTH_LAYER_ENABLED ||
    (getSelectedDevPersona().discordUserId === discordUserId && getSelectedDevPersona().isAdmin));
  useLayoutEffect(() => { active.current = true; return () => { active.current = false; epoch.current += 1; accessRead.current += 1; settingsRead.current += 1; }; }, []);
  const [entries, setEntries] = useState<GameServerAccessEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [settings, setSettings] = useState<GameServerSettings | null>(null);
  const [settingsEnabled, setSettingsEnabled] = useState(serverId === "palworld");
  const [disabledMessage, setDisabledMessage] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const renderedAt = Date.now();
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

  async function loadAccess(afterMutation = false) {
    if (!current() || (mutation.current && !afterMutation)) return;
    const request = ++accessRead.current;
    const valid = () => current() && request === accessRead.current;
    setLoadingAccess(true);
    try {
      const result = await listGameServerAccess(adminSessionToken, serverId);
      if (!valid()) return;
      setEntries(result.entries);
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to load ${gameName} access.`,
      );
    } finally {
      if (valid()) setLoadingAccess(false);
    }
  }

  async function loadSettings() {
    if (!current() || mutation.current) return;
    const request = ++settingsRead.current;
    const valid = () => current() && request === settingsRead.current;
    setLoadingSettings(true);
    try {
      const result = await getGameServerSettings(adminSessionToken, serverId);
      if (!valid()) return;
      setSettings(result.settings);
      setSettingsEnabled(result.settings.enabled);
      setDisabledMessage(result.settings.disabledMessage ?? "");
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to load ${gameName} settings.`,
      );
    } finally {
      if (valid()) setLoadingSettings(false);
    }
  }

  useEffect(() => {
    void loadAccess();
    void loadSettings();
    // Form is keyed by game and session identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grantDiscordUser() {
    if (!current() || mutation.current) return;
    const version = epoch.current;
    const valid = () => current() && version === epoch.current;
    mutation.current = true;
    onBusy(true);
    accessRead.current += 1;
    setLoadingAccess(false);
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
      }, serverId);
      if (!valid()) return;
      toast.success(`${displayName} can access ${gameName}.`);
      setNewDiscordUserId("");
      setNewDisplayName("");
      setNewNotes("");
      setNewExpiresAt("");
      await loadAccess(true);
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to grant ${gameName} access.`,
      );
    } finally {
      if (valid()) {
        mutation.current = false;
        onBusy(false);
        setSavingId(null);
      }
    }
  }

  async function toggleEnabled(entry: GameServerAccessEntry) {
    if (!current() || mutation.current) return;
    const version = epoch.current;
    const valid = () => current() && version === epoch.current;
    mutation.current = true;
    onBusy(true);
    accessRead.current += 1;
    setLoadingAccess(false);
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
      }, serverId);
      if (!valid()) return;
      toast.success(
        `${result.entry.displayName} ${result.entry.enabled ? "enabled" : "disabled"} for ${gameName}.`,
      );
      await loadAccess(true);
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to update ${gameName} access.`,
      );
    } finally {
      if (valid()) {
        mutation.current = false;
        onBusy(false);
        setSavingId(null);
      }
    }
  }

  async function removeEntry(entry: GameServerAccessEntry) {
    if (!current() || mutation.current) return;
    const version = epoch.current;
    const valid = () => current() && version === epoch.current;
    mutation.current = true;
    onBusy(true);
    accessRead.current += 1;
    setLoadingAccess(false);
    setDeletingId(entry.discordUserId);
    try {
      await deleteGameServerAccess(adminSessionToken, entry.discordUserId, serverId);
      if (!valid()) return;
      toast.success(`${entry.displayName} removed from ${gameName}.`);
      await loadAccess(true);
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to remove ${gameName} access.`,
      );
    } finally {
      if (valid()) {
        mutation.current = false;
        onBusy(false);
        setDeletingId(null);
      }
    }
  }

  async function saveSettings() {
    if (!current() || mutation.current || !settings || loadingSettings) return;
    const version = epoch.current;
    const valid = () => current() && version === epoch.current;
    mutation.current = true;
    onBusy(true);
    settingsRead.current += 1;
    setLoadingSettings(false);
    setSavingSettings(true);
    try {
      const result = await updateGameServerSettings(adminSessionToken, {
        serverId,
        enabled: settingsEnabled,
        disabledMessage: disabledMessage.trim() || null,
      });
      if (!valid()) return;
      setSettings(result.settings);
      setSettingsEnabled(result.settings.enabled);
      setDisabledMessage(result.settings.disabledMessage ?? "");
      toast.success(
        result.settings.enabled ? `${gameName} enabled.` : `${gameName} disabled.`,
      );
    } catch (err) {
      if (!valid()) return;
      toast.error(
        err instanceof Error ? `${gameName}: ${err.message}` : `Failed to save ${gameName} settings.`,
      );
    } finally {
      if (valid()) {
        mutation.current = false;
        onBusy(false);
        setSavingSettings(false);
      }
    }
  }

  return { gameName, filteredEntries, search, setSearch, loadingAccess, settings, settingsEnabled, setSettingsEnabled,
    disabledMessage, setDisabledMessage, loadingSettings, savingSettings, savingId, deletingId, renderedAt,
    newDiscordUserId, setNewDiscordUserId, newDisplayName, setNewDisplayName, newNotes, setNewNotes,
    newExpiresAt, setNewExpiresAt, loadAccess, loadSettings, grantDiscordUser, toggleEnabled, removeEntry, saveSettings };
}
