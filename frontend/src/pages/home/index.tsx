import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Heart,
  LayoutDashboard,
  LogOut,
  Plus,
  Rocket,
  Settings,
  Trophy,
  Trash2,
  User,
} from 'lucide-react';

import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { Checkbox } from 'components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { sessionStore } from 'entities/session';
import { miniappApi } from 'entities/miniapp';
import type { Miniapp } from 'entities/miniapp';
import { routesMasks } from 'shared/config/routesMasks';
import { cn } from 'shared/lib/utils';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: routesMasks.main.create() },
  { icon: LayoutDashboard, label: 'MiniApps', to: routesMasks.miniapps.list() },
  { icon: User, label: 'Profile', to: routesMasks.main.create() },
];

type VisibleStatus = 'pending' | 'active' | 'disabled';
type ProjectRow = {
  id: string;
  logo: string;
  title: string;
  description: string;
  status: VisibleStatus | 'deleted';
  color: string;
  appUrl?: string;
  launchesCount: number;
  isFavorite: boolean;
};
type VisibleProjectRow = Omit<ProjectRow, 'status'> & { status: VisibleStatus };
type StatusFilter = 'all' | VisibleStatus;

const statusVariants = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border-stone-200 bg-stone-100 text-stone-600',
} satisfies Record<VisibleStatus, string>;

const ROWS_PER_PAGE = 4;

function getRowColor(status: VisibleStatus) {
  if (status === 'active') {
    return 'bg-emerald-600 text-white';
  }

  if (status === 'pending') {
    return 'bg-amber-500 text-white';
  }

  return 'bg-stone-500 text-white';
}

function toVisibleRow(miniapp: Miniapp): VisibleProjectRow | null {
  if (miniapp.status === 'deleted') {
    return null;
  }

  return {
    id: miniapp.id,
    logo: miniapp.title[0]?.toUpperCase() || 'M',
    title: miniapp.title,
    description: miniapp.description || 'No description',
    status: miniapp.status,
    color: getRowColor(miniapp.status),
    appUrl: miniapp.url,
    launchesCount: miniapp.launches_count,
    isFavorite: miniapp.is_favorite,
  };
}

type AppSidebarProps = {
  userName: string;
  onLogout: () => void;
};

function AppSidebar({ userName, onLogout }: AppSidebarProps) {
  const location = useLocation();
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

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
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} tooltip={item.label}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
              <button type="button" onClick={onLogout}>
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

type MiniAppsChartProps = {
  rows: VisibleProjectRow[];
};

