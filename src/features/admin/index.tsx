import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, CalendarDays, ArrowLeft, Settings } from "lucide-react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { ParticipantManager } from "./components/ParticipantManager";
import { FCMembersManager } from "./components/FCMembersManager";

type SelectedView = "easter2026" | "fc-members";

export function AdminPage() {
  const {
    authed,
    checking,
    error,
    login,
    logout,
    session,
    sessionToken,
    unauthorized,
  } = useAdminAuth();
  const [selectedView, setSelectedView] = useState<SelectedView>("fc-members");

  if (!authed) {
    return (
      <AuthAccessState
        title="Admin Panel"
        description={
          unauthorized
            ? "This page requires a linked character and a Boss or Underpaw Discord role."
            : "Login with Discord to verify your linked character and admin role."
        }
        error={error}
        checking={checking}
        onLogin={login}
      />
    );
  }

  if (session?.isAdmin !== true) {
    return (
      <AuthAccessState
        title="Admin Panel"
        description="This page requires a Boss or Underpaw Discord role."
        error="Boss or Underpaw Discord role required."
        showLogin={false}
      />
    );
  }

  if (selectedView === "easter2026") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedView("fc-members")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Easter Social 2026</h1>
              <p className="mt-1 text-muted-foreground">
                Welcome, {session?.characterName ?? "admin"}. Manage
                participants and scores.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
        <ParticipantManager adminSessionToken={sessionToken} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome, {session?.characterName ?? "admin"}. User management
            console.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <FCMembersManager adminSessionToken={sessionToken} />

      <Card className="w-32">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-serif leading-tight">
                  Easter Social 2026
                </CardTitle>
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  26 April 2026
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Archived
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage participants and scores for the Easter 2026 event.
          </p>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedView("easter2026")}
          >
            <Settings className="h-3.5 w-3.5" />
            Manage Easter Social
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
