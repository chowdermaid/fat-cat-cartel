import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getGameServers } from "../api/gameServerFunctions";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import type { GameServersResponse } from "../types";
import { PalworldServerIndexCard } from "./palworld/PalworldServerIndexCard";

type GameServerCard = GameServersResponse["servers"][number];

function sessionDisplayName(auth: ReturnType<typeof useGameServerAuth>): string {
  return (
    auth.session?.characterName ||
    auth.session?.discordDisplayName ||
    auth.session?.discordUsername ||
    "Discord user"
  );
}

function GameServerIndexLoading() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-40" />
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function GameServerIndexPage() {
  const auth = useGameServerAuth();
  const [servers, setServers] =
    useState<GameServerCard[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!auth.sessionToken || !auth.canUseGameServers) return;
    let cancelled = false;
    getGameServers(auth.sessionToken)
      .then((result) => {
        if (cancelled) return;
        setServers(result.servers);
        setServerError(null);
        setAccessDenied(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load game servers.";
        if (message.toLowerCase().includes("whitelist")) {
          setAccessDenied(true);
          setServerError(null);
          return;
        }
        setServerError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.canUseGameServers, auth.sessionToken]);

  if (auth.checking) {
    return null;
  }

  if (!auth.authed) {
    return (
      <AuthAccessState
        title="Game Servers"
        description={
          "Login with Discord to view game server access."
        }
        error={auth.error}
        checking={auth.checking}
        onLogin={auth.login}
      />
    );
  }

  if (accessDenied) {
    return null;
  }

  if (!auth.canUseGameServers) {
    return null;
  }

  if (!servers.length && !serverError) {
    return <GameServerIndexLoading />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <Server className="h-7 w-7 text-muted-foreground" />
            Game Servers
          </h1>
          <p className="text-xs text-muted-foreground">
            Signed in as {sessionDisplayName(auth)}.
          </p>
        </div>
      </section>

      {serverError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {serverError}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {servers.map((server) => (
          <PalworldServerIndexCard key={server.id} server={server} />
        ))}
      </div>

    </div>
  );
}
