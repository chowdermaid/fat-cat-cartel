import { useState } from "react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useLocalEvent } from "../hooks/useLocalEvent";
import { useEventViewAnimation } from "../hooks/useEventViewAnimation";
import type { EventView } from "../types";
import { EventHostPanel } from "./EventHostPanel";
import { RulebookView } from "./rulebook/RulebookView";

function EventWorkspace() {
  const event = useLocalEvent();
  const [view, setView] = useState<EventView>("game");
  const pageRef = useEventViewAnimation(view);

  return (
    <article ref={pageRef} className="@container w-full min-w-0">
      <Tabs value={view} onValueChange={(value) => setView(value as EventView)}>
        <EventHostPanel event={event} view={view} onViewChange={setView} />
        <TabsContent value="rulebook" forceMount data-event-view="rulebook" className="pt-6"><RulebookView /></TabsContent>
      </Tabs>
    </article>
  );
}

export function LaddersAndBackstabbersPage() {
  const { authed, checking, error, login, session } = useAdminAuth();

  if (!authed || checking || session?.isAdmin !== true) {
    return <AuthAccessState title="Ladders & Backstabbers" description="This event preview requires a linked character and a Boss or Underpaw Discord role." error={error} checking={checking} showLogin={!authed} onLogin={login} />;
  }

  return <EventWorkspace />;
}
