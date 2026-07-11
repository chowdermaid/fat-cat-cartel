import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import type { GameServerAccessState } from "../types";

function displayName(auth: ReturnType<typeof useAdminAuth>): string | null {
  return auth.session?.characterName ?? null;
}

export function useGameServerAuth(): GameServerAccessState {
  const auth = useAdminAuth();
  const name = displayName(auth);

  return {
    authed: auth.authed,
    checking: auth.checking,
    canUseGameServers: auth.authed && auth.session?.isAdmin === true,
    sessionToken: auth.sessionToken,
    session: auth.session,
    login: auth.login,
    logout: auth.logout,
    error: auth.error ?? (name ? `Signed in as ${name}.` : null),
  };
}
