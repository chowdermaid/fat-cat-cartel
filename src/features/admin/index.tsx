import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { AdminLogin } from "./components/AdminLogin";
import { ParticipantManager } from "./components/ParticipantManager";

export function AdminPage() {
  const { authed, error, login, logout } = useAdminAuth();

  if (!authed) {
    return <AdminLogin error={error} onLogin={login} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">
            Manage participants and scores for Easter 2026.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <ParticipantManager />
    </div>
  );
}