function formatMetric(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function DashboardMetrics({ rows }: MiniAppsChartProps) {
  const activeCount = rows.filter((row) => row.status === 'active').length;
  const totalLaunches = rows.reduce((sum, row) => sum + row.launchesCount, 0);
  const favoriteCount = rows.filter((row) => row.isFavorite).length;
  const metrics = [
    {
      icon: LayoutDashboard,
      label: 'Visible MiniApps',
      value: rows.length,
      detail: `${activeCount} active`,
    },
    {
      icon: Rocket,
      label: 'Total Launches',
      value: totalLaunches,
      detail: 'Across loaded miniapps',
    },
    {
      icon: Heart,
      label: 'Favorites',
      value: favoriteCount,
      detail: 'Marked by current user',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-normal">{formatMetric(metric.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-stone-50 text-stone-700">
              <metric.icon className="size-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MiniAppsChart({ rows }: MiniAppsChartProps) {
  const chartData = [
    { status: 'active', label: 'Active', value: rows.filter((row) => row.status === 'active').length },
    { status: 'pending', label: 'Pending', value: rows.filter((row) => row.status === 'pending').length },
    { status: 'disabled', label: 'Disabled', value: rows.filter((row) => row.status === 'disabled').length },
  ] satisfies Array<{ status: VisibleStatus; label: string; value: number }>;
  const maxValue = Math.max(...chartData.map((item) => item.value), 1);
  const total = rows.length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>MiniApps Overview</CardTitle>
          <CardDescription className="mt-2">
            Status distribution across {total} visible miniapps
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
          <div>
            <p className="text-4xl font-semibold tracking-normal">{total}</p>
            <p className="mt-1 text-sm text-muted-foreground">Total visible miniapps</p>
          </div>
          <div className="grid h-44 grid-cols-3 items-end gap-4 border-b border-border px-2">
            {chartData.map((item) => (
              <div className="flex h-full flex-col justify-end gap-2" key={item.status}>
                <div className="flex flex-1 items-end">
                  <div
                    aria-label={`${item.label}: ${item.value}`}
                    className={cn('w-full rounded-t-md border', statusVariants[item.status])}
                    style={{ height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PopularMiniApps({ rows }: MiniAppsChartProps) {
  const popularRows = [...rows]
    .filter((row) => row.launchesCount > 0)
    .sort((first, second) => {
      const launchesDiff = second.launchesCount - first.launchesCount;

      return launchesDiff || first.title.localeCompare(second.title);
    })
    .slice(0, 3);
  const maxLaunches = popularRows[0]?.launchesCount ?? 1;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Popular MiniApps</CardTitle>
          <CardDescription className="mt-2">Top 3 by launches</CardDescription>
        </div>
        <CardAction>
          <div className="flex size-9 items-center justify-center rounded-md border bg-stone-50 text-stone-700">
            <Trophy className="size-5" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {popularRows.length > 0 ? (
          <div className="grid gap-4">
            {popularRows.map((row, index) => (
              <div className="grid gap-2" key={row.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-stone-100 text-sm font-semibold text-stone-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                      <Badge className={cn('mt-1 capitalize', statusVariants[row.status])} variant="outline">
                        {row.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tracking-normal">{formatMetric(row.launchesCount)}</p>
                    <p className="text-xs text-muted-foreground">launches</p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-stone-900"
                    style={{ width: `${Math.max((row.launchesCount / maxLaunches) * 100, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            No launches yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ProjectsTableProps = {
  onReload: () => Promise<void>;
  rows: VisibleProjectRow[];
  setRows: Dispatch<SetStateAction<VisibleProjectRow[]>>;
};

function ProjectsTable({ onReload, rows, setRows }: ProjectsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(() => new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMiniApp, setNewMiniApp] = useState({
    title: '',
    description: '',
    appUrl: '',
  });
  const [renameMiniApp, setRenameMiniApp] = useState<{
    originalTitle: string;
    title: string;
    description: string;
  } | null>(null);
  const [settingsMiniApp, setSettingsMiniApp] = useState<{
    title: string;
    appUrl: string;
  } | null>(null);
  const filteredRows =
    statusFilter === 'all'
      ? rows
      : rows.filter((row) => row.status === statusFilter);
  const pageCount = Math.max(Math.ceil(filteredRows.length / ROWS_PER_PAGE), 1);
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRows.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selectedCount = selectedTitles.size;

  const toggleRowSelection = (title: string, checked: boolean | 'indeterminate') => {
    setSelectedTitles((current) => {
      const next = new Set(current);

      if (checked === true) {
        next.add(title);
      } else {
        next.delete(title);
      }

      return next;
    });
  };

  const deleteSelectedRows = () => {
    setRows((current) => {
      const next = current.filter((row) => !selectedTitles.has(row.title));
      const nextFilteredRows =
        statusFilter === 'all'
          ? next
          : next.filter((row) => row.status === statusFilter);
      const nextPageCount = Math.max(Math.ceil(nextFilteredRows.length / ROWS_PER_PAGE), 1);

      setCurrentPage((page) => Math.min(page, nextPageCount));

      return next;
    });
    setSelectedTitles(new Set());
  };

  const createMiniApp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = newMiniApp.title.trim();
    const description = newMiniApp.description.trim();
    const appUrl = newMiniApp.appUrl.trim();

    if (!title || !description || !appUrl) {
      return;
    }

    const response = await miniappApi.createMiniapp({
      title,
      description,
      url: appUrl,
      status: 'pending',
    });

    if (response.isError || !response.data) {
      return;
    }

    setNewMiniApp({ title: '', description: '', appUrl: '' });
    setStatusFilter('all');
    setCurrentPage(1);
    setIsCreateOpen(false);
    await onReload();
  };

  const saveRename = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!renameMiniApp) {
      return;
    }

    const title = renameMiniApp.title.trim();
    const description = renameMiniApp.description.trim();

    if (!title || !description) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.title === renameMiniApp.originalTitle
          ? {
              ...row,
              logo: title[0].toUpperCase(),
              title,
              description,
            }
          : row,
      ),
    );
    setSelectedTitles((current) => {
      if (!current.has(renameMiniApp.originalTitle)) {
        return current;
      }

      const next = new Set(current);
      next.delete(renameMiniApp.originalTitle);
      next.add(title);
      return next;
    });
    setRenameMiniApp(null);
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!settingsMiniApp) {
      return;
    }

    const appUrl = settingsMiniApp.appUrl.trim();

    if (!appUrl) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.title === settingsMiniApp.title
          ? {
              ...row,
              appUrl,
            }
          : row,
      ),
    );
    setSettingsMiniApp(null);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>MiniApps</CardTitle>
          <CardDescription className="mt-2 flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            30 done this month
          </CardDescription>
        </div>
        <CardAction className="flex gap-2">
          {selectedCount > 0 ? (
            <Button onClick={deleteSelectedRows} type="button" variant="destructive">
              <Trash2 />
              Delete {selectedCount}
            </Button>
          ) : (
            <>
              <Select
                onValueChange={(value) => {
                  setStatusFilter(value as StatusFilter);
                  setCurrentPage(1);
                }}
                value={statusFilter}
              >
                <SelectTrigger aria-label="Filter by status" className="w-[156px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
                <DialogTrigger asChild>
                  <Button type="button">
                    <Plus />
                    New MiniApp
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form className="grid gap-5" onSubmit={createMiniApp}>
                    <DialogHeader>
                      <DialogTitle>Create MiniApp</DialogTitle>
                      <DialogDescription>
                        Enter the miniapp details to add it to the dashboard.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-name">App name</Label>
                        <Input
                          id="miniapp-name"
                          onChange={(event) => setNewMiniApp((current) => ({ ...current, title: event.target.value }))}
                          placeholder="Customer Portal"
                          required
                          value={newMiniApp.title}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-description">Description</Label>
                        <Input
                          id="miniapp-description"
                          onChange={(event) =>
                            setNewMiniApp((current) => ({ ...current, description: event.target.value }))
                          }
                          placeholder="Short description"
                          required
                          value={newMiniApp.description}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-url">App URL</Label>
                        <Input
                          id="miniapp-url"
                          onChange={(event) => setNewMiniApp((current) => ({ ...current, appUrl: event.target.value }))}
                          placeholder="https://example.com"
                          required
                          type="url"
                          value={newMiniApp.appUrl}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button className="bg-black text-white hover:bg-black/90" type="submit">
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardAction>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Name</TableHead>
              <TableHead className="min-w-[360px]">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[1%] text-right">Settings</TableHead>
              <TableHead className="w-[1%] text-right">Rename</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <Checkbox
                      aria-label={`Select ${row.title}`}
                      checked={selectedTitles.has(row.title)}
                      onCheckedChange={(checked) => toggleRowSelection(row.title, checked)}
                    />
                    <Avatar className="size-7 rounded-md">
                      <AvatarFallback className={cn('rounded-md text-xs font-semibold', row.color)}>
                        {row.logo}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{row.title}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[440px] whitespace-normal text-muted-foreground">
                  {row.description}
                </TableCell>
                <TableCell>
                  <Badge className={cn('capitalize', statusVariants[row.status])} variant="outline">
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Dialog
                    onOpenChange={(open) => {
                      if (!open) {
                        setSettingsMiniApp(null);
                      }
                    }}
                    open={settingsMiniApp?.title === row.title}
                  >
                    <DialogTrigger asChild>
                      <Button
                        aria-label={`Open settings for ${row.title}`}
                        onClick={() => setSettingsMiniApp({ title: row.title, appUrl: row.appUrl ?? '' })}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Settings />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form className="grid gap-5" onSubmit={saveSettings}>
                        <DialogHeader>
                          <DialogTitle>MiniApp Settings</DialogTitle>
                          <DialogDescription>Update the App URL for {row.title}.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2">
                          <Label htmlFor={`settings-url-${row.title}`}>App URL</Label>
                          <Input
                            id={`settings-url-${row.title}`}
                            onChange={(event) =>
                              setSettingsMiniApp((current) =>
                                current ? { ...current, appUrl: event.target.value } : current,
                              )
                            }
                            placeholder="https://example.com"
                            required
                            type="url"
                            value={settingsMiniApp?.appUrl ?? ''}
                          />
                        </div>

                        <DialogFooter>
                          <Button className="bg-black text-white hover:bg-black/90" type="submit">
                            Save
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell className="text-right">
                  <Dialog
                    onOpenChange={(open) => {
                      if (!open) {
                        setRenameMiniApp(null);
                      }
                    }}
                    open={renameMiniApp?.originalTitle === row.title}
                  >
                    <DialogTrigger asChild>
                      <Button
                        aria-label={`Rename ${row.title}`}
                        onClick={() =>
                          setRenameMiniApp({
                            originalTitle: row.title,
                            title: row.title,
                            description: row.description,
                          })
                        }
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Edit3 />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form className="grid gap-5" onSubmit={saveRename}>
                        <DialogHeader>
                          <DialogTitle>Rename MiniApp</DialogTitle>
                          <DialogDescription>Update the name and description for this miniapp.</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor={`rename-name-${row.title}`}>App name</Label>
                            <Input
                              id={`rename-name-${row.title}`}
                              onChange={(event) =>
                                setRenameMiniApp((current) =>
                                  current ? { ...current, title: event.target.value } : current,
                                )
                              }
                              required
                              value={renameMiniApp?.title ?? ''}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`rename-description-${row.title}`}>Description</Label>
                            <Input
                              id={`rename-description-${row.title}`}
                              onChange={(event) =>
                                setRenameMiniApp((current) =>
                                  current ? { ...current, description: event.target.value } : current,
                                )
                              }
                              required
                              value={renameMiniApp?.description ?? ''}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button className="bg-black text-white hover:bg-black/90" type="submit">
                            Save
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                  No miniapps found for this status.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="justify-between border-t">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Page {safeCurrentPage}</span> of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            type="button"
            variant="outline"
          >
            <ChevronLeft />
            Prev
          </Button>
          <Button
            disabled={safeCurrentPage === pageCount}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, pageCount))}
            type="button"
            variant="outline"
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

type DashboardContentProps = {
  userName: string;
};

function DashboardContent({ userName }: DashboardContentProps) {
  const [rows, setRows] = useState<VisibleProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMiniapps = useCallback(async () => {
    const pageSize = 100;

    setIsLoading(true);
    setError(null);

    const response = await miniappApi.getMiniapps({ limit: pageSize, page: 1 });

    if (response.isError || !response.data) {
      setIsLoading(false);
      setError(response.errorMessage ?? 'Failed to load miniapps');
      return;
    }

    const pageCount = Math.ceil(response.data.total / pageSize);
    const pageResponses =
      pageCount > 1
        ? await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              miniappApi.getMiniapps({ limit: pageSize, page: index + 2 }),
            ),
          )
        : [];
    const failedPage = pageResponses.find((pageResponse) => pageResponse.isError || !pageResponse.data);

    if (failedPage) {
      setIsLoading(false);
      setError(failedPage.errorMessage ?? 'Failed to load miniapps');
      return;
    }

    const miniapps = [
      ...response.data.items,
      ...pageResponses.flatMap((pageResponse) => pageResponse.data?.items ?? []),
    ];

    setRows(miniapps.map(toVisibleRow).filter((row): row is VisibleProjectRow => Boolean(row)));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadMiniapps();
    });
  }, [loadMiniapps]);

  return (
    <div className="dashboard-shell">
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal">Добро пожаловать, {userName}</h1>
      </div>
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading miniapps...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive" role="alert">
            {error}
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardMetrics rows={rows} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <MiniAppsChart rows={rows} />
            <PopularMiniApps rows={rows} />
          </div>
          <ProjectsTable onReload={loadMiniapps} rows={rows} setRows={setRows} />
        </>
      )}
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const userName = sessionStore.userName;

  const handleLogout = async () => {
    await sessionStore.logout();
    navigate(routesMasks.login.create(), { replace: true });
  };

  return (
    <SidebarProvider
      className="dashboard-page"
      style={{ '--sidebar-width': '238px' } as CSSProperties}
    >
      <AppSidebar userName={userName} onLogout={handleLogout} />
      <SidebarInset className="dashboard-inset">
        <DashboardContent userName={userName} />
      </SidebarInset>
    </SidebarProvider>
  );
}
