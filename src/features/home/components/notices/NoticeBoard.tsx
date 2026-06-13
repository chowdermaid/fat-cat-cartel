import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeNoticeItem } from "../../types";
import { ClippingCard } from "../newspaper/ClippingCard";
import { NewspaperSectionLabel } from "../newspaper/NewspaperSectionLabel";

const NOTICES_PER_PAGE = 5;

function NoticeContent({
  body,
  dateLabel,
  location,
  timeLabel,
  title,
}: HomeNoticeItem) {
  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <Megaphone className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {(dateLabel || timeLabel || location) && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            {dateLabel && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {dateLabel}
              </span>
            )}
            {timeLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeLabel}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </>
  );
}

export function NoticeBoard({
  notices,
}: {
  failed: boolean;
  loading: boolean;
  notices: HomeNoticeItem[];
}) {
  const [activePage, setActivePage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(notices.length / NOTICES_PER_PAGE));
  const displayPage = Math.min(activePage, pageCount - 1);
  const pageStart = displayPage * NOTICES_PER_PAGE;
  const visibleNotices = notices.slice(pageStart, pageStart + NOTICES_PER_PAGE);
  const hasNotices = notices.length > 0;
  const hasMultiplePages = pageCount > 1;

  function noticeCardClassName(index: number): string {
    const offsetClasses = [
      "",
      "sm:ml-2 sm:-rotate-[0.25deg]",
      "sm:mr-2 sm:rotate-[0.25deg]",
      "sm:ml-3 sm:-rotate-[0.2deg]",
      "sm:mr-3 sm:rotate-[0.2deg]",
      "sm:ml-1 sm:-rotate-[0.15deg]",
      "sm:mr-1 sm:rotate-[0.15deg]",
      "sm:ml-2 sm:-rotate-[0.25deg]",
      "",
    ];

    return offsetClasses[index % offsetClasses.length];
  }

  function showPreviousPage() {
    setActivePage((current) => (current === 0 ? pageCount - 1 : current - 1));
  }

  function showNextPage() {
    setActivePage((current) => (current >= pageCount - 1 ? 0 : current + 1));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <NewspaperSectionLabel kicker="Notice board">
          Front Page Notices
        </NewspaperSectionLabel>
      </div>
      <div className="flex flex-col gap-4 overflow-hidden px-1 py-1">
        {hasNotices ? (
          visibleNotices.map((notice, index) => (
            <ClippingCard
              key={`${notice.title}-${notice.tag}-${pageStart + index}`}
              className={`gazette-reveal ${noticeCardClassName(index)}`}
            >
              {notice.to ? (
                <Link
                  to={notice.to}
                  className="block transition-colors hover:text-primary"
                >
                  <NoticeContent {...notice} />
                </Link>
              ) : (
                <NoticeContent {...notice} />
              )}
            </ClippingCard>
          ))
        ) : (
          <ClippingCard className="gazette-reveal">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Megaphone className="h-4 w-4 text-primary" />
                No calendar events posted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Calendar notices will appear here once events are available.
              </p>
            </CardContent>
          </ClippingCard>
        )}
      </div>
      {hasMultiplePages && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-card/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Page {displayPage + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              aria-label="Previous notice page"
              onClick={showPreviousPage}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Next notice page"
              onClick={showNextPage}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
