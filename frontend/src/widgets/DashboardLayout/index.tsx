import type { CSSProperties, ReactNode } from 'react';

import { LayoutDashboard, LogOut, PanelsTopLeft, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Avatar, AvatarFallback } from 'components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from 'components/ui/sidebar';
import { routesMasks } from 'shared/config/routesMasks';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: routesMasks.main.create() },
  { icon: PanelsTopLeft, label: 'MiniApps', href: routesMasks.miniapps.list() },
  { icon: User, label: 'Profile', href: routesMasks.main.create() },
];

type DashboardLayoutProps = {
  children: ReactNode;
  userName: string;
};

function getUserInitials(userName: string) {
  return (
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

function AppSidebar({ userName }: { userName: string }) {
  const location = useLocation();
  const userInitials = getUserInitials(userName);

  return (
    <Sidebar className="h-svh" collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <span className="text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Dashboard
          </span>
          <SidebarTrigger />
        </div>
        <div className="flex items-center gap-3 rounded-md px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <Avatar className="size-10 group-data-[collapsible=icon]:size-8">
            <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
            <p className="text-xs text-sidebar-foreground/60">Workspace</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const isActive =
                  item.href === routesMasks.main.create()
                    ? location.pathname === routesMasks.main.create()
                    : location.pathname.toLowerCase().startsWith(item.href.toLowerCase());

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="text-red-600 hover:bg-red-50 hover:text-red-700 data-[active=true]:bg-red-50 data-[active=true]:text-red-700"
              tooltip="Logout"
            >
              <button type="button">
                <LogOut />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function DashboardLayout({ children, userName }: DashboardLayoutProps) {
  return (
    <SidebarProvider
      className="dashboard-page"
      style={{ '--sidebar-width': '238px' } as CSSProperties}
    >
      <AppSidebar userName={userName} />
      <SidebarInset className="dashboard-inset">{children}</SidebarInset>
    </SidebarProvider>
  );
}
