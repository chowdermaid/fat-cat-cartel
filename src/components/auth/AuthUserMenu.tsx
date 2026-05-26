import { useState } from "react";
import { ChevronsUpDown, LogIn, LogOut } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { type AdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { cn } from "@/lib/utils";

interface AuthUserMenuProps {
  auth: AdminAuth;
  className?: string;
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AuthUserMenu({ auth, className }: AuthUserMenuProps) {
  const { authed, checking, error, login, logout, session } = auth;
  const [open, setOpen] = useState(false);
  const name = session?.characterName ?? "Fat Cat";
  const rank = session?.fcRank ?? "No rank";
  const showAuthenticatedMenu = authed || Boolean(session);

  if (!showAuthenticatedMenu) {
    return (
      <SidebarMenu className={className}>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            size="lg"
            onClick={login}
            disabled={checking}
            tooltip="Login with Discord"
            className="h-12"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
              <LogIn className="h-4 w-4" />
            </div>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {checking ? "Checking User..." : "Coming soon"}
              </span>
              <span
                className={cn(
                  "truncate text-xs text-muted-foreground",
                  error && "text-destructive",
                )}
              >
                {error ?? "Login with Discord"}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem className="relative">
        <SidebarMenuButton
          type="button"
          size="lg"
          onClick={() => setOpen((value) => !value)}
          tooltip={name}
          className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          data-state={open ? "open" : "closed"}
        >
          {session?.avatarUrl ? (
            <img
              src={session.avatarUrl}
              alt={name}
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {initials(name)}
            </div>
          )}
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {rank}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4" />
        </SidebarMenuButton>

        {open && (
          <div className="absolute bottom-0 left-full z-50 ml-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
            <div className="flex items-center gap-2 px-2 py-2">
              {session?.avatarUrl ? (
                <img
                  src={session.avatarUrl}
                  alt={name}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials(name)}
                </div>
              )}
              <div className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {rank}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
