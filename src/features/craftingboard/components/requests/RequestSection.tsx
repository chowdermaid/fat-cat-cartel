import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Member } from "@/types";
import { COMPLETED_SECTION_PAGE_SIZE, REQUEST_SECTION_PAGE_SIZE, type RequestSectionConfig } from "../../constants";
import type { CraftingRequestDashboardRecord, CraftingRequestMember } from "../../types";
import { CompletedRequestButton } from "./CompletedRequestButton";
import { LanePagination } from "./LanePagination";
import { RequestCard } from "./RequestCard";

export function RequestSection({
  config,
  requests,
  currentMember,
  members,
  isAdmin,
  actionRequestId,
  onAccept,
  onComplete,
  onClose,
  onReopen,
  compactCards = false,
}: {
  config: RequestSectionConfig;
  requests: CraftingRequestDashboardRecord[];
  currentMember: CraftingRequestMember | null;
  members: Record<string, Member>;
  isAdmin: boolean;
  actionRequestId: string | null;
  onAccept: (requestId: string) => void;
  onComplete: (requestId: string) => void;
  onClose: (requestId: string) => void;
  onReopen: (requestId: string) => void;
  compactCards?: boolean;
}) {
  const Icon = config.icon;
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = compactCards
    ? COMPLETED_SECTION_PAGE_SIZE
    : REQUEST_SECTION_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [currentPage, pageSize, requests]);
  const visibleRequestIds = visibleRequests
    .map((request) => request.id)
    .join("|");

  useEffect(() => {
    if (!pageContainerRef.current || requests.length === 0) return;

    animate(pageContainerRef.current.querySelectorAll("[data-page-card]"), {
      opacity: [0, 1],
      translateX: [12, 0],
      delay: stagger(45),
      duration: 260,
      easing: "easeOutQuad",
    });
  }, [currentPage, requests.length, visibleRequestIds]);

  return (
    <section
      className={cn("crafting-section min-w-0 space-y-3", config.laneClass)}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-serif text-2xl font-semibold">
            <Icon className={cn("h-5 w-5 shrink-0", config.accent)} />
            <span className="min-w-0 truncate">{config.title}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {totalPages > 1 && (
          <LanePagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-36 items-center justify-center p-5 text-center text-sm text-muted-foreground">
            {config.emptyText}
          </CardContent>
        </Card>
      ) : (
        <div
          ref={pageContainerRef}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-1"
        >
          {visibleRequests.map((request) => (
            <div key={request.id} data-page-card>
              {compactCards ? (
                <CompletedRequestButton
                  request={request}
                  currentMember={currentMember}
                  members={members}
                  isAdmin={isAdmin}
                  busy={actionRequestId === request.id}
                  onAccept={onAccept}
                  onComplete={onComplete}
                  onClose={onClose}
                  onReopen={onReopen}
                />
              ) : (
                <RequestCard
                  request={request}
                  currentMember={currentMember}
                  members={members}
                  isAdmin={isAdmin}
                  busy={actionRequestId === request.id}
                  onAccept={onAccept}
                  onComplete={onComplete}
                  onClose={onClose}
                  onReopen={onReopen}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
