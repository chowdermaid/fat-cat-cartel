import { useEffect } from "react";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import type { GameServerAccessState } from "../types";

const GAME_SERVER_ACCESS_KEY = "game_server_session_has_access";

function displayName(auth: ReturnType<typeof useAdminAuth>): string | null {
  return (
    auth.session?.characterName ??
    auth.session?.discordDisplayName ??
    auth.session?.discordUsername ??
    null
  );
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
  const canUseGameServers =
    auth.session?.canUseGameServers === true || auth.session?.isAdmin === true;

  useEffect(() => {
    if (!auth.checking) {
      storeSessionCanUseGameServers(auth.authed && canUseGameServers);
    }
  }, [auth.authed, auth.checking, canUseGameServers]);

  const sessionWasAllowedGameServers =
    canUseGameServers || (auth.checking && storedSessionCanUseGameServers());

  return {
    authed: auth.authed,
    checking: auth.checking,
    canUseGameServers: auth.authed && canUseGameServers,
    sessionWasAllowedGameServers,
    sessionToken: auth.sessionToken,
    session: auth.session,
    login: auth.login,
    logout: auth.logout,
    error: auth.error ?? (name ? `Signed in as ${name}.` : null),
  };
}
