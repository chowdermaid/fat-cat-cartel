import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/features/home";
import { Easter2026Page } from "@/features/easter2026";
import { PastEventsPage } from "@/features/pastevents";
import { FCCollectionPage } from "@/features/fc-collection";
import { CollectiblePage } from "@/features/fc-collection/pages/CollectiblePage";
import { LeaderboardPage } from "@/features/fc-collection/pages/LeaderboardPage";
import { RecruitmentPage } from "@/features/recruitment";
import { AdminPage } from "@/features/admin";

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

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  pastEventsRoute,
  easter2026Route,
  recruitmentRoute,
  fcCollectionRoute,
  fcTypeRoute,
  fcLeaderboardRoute,
  adminRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
