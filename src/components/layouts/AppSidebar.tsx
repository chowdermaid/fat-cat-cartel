import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart2,
  CalendarDays,
  Dices,
  Drama,
  Hammer,
  HandCoins,
  Home,
  Library,
  Moon,
  Server,
  ShieldUser,
  Sun,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AuthUserMenu } from "@/components/auth/AuthUserMenu";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import fatcathi from "../../assets/fatcathi.png";

const navItems = [
  { label: "Home", to: "/", icon: Home },
  { label: "Members", to: "/members", icon: Users },
  { label: "Calendar", to: "/calendar", icon: CalendarDays },
] as const;

const progressItems = [
  { label: "FC Collection", to: "/fc-collection", icon: Library },
  { label: "Raid Stats", to: "/raid-stats", icon: BarChart2 },
  { label: "DMU Prog", to: "/dmu-prog", icon: Drama },
] as const;

const toolItems = [
  { label: "Mount Roulette", to: "/mount-roulette", icon: Dices },
  { label: "Crafting Board", to: "/craftingboard", icon: Hammer },
  { label: "Meowket Board", to: "/meowketboard", icon: HandCoins },
  { label: "Game Servers", to: "/gameserver", icon: Server },
] as const;

const bottomItems = [
  { label: "Join the Meowfia", to: "/jointhemeowfia", icon: UserPlus },
  { label: "Past Events", to: "/pastevents", icon: CalendarDays },
] as const;

const adminItem = { label: "Admin", to: "/admin", icon: ShieldUser } as const;

function NavLink({
  to,
  icon: Icon,
  label,
  dim,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  dim?: boolean;
}) {
  const { location } = useRouterState();
  const isActive =
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={
          dim
            ? "text-muted-foreground/50 hover:text-muted-foreground"
            : undefined
        }
      >
        <Link to={to}>
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { isDark, toggle } = useDarkMode();
  const auth = useAdminAuth();
  const visibleToolItems = auth.sessionWasAdmin
    ? toolItems
    : toolItems.filter(
        (item) =>
          (item.to !== "/gameserver" || auth.authed || auth.checking) &&
          (item.to !== "/meowketboard" || auth.authed || auth.checking),
      );

  return (
    <Sidebar>
      <SidebarHeader className="border-b pb-4">
        <Link to="/" className="flex items-center gap-3 px-2 pt-2 group">
          <img
            src={fatcathi}
            className="w-9 h-9 rounded-full ring-2 ring-sidebar-border group-hover:ring-sidebar-accent transition-all"
            alt="Fat Cat Cartel"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base font-serif text-sidebar-foreground">
              Fat Cat Cartel
            </span>
            <span className="text-xs text-muted-foreground">The Meowfia</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Progress
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {progressItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Tools
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleToolItems.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  dim={item.to === "/meowketboard" && auth.checking}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto" />
      </SidebarContent>

      <SidebarFooter className="gap-0 pb-3">
        <Separator className="mb-2" />
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
              {auth.sessionWasAdmin && (
                <NavLink
                  key={adminItem.to}
                  {...adminItem}
                  dim={auth.checking}
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator className="my-2" />
        <AuthUserMenu auth={auth} />
        <Separator className="my-2" />
        <div className="flex items-center justify-between px-2">
          <a
            href="http://discord.gg/TDdhZgQyCR"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Discord
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-7 w-7"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
