import { FcHangoutCard } from "./FcHangoutCard";
import { MemberSpotlightCard } from "./MemberSpotlightCard";
import { StatusBoardCard } from "./StatusBoardCard";
import type { HomeCraftingStatus, HomeWeeklyData } from "../../types";

export function HomeWidgets({
  craftingStatus,
  nextBirthdayText,
  nextEventText,
  nextEventWhen,
  profiles,
}: {
  craftingStatus: HomeCraftingStatus;
  nextBirthdayText: string;
  nextEventText: string;
  nextEventWhen: string;
  profiles: HomeWeeklyData["profiles"];
}) {
  return (
    <aside className="space-y-4">
      <MemberSpotlightCard profiles={profiles} />
      <FcHangoutCard />
      <StatusBoardCard
        craftingStatus={craftingStatus}
        nextBirthdayText={nextBirthdayText}
        nextEventText={nextEventText}
        nextEventWhen={nextEventWhen}
      />
    </aside>
  );
}
