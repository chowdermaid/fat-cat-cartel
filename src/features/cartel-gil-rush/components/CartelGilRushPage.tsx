import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { AuthAccessState } from "@/components/auth/AuthAccessState";
import { canAccessGilRush } from "../utils/access";
import { useSharedEvent } from "../hooks/useSharedEvent";
import { useEventViewAnimation } from "../hooks/useEventViewAnimation";
import { useBingoCard } from "../hooks/useBingoCard";
import type { BingoController, EventView } from "../types";
import { EventHostPanel } from "./EventHostPanel";
import { RulebookView } from "./rulebook/RulebookView";

function EventWorkspace({ token, canEdit, bingo, view, onViewChange }: { token: string | null; canEdit: boolean; bingo: BingoController; view: EventView; onViewChange: (view: EventView) => void }) {
  const event = useSharedEvent(token, canEdit);
  const pageRef = useEventViewAnimation(view, !event.loading && !event.readError);
  if (event.loading || event.readError) return <AuthAccessState title="Cartel Gil Rush" description={event.loading ? "Checking internal event access..." : "Unable to open this internal event. Refresh or sign in again to retry."} error={event.readError} showLogin={false} />;

  return (
    <article ref={pageRef} className={`@container -mx-6 -my-8 flex w-[calc(100%+3rem)] min-w-0 flex-col ${view === "rulebook" ? "h-[calc(100dvh-3rem)] min-h-0 overflow-hidden" : "min-h-[calc(100dvh-3rem)]"}`}>
      <Tabs value={view} onValueChange={(value) => onViewChange(value as EventView)} className="flex min-h-0 flex-1 flex-col">
        <EventHostPanel event={event} view={view} onViewChange={onViewChange} canEdit={canEdit} bingo={bingo} />
        <TabsContent value="rulebook" forceMount data-event-view="rulebook" className="flex min-h-0 flex-1 pr-2 @[640px]:pr-5"><RulebookView active={view === "rulebook"} /></TabsContent>
      </Tabs>
    </article>
  );
}

function AllowedGilRushPage({ token, canEdit }: { token: string; canEdit: boolean }) {
  const view: EventView = useRouterState({ select: state => state.location.pathname.replace(/\/$/, "").endsWith("/rulebook") ? "rulebook" : "game" });
  const navigate = useNavigate();
  const onViewChange = (nextView: EventView) => {
    if (nextView !== view) void navigate({ to: `/cartel-gil-rush/${nextView}`, resetScroll: false });
  };
  const bingo = useBingoCard();
  return <EventWorkspace token={token} canEdit={canEdit} bingo={bingo} view={view} onViewChange={onViewChange} />;
}

export function CartelGilRushPage() {
  const auth = useAdminAuth();
  if (!canAccessGilRush(auth) || !auth.sessionToken) return <AuthAccessState title="Cartel Gil Rush" description={auth.checking ? "Checking access..." : "This event is internal to Boss, Underpaw and the invited preview player."} error={auth.error} checking={auth.checking} showLogin={!auth.authed && !auth.checking} onLogin={auth.login} />;
  return <AllowedGilRushPage key={`${auth.sessionToken}:${auth.session?.isAdmin}`} token={auth.sessionToken} canEdit={auth.session?.isAdmin === true} />;
}
