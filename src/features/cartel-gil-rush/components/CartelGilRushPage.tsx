import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useSharedEvent } from "../hooks/useSharedEvent";
import { useEventViewAnimation } from "../hooks/useEventViewAnimation";
import { useBingoCard } from "../hooks/useBingoCard";
import type { BingoController, EventView } from "../types";
import { EventHostPanel } from "./EventHostPanel";
import { RulebookView } from "./rulebook/RulebookView";

function EventWorkspace({ token, canEdit, bingo }: { token: string | null; canEdit: boolean; bingo: BingoController }) {
  const event = useSharedEvent(token);
  const [view, setView] = useState<EventView>("game");
  const pageRef = useEventViewAnimation(view);

  return (
    <article ref={pageRef} className={`@container -mx-6 -my-8 flex w-[calc(100%+3rem)] min-w-0 flex-col ${view === "rulebook" ? "h-[calc(100dvh-3rem)] min-h-0 overflow-hidden" : "min-h-[calc(100dvh-3rem)]"}`}>
      <Tabs value={view} onValueChange={(value) => setView(value as EventView)} className="flex min-h-0 flex-1 flex-col">
        <EventHostPanel event={event} view={view} onViewChange={setView} canEdit={canEdit} bingo={bingo} />
        <TabsContent value="rulebook" forceMount data-event-view="rulebook" className="flex min-h-0 flex-1 pr-2 @[640px]:pr-5"><RulebookView active={view === "rulebook"} /></TabsContent>
      </Tabs>
    </article>
  );
}

export function CartelGilRushPage() {
  const bingo = useBingoCard();
  const { authed, checking, session, sessionToken } = useAdminAuth();
  const canEdit = authed && !checking && session?.isAdmin === true;
  return <EventWorkspace key={canEdit ? sessionToken : "viewer"} token={canEdit ? sessionToken : null} canEdit={canEdit} bingo={bingo} />;
}
