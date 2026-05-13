import type { CSSProperties, ReactNode } from 'react';

import { LayoutDashboard, LogOut, Menu, PanelsTopLeft, ShieldCheck, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
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
  useSidebar,
} from 'components/ui/sidebar';
import { sessionStore } from 'entities/session';
import { routesMasks } from 'shared/config/routesMasks';
import { cn } from 'shared/lib/utils';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: routesMasks.main.create() },
  { icon: PanelsTopLeft, label: 'MiniApps', href: routesMasks.miniapps.list() },
  { icon: User, label: 'Profile', href: routesMasks.profile.create() },
  { icon: ShieldCheck, label: 'Admin', href: routesMasks.admin.create(), adminOnly: true },
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
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const userInitials = getUserInitials(userName);
  const roleLabel = sessionStore.role === 'admin' ? 'Admin' : 'User';
  const roleClassName =
    sessionStore.role === 'admin'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-stone-200 bg-stone-100 text-stone-600';

  const handleLogout = async () => {
    await sessionStore.logout();
    setOpenMobile(false);
    navigate(routesMasks.login.create(), { replace: true });
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
            <Badge className={cn('mt-1 px-1.5 py-0 text-[10px] leading-4', roleClassName)} variant="outline">
              {roleLabel}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.filter((item) => !item.adminOnly || sessionStore.role === 'admin').map((item) => {
                const isActive =
                  item.href === routesMasks.main.create()
                    ? location.pathname === routesMasks.main.create()
                    : location.pathname.toLowerCase().startsWith(item.href.toLowerCase());

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link onClick={closeMobileSidebar} to={item.href}>
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
              <button type="button" onClick={handleLogout}>
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

export function DashboardMobileNav() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border bg-background/95 px-3 py-2 shadow-sm md:hidden">
      <Button aria-label="Open navigation" className="size-9" onClick={toggleSidebar} size="icon" type="button" variant="ghost">
        <Menu className="size-5" />
      </Button>
      <span className="text-sm font-medium text-foreground">Navigation</span>
    </div>
  );
}

export function DashboardLayout({ children, userName }: DashboardLayoutProps) {
  return (
    <SidebarProvider
      className="dashboard-page"
      style={{ '--sidebar-width': '238px' } as CSSProperties}
    >
      <AppSidebar userName={userName} />
      <SidebarInset className="dashboard-inset">
        <DashboardMobileNav />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
