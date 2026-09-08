import { useRef } from "react";
import { useHomeDashboardData } from "../hooks/useThisWeekStrip";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { HomeHero } from "./hero/HomeHero";
import { NoticeBoard } from "./notices/NoticeBoard";
import { OperationsPanel } from "./operations/OperationsPanel";
import { ScrapbookPreview } from "./scrapbook/ScrapbookPreview";
import { HomeWidgets } from "./widgets/HomeWidgets";

export function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const dashboardData = useHomeDashboardData();

  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="w-full space-y-10">
      <section>
        <div className="flex min-w-0">
          <HomeHero memberCount={dashboardData.memberCount} members={dashboardData.members} profiles={dashboardData.profiles} />
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <NoticeBoard
            failed={dashboardData.failed}
            loading={dashboardData.loading}
            notices={dashboardData.notices}
          />
        </div>
        <div>
          <HomeWidgets
            craftingStatus={dashboardData.craftingStatus}
            nextBirthdayText={dashboardData.nextBirthdayText}
            nextEventText={dashboardData.nextEventText}
            nextEventWhen={dashboardData.nextEventWhen}
            profiles={dashboardData.profiles}
          />
        </div>
      </section>
      <div className="space-y-4">
        <OperationsPanel />
        <ScrapbookPreview />
      </div>
    </div>
  );
}
