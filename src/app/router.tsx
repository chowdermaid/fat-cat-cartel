import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/features/home";
import { Easter2026Page } from "@/features/easter2026";
import { CartelGilRushPage } from "@/features/cartel-gil-rush";
import { PastEventsPage } from "@/features/pastevents";
import {
  FCCollectionPage,
  FCCollectionLayout,
  CollectiblePage,
  LeaderboardPage,
} from "@/features/fc-collection";
import { RecruitmentPage } from "@/features/recruitment";
import { AdminPage } from "@/features/admin";
import { RaidStatsPage } from "@/features/raid-stats";
import { UcobProgPage } from "@/features/ucob-prog";
import { KeyboundBrawlerPage } from "@/features/keybound-brawler";
import { MountRoulettePage } from "@/features/mount-roulette";
import { MembersPage } from "@/features/members";
import { MemberProfilePage } from "@/features/member-profile";
import { CalendarPage } from "@/features/calendar";
import { CraftingBoardPage } from "@/features/craftingboard";
import { MeowketBoardPage } from "@/features/meowket-board";
import { SpudJarPage } from "@/features/spud-jar";
import {
  GameServerIndexPage,
  PalworldServerPage,
  DragonwildsServerPage,
} from "@/features/gameserver";

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

const cartelGilRushRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cartel-gil-rush",
  component: CartelGilRushPage,
});

const laddersAndBackstabbersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ladders-and-backstabbers",
  beforeLoad: () => { throw redirect({ to: "/cartel-gil-rush" }); },
});

const fcCollectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fc-collection",
  component: FCCollectionLayout,
});

const fcCollectionIndexRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "/",
  beforeLoad: () => { throw redirect({ to: "/fc-collection/overview", replace: true }); },
});

const fcOverviewRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "overview",
  component: FCCollectionPage,
});

const fcCollectionsRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "collections",
  component: CollectiblePage,
});

const fcTypeRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "collections/$type",
  component: CollectiblePage,
});

const fcLeaderboardRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "rankings",
  component: LeaderboardPage,
});

const fcLegacyLeaderboardRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "leaderboard",
  beforeLoad: () => { throw redirect({ to: "/fc-collection/rankings", replace: true }); },
});

const fcLegacyTypeRoute = createRoute({
  getParentRoute: () => fcCollectionRoute,
  path: "$type",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/fc-collection/collections/$type", params: { type: params.type }, replace: true });
  },
});

const raidStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid-stats",
  component: RaidStatsPage,
});

const ucobProgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ucob-prog",
  component: UcobProgPage,
});

const mountRouletteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mount-roulette",
  component: MountRoulettePage,
});

const keyboundBrawlerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/keybound-brawler",
  component: KeyboundBrawlerPage,
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

const spudJarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/spud-jar",
  component: SpudJarPage,
});

const gameServerIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gameserver",
  component: GameServerIndexPage,
});

const palworldServerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gameserver/palworld",
  component: PalworldServerPage,
});

const dragonwildsServerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gameserver/dragonwilds",
  component: DragonwildsServerPage,
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
  laddersAndBackstabbersRoute,
  cartelGilRushRoute,
  recruitmentRoute,
  fcCollectionRoute.addChildren([
    fcCollectionIndexRoute,
    fcOverviewRoute,
    fcCollectionsRoute,
    fcTypeRoute,
    fcLeaderboardRoute,
    fcLegacyLeaderboardRoute,
    fcLegacyTypeRoute,
  ]),
  raidStatsRoute,
  ucobProgRoute,
  keyboundBrawlerRoute,
  mountRouletteRoute,
  craftingBoardRoute,
  meowketBoardRoute,
  spudJarRoute,
  gameServerIndexRoute,
  palworldServerRoute,
  dragonwildsServerRoute,
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
