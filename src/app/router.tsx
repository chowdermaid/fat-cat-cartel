import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/features/home";
import { Easter2026Page } from "@/features/easter2026";
import { PastEventsPage } from "@/features/pastevents";
import {
  FCCollectionPage,
  CollectiblePage,
  LeaderboardPage,
} from "@/features/fc-collection";
import { RecruitmentPage } from "@/features/recruitment";
import { AdminPage } from "@/features/admin";
import { RaidStatsPage } from "@/features/raid-stats";
import { MountRoulettePage } from "@/features/mount-roulette";
import { MembersPage } from "@/features/members";
import { MemberProfilePage } from "@/features/member-profile";
import { CalendarPage } from "@/features/calendar";
import { CraftingBoardPage } from "@/features/craftingboard";
import { MeowketBoardPage } from "@/features/meowket-board";
import { DmuProgPage } from "@/features/dmu-prog";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const pastEventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pastevents",
  component: PastEventsPage,
});

const easter2026Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pastevents/easter2026",
  component: Easter2026Page,
});

const recruitmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jointhemeowfia",
  component: RecruitmentPage,
});

const fcCollectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fc-collection",
  component: FCCollectionPage,
});

const fcTypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fc-collection/$type",
  component: CollectiblePage,
});

const fcLeaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fc-collection/leaderboard",
  component: LeaderboardPage,
});

const raidStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid-stats",
  component: RaidStatsPage,
});

const dmuProgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dmu-prog",
  component: DmuProgPage,
});

const mountRouletteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mount-roulette",
  component: MountRoulettePage,
});

const craftingBoardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/craftingboard",
  component: CraftingBoardPage,
});

const meowketBoardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meowketboard",
  component: MeowketBoardPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const membersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/members",
  component: MembersPage,
});

const memberProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/members/$lodestoneId",
  component: MemberProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  pastEventsRoute,
  easter2026Route,
  recruitmentRoute,
  fcCollectionRoute,
  fcTypeRoute,
  fcLeaderboardRoute,
  raidStatsRoute,
  dmuProgRoute,
  mountRouletteRoute,
  craftingBoardRoute,
  meowketBoardRoute,
  calendarRoute,
  adminRoute,
  membersRoute,
  memberProfileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
