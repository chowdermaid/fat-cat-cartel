import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gamepad2, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GAME_SERVERS } from "../constants";
import { getGameServers } from "../api/gameServerFunctions";
import { useGameServerAuth } from "../hooks/useGameServerAuth";
import type { GameServerDefinition, GameServerStatus } from "../types";

type GameServerCard = GameServerDefinition & {
  status?: GameServerStatus;
  host?: string | null;
  controlsAvailable?: boolean;
  phase?: "stub" | "live";
};

function sessionDisplayName(auth: ReturnType<typeof useGameServerAuth>): string {
  return (
    auth.session?.characterName ||
    "Linked member"
  );
}

export function GameServerIndexPage() {
  const auth = useGameServerAuth();
  const [servers, setServers] =
    useState<GameServerCard[]>(GAME_SERVERS);
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
        if (
          message.toLowerCase().includes("boss") ||
          message.toLowerCase().includes("underpaw")
        ) {
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
    return (
      <AuthAccessState
        title="Game Servers"
        description="This page is limited to Boss and Underpaw admins."
        error="Boss or Underpaw Discord role required."
        showLogin={false}
      />
    );
  }

  if (!auth.canUseGameServers) {
    return (
      <AuthAccessState
        title="Game Servers"
        description="This page is limited to Boss and Underpaw admins."
        error="Boss or Underpaw Discord role required."
        showLogin={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold font-serif">
            <Server className="h-7 w-7 text-muted-foreground" />
            Game Servers
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Start with Palworld now, with room for Minecraft, Valheim, and
            Satisfactory later.
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as {sessionDisplayName(auth)}.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          Live EC2
        </Badge>
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                    {server.name}
                  </CardTitle>
                  <CardDescription>{server.description}</CardDescription>
                </div>
                <Badge variant="outline">
                  {server.phase === "live" ? "Live EC2" : "EC2"}
                </Badge>
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

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-2 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <LockKeyhole className="h-4 w-4 shrink-0" />
          <span>
            Status loads on demand through Firebase Functions. AWS credentials
            stay server-side.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
