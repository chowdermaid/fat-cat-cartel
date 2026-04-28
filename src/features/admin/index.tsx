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
import {
  LogOut,
  CalendarDays,
  ArrowLeft,
  Settings,
  Users,
} from "lucide-react";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { AdminLogin } from "./components/AdminLogin";
import { ParticipantManager } from "./components/ParticipantManager";
import { FCMembersManager } from "./components/FCMembersManager";

type SelectedView = "easter2026" | "fc-members" | null;

const adminCards = [
  {
    id: "easter2026" as const,
    emoji: "🐣",
    title: "Easter Social 2026",
    date: "26 April 2026",
    description: "Manage participants and scores for the Easter 2026 event.",
    badge: "Archived",
    icon: CalendarDays,
  },
  {
    id: "fc-members" as const,
    emoji: "👥",
    title: "FC Members",
    date: null,
    description: "Manage the FC member list used by the collection tracker.",
    badge: null,
    icon: Users,
  },
];

export function AdminPage() {
  const { authed, error, login, logout } = useAdminAuth();
  const [selectedView, setSelectedView] = useState<SelectedView>(null);

  if (!authed) {
    return <AdminLogin error={error} onLogin={login} />;
  }

  if (selectedView === "easter2026") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedView(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Easter Social 2026</h1>
              <p className="mt-1 text-muted-foreground">
                Manage participants and scores.
              </p>
            </div>
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

  if (selectedView === "fc-members") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedView(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">FC Members</h1>
              <p className="mt-1 text-muted-foreground">
                Manage the collection tracker member list.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
        <FCMembersManager />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">Select a section to manage.</p>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((card) => (
          <Card key={card.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{card.emoji}</span>
                  <div>
                    <CardTitle className="text-lg font-serif leading-tight">
                      {card.title}
                    </CardTitle>
                    {card.date && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <CalendarDays className="h-3 w-3" />
                        {card.date}
                      </p>
                    )}
                  </div>
                </div>
                {card.badge && (
                  <Badge variant="secondary" className="shrink-0">
                    {card.badge}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedView(card.id)}
              >
                <Settings className="h-3.5 w-3.5" />
                Manage
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
