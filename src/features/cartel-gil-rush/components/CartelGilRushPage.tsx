import { useState } from "react";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useSharedEvent } from "../hooks/useSharedEvent";
import { useEventViewAnimation } from "../hooks/useEventViewAnimation";
import type { EventView } from "../types";
import { EventHostPanel } from "./EventHostPanel";
import { RulebookView } from "./rulebook/RulebookView";

function EventWorkspace({ token }: { token: string | null }) {
  const event = useSharedEvent(token);
  const [view, setView] = useState<EventView>("game");
  const pageRef = useEventViewAnimation(view);

  return (
    <article ref={pageRef} className={`@container -mx-6 -my-8 flex w-[calc(100%+3rem)] min-w-0 flex-col ${view === "rulebook" ? "h-[calc(100dvh-3rem)] min-h-0 overflow-hidden" : "min-h-[calc(100dvh-3rem)]"}`}>
      <Tabs value={view} onValueChange={(value) => setView(value as EventView)} className="flex min-h-0 flex-1 flex-col">
        <EventHostPanel event={event} view={view} onViewChange={setView} />
        <TabsContent value="rulebook" forceMount data-event-view="rulebook" className="flex min-h-0 flex-1 pr-2 @[640px]:pr-5"><RulebookView active={view === "rulebook"} /></TabsContent>
      </Tabs>
    </article>
  );
}

export function CartelGilRushPage() {
  const { authed, checking, error, login, session, sessionToken } = useAdminAuth();

  if (!authed || checking || session?.isAdmin !== true) {
    return <AuthAccessState title="Cartel Gil Rush" description="This host display requires a linked character and a Boss or Underpaw Discord role." error={error} checking={checking} showLogin={!authed} onLogin={login} />;
  }

  return <EventWorkspace key={sessionToken} token={sessionToken} />;
}
