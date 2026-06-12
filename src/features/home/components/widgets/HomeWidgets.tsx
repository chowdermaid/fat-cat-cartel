import { FcHangoutCard } from "./FcHangoutCard";
import { FeaturedToolCard } from "./FeaturedToolCard";
import { MemberSpotlightCard } from "./MemberSpotlightCard";

export function HomeWidgets() {
  return (
    <aside className="space-y-4">
      <MemberSpotlightCard />
      <FcHangoutCard />
      <FeaturedToolCard />
    </aside>
  );
}
