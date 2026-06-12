import { useRef } from "react";
import { useHomeDashboardData } from "../hooks/useThisWeekStrip";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { HomeHero } from "./hero/HomeHero";
import { NoticeBoard } from "./notices/NoticeBoard";
import { ScrapbookPreview } from "./scrapbook/ScrapbookPreview";
import { ThisWeekStrip } from "./weekly/ThisWeekStrip";
import { HomeWidgets } from "./widgets/HomeWidgets";

export function HomePage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const dashboardData = useHomeDashboardData();

  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="w-full space-y-8">
      <HomeHero />
      <ThisWeekStrip
        birthdayPeople={dashboardData.birthdayPeople}
        birthdayText={dashboardData.birthdayText}
        failed={dashboardData.failed}
        loading={dashboardData.loading}
        nextEventText={dashboardData.nextEventText}
        nextEventWhen={dashboardData.nextEventWhen}
        openErrand={dashboardData.openErrand}
      />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <NoticeBoard
          failed={dashboardData.failed}
          loading={dashboardData.loading}
          notices={dashboardData.notices}
        />
        <HomeWidgets />
      </section>
      <ScrapbookPreview />
    </div>
  );
}
