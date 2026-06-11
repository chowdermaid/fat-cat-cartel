import { useState } from "react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { CalendarSyncStatus } from "./calendar/CalendarSyncStatus";
import { ParticipantManager } from "./easter/ParticipantManager";
import { FCMembersManager } from "./members/FCMembersManager";
import { AdminHeader } from "./layout/AdminHeader";
import { EasterEventCard } from "./layout/EasterEventCard";
import { useAdminAuth } from "../hooks/useAdminAuth";
import type { SelectedAdminView } from "../types";

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
  const [selectedView, setSelectedView] = useState<SelectedAdminView>("fc-members");

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
        <AdminHeader
          title="Easter Social 2026"
          description={`Welcome, ${session?.characterName ?? "admin"}. Manage participants and scores.`}
          onBack={() => setSelectedView("fc-members")}
          onLogout={logout}
        />
        <ParticipantManager adminSessionToken={sessionToken} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Admin Panel"
        description={`Welcome, ${session?.characterName ?? "admin"}. User management console.`}
        onLogout={logout}
      />

      <FCMembersManager adminSessionToken={sessionToken} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <CalendarSyncStatus adminSessionToken={sessionToken} />
        <EasterEventCard onManage={() => setSelectedView("easter2026")} />
      </div>
    </div>
  );
}
