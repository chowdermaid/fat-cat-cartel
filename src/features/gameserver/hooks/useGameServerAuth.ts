import { useEffect, useState } from "react";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { getGameServerAccessStatus } from "../api/gameServerFunctions";
import type { GameServerAccessState } from "../types";

const GAME_SERVER_ACCESS_KEY = "game_server_session_has_access";

function displayName(auth: ReturnType<typeof useAdminAuth>): string | null {
  return auth.session?.characterName ?? null;
}

function storedSessionCanUseGameServers(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem(GAME_SERVER_ACCESS_KEY) === "true"
  );
}

function storeSessionCanUseGameServers(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GAME_SERVER_ACCESS_KEY, value ? "true" : "false");
}

export function useGameServerAuth(): GameServerAccessState {
  const auth = useAdminAuth();
  const name = displayName(auth);
  const [canUseGameServers, setCanUseGameServers] = useState<boolean | null>(
    null,
  );
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.checking) return;
    if (!auth.authed || !auth.sessionToken) {
      setCanUseGameServers(false);
      setAccessError(null);
      storeSessionCanUseGameServers(false);
      return;
    }

    let cancelled = false;
    setCanUseGameServers(null);
    setAccessError(null);
    getGameServerAccessStatus(auth.sessionToken)
      .then((result) => {
        if (cancelled) return;
        setCanUseGameServers(result.canUseGameServers);
        storeSessionCanUseGameServers(result.canUseGameServers);
      })
      .catch((err) => {
        if (cancelled) return;
        setCanUseGameServers(false);
        storeSessionCanUseGameServers(false);
        setAccessError(
          err instanceof Error
            ? err.message
            : "Failed to check game server access.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [auth.authed, auth.checking, auth.sessionToken]);

  const checkingGameServerAccess =
    auth.authed && Boolean(auth.sessionToken) && canUseGameServers === null;
  const sessionWasAllowedGameServers =
    canUseGameServers === true ||
    auth.session?.isAdmin === true ||
    ((auth.checking || checkingGameServerAccess) &&
      storedSessionCanUseGameServers());

  return {
    authed: auth.authed,
    checking: auth.checking || checkingGameServerAccess,
    canUseGameServers: canUseGameServers === true,
    sessionWasAllowedGameServers,
    sessionToken: auth.sessionToken,
    session: auth.session,
    login: auth.login,
    logout: auth.logout,
    error: auth.error ?? accessError ?? (name ? `Signed in as ${name}.` : null),
  };
}
