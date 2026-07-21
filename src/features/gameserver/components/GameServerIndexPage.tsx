import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Server, ShieldCheck } from "lucide-react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getGameServers } from "../api/gameServerFunctions";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import type { GameServerDefinition, GameServerStatus } from "../types";

type GameServerCard = GameServerDefinition & {
  status?: GameServerStatus;
  host?: string | null;
  controlsAvailable?: boolean;
};

function sessionDisplayName(auth: ReturnType<typeof useGameServerAuth>): string {
  return (
    auth.session?.characterName ||
    "Linked member"
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
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
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
          "Login with your linked member account to view game server access."
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
          <Card key={server.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                    {server.name}
                  </CardTitle>
                  <CardDescription>{server.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">Region</span>
                  <span className="font-medium">{server.region}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">Access</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Whitelist
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-muted-foreground">State</span>
                  <span className="font-medium capitalize">
                    {server.status ?? "unknown"}
                  </span>
                </div>
              </div>
              <Button asChild className="w-full">
                <Link to={server.route}>Open Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
