import {
  createRouter,
  createRoute,
  createRootRoute,
} from "@tanstack/react-router";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/features/home";
import { Easter2026Page } from "@/features/easter2026";
import { AdminPage } from "@/features/admin";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const easter2026Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/easter2026",
  component: Easter2026Page,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  easter2026Route,
  adminRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
