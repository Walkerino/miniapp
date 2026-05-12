import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarChart3,
  Check,
  ListChecks,
  MoreHorizontal,
  Rocket,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { adminApi, type AdminAuditLogItem, type AdminMetricsResponse } from 'entities/admin';
import { sessionStore } from 'entities/session';
import type { Miniapp } from 'entities/miniapp';
import type { AuthUser } from 'entities/user';
import { routesMasks } from 'shared/config/routesMasks';
import { DashboardLayout } from 'widgets/DashboardLayout';

const createdChartDurationOptions = [3, 7, 14, 21, 30] as const;
const AUDIT_LOG_LIMIT = 20;

type CreatedChartDuration = (typeof createdChartDurationOptions)[number];

function formatMetric(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMiniappsCreatedByDay(miniapps: Miniapp[], duration: CreatedChartDuration) {
  const today = new Date();
  const days = Array.from({ length: duration }, (_, index) => {
    const date = new Date(today);

    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (duration - 1 - index));

    return {
      key: getDateKey(date),
      label: formatDayLabel(date),
      value: 0,
    };
  });
  const dayIndexByKey = new Map(days.map((day, index) => [day.key, index]));

  miniapps.forEach((miniapp) => {
    const createdAt = new Date(miniapp.created_at);

    if (Number.isNaN(createdAt.getTime())) {
      return;
    }

    const dayIndex = dayIndexByKey.get(getDateKey(createdAt));

    if (dayIndex !== undefined) {
      days[dayIndex].value += 1;
    }
  });

  return days;
}

function getInitials(name: string | null, email: string) {
  const value = name || email;

  return (
    value
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'U'
  );
}

function getOwnerName(users: AuthUser[], ownerId: string) {
  const owner = users.find((user) => user.id === ownerId);

  return owner?.name || owner?.email || ownerId.slice(0, 8);
}

function formatRole(role: string) {
  return role ? `${role[0].toUpperCase()}${role.slice(1)}` : 'User';
}

function getAuditActionClassName(action: string) {
  if (action.includes('publish')) {
    return 'text-emerald-700';
  }

  if (action.includes('disable') || action.includes('reject')) {
    return 'text-red-700';
  }

  if (action.includes('launch')) {
    return 'text-sky-700';
  }

  return 'text-stone-900';
}

export function AdminPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [miniapps, setMiniapps] = useState<Miniapp[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [createdChartDuration, setCreatedChartDuration] = useState<CreatedChartDuration>(7);
  const [pendingMiniapps, setPendingMiniapps] = useState<Miniapp[]>([]);
  const [openUserMenuId, setOpenUserMenuId] = useState<string | null>(null);
  const [rejectMiniapp, setRejectMiniapp] = useState<Miniapp | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [usersResponse, metricsResponse, miniappsResponse, pendingResponse, auditResponse] = await Promise.all([
      adminApi.getUsers(search, 100),
      adminApi.getMetrics(),
      adminApi.getMiniapps(),
      adminApi.getPendingMiniapps(),
      adminApi.getAudit(1, AUDIT_LOG_LIMIT),
    ]);

    if (
      usersResponse.isError ||
      metricsResponse.isError ||
      miniappsResponse.isError ||
      pendingResponse.isError ||
      auditResponse.isError
    ) {
      setError('Failed to load admin dashboard data.');
      setIsLoading(false);
      return;
    }

    setUsers(usersResponse.data?.items ?? []);
    setUsersTotal(usersResponse.data?.total ?? 0);
    setMetrics(metricsResponse.data ?? null);
    setMiniapps(miniappsResponse.data?.items ?? []);
    setPendingMiniapps(pendingResponse.data?.items ?? []);
    setAuditLogs(auditResponse.data?.items ?? []);
    setAuditPage(auditResponse.data?.page ?? 1);
    setAuditTotal(auditResponse.data?.total ?? 0);
    setIsLoading(false);
  }, [search]);

  useEffect(() => {
    if (sessionStore.role === 'admin') {
      void loadDashboard();
    }
  }, [loadDashboard]);

  const metricCards = useMemo(
    () => [
      { label: 'Total users', value: usersTotal, icon: Users },
      { label: 'Total miniApps', value: metrics?.total_miniapps ?? 0, icon: Rocket },
      { label: 'Active miniApps', value: metrics?.active_miniapps ?? 0, icon: Check },
      { label: 'Pending miniApps', value: metrics?.pending_miniapps ?? 0, icon: MoreHorizontal },
      { label: 'Rejected miniApps', value: metrics?.rejected_miniapps ?? 0, icon: X },
      { label: 'Total launches', value: metrics?.total_launches ?? 0, icon: Rocket },
      { label: 'Launches today', value: metrics?.launches_today ?? 0, icon: Rocket },
      { label: 'Launches this week', value: metrics?.launches_this_week ?? 0, icon: Rocket },
    ],
    [metrics, usersTotal]
  );
  const createdByDay = useMemo(
    () => getMiniappsCreatedByDay(miniapps, createdChartDuration),
    [createdChartDuration, miniapps]
  );
  const maxCreatedByDay = Math.max(...createdByDay.map((day) => day.value), 1);
  const createdInSelectedPeriod = createdByDay.reduce((sum, day) => sum + day.value, 0);
  const auditPageCount = Math.max(Math.ceil(auditTotal / AUDIT_LOG_LIMIT), 1);
  const hasMoreAuditLogs = auditPage < auditPageCount;

  if (sessionStore.role !== 'admin') {
    return <Navigate to={routesMasks.main.create()} replace />;
  }

  const promoteUser = async (user: AuthUser) => {
    setIsActionLoading(true);
    setError(null);

    const response = await adminApi.promoteUser(user.email);

    if (response.isError) {
      setError('Failed to assign admin role.');
    } else {
      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id ? { ...currentUser, role: 'admin' } : currentUser
        )
      );
    }

    setOpenUserMenuId(null);
    setIsActionLoading(false);
  };

  const publishMiniapp = async (miniapp: Miniapp) => {
    setIsActionLoading(true);
    setError(null);

    const response = await adminApi.publishMiniapp(miniapp.id);

    if (response.isError) {
      setError('Failed to publish miniApp.');
    } else {
      await loadDashboard();
    }

    setIsActionLoading(false);
  };

  const submitReject = async () => {
    if (!rejectMiniapp || !rejectReason.trim()) {
      return;
    }

    setIsActionLoading(true);
    setError(null);

    const response = await adminApi.rejectMiniapp(rejectMiniapp.id, rejectReason.trim());

    if (response.isError) {
      setError('Failed to reject miniApp.');
    } else {
      setRejectMiniapp(null);
      setRejectReason('');
      await loadDashboard();
    }

    setIsActionLoading(false);
  };

  const loadMoreAuditLogs = async () => {
    if (isAuditLoading || !hasMoreAuditLogs) {
      return;
    }

    const nextPage = auditPage + 1;

    setIsAuditLoading(true);
    setError(null);

    const response = await adminApi.getAudit(nextPage, AUDIT_LOG_LIMIT);

    if (response.isError || !response.data) {
      setError('Failed to load audit log.');
      setIsAuditLoading(false);
      return;
    }

    const auditData = response.data;

    setAuditLogs((currentLogs) => [...currentLogs, ...auditData.items]);
    setAuditPage(auditData.page);
    setAuditTotal(auditData.total);
    setIsAuditLoading(false);
  };

  return (
    <DashboardLayout userName={sessionStore.fullName}>
      <main className="dashboard-shell">
        <div className="flex w-full flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">Admin panel</h1>
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((metric) => (
              <Card key={metric.label} className="rounded-lg py-4 shadow-none">
                <CardContent className="flex items-center justify-between gap-4 px-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal">
                      {isLoading ? '-' : formatMetric(metric.value)}
                    </p>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-md border bg-stone-50 text-stone-700">
                    <metric.icon className="size-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="rounded-lg shadow-none">
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>MiniApps created by day</CardTitle>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-wrap gap-1 rounded-md border bg-stone-50 p-1">
                  {createdChartDurationOptions.map((duration) => (
                    <Button
                      className="h-8 px-3 text-xs"
                      key={duration}
                      onClick={() => setCreatedChartDuration(duration)}
                      type="button"
                      variant={createdChartDuration === duration ? 'default' : 'ghost'}
                    >
                      {duration}d
                    </Button>
                  ))}
                </div>
                
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[180px_1fr] lg:items-end">
                <div>
                  <div className="flex size-10 items-center justify-center rounded-md border bg-stone-50 text-stone-700">
                    <BarChart3 className="size-5" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-normal">
                    {isLoading ? '-' : formatMetric(createdInSelectedPeriod)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Created in {createdChartDuration} days
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <div
                    className="grid h-52 min-w-full items-end gap-3 border-b border-border px-1 sm:gap-4"
                    style={{
                      gridTemplateColumns: `repeat(${createdChartDuration}, minmax(28px, 1fr))`,
                    }}
                  >
                    {createdByDay.map((day) => (
                      <div className="flex h-full min-w-0 flex-col justify-end gap-2" key={day.key}>
                        <div className="flex flex-1 items-end">
                          <div
                            aria-label={`${day.label}: ${day.value}`}
                            className="w-full rounded-t-md border border-sky-200 bg-sky-50 text-sky-700"
                            style={{
                              height: isLoading
                                ? '0%'
                                : `${Math.max((day.value / maxCreatedByDay) * 100, day.value > 0 ? 12 : 0)}%`,
                            }}
                          />
                        </div>
                        <div className="grid gap-1 text-center text-xs text-muted-foreground">
                          <span className="truncate">{day.label}</span>
                          <span className="font-medium text-foreground">
                            {isLoading ? '-' : day.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>User roles</CardTitle>
                <CardDescription>Search users and manage administrator access.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="max-h-[420px] overflow-y-auto rounded-md border bg-card">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-wrap items-center gap-3 border-b px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/45"
                    >
                      <Avatar className="size-10">
                        <AvatarFallback className="bg-sky-50 text-sky-700">
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-[150px] flex-1">
                        <p className="truncate text-sm font-medium text-stone-950">
                          {user.name || 'Unnamed user'}
                        </p>
                        <p className="truncate text-xs text-stone-500">{user.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          user.role === 'admin'
                            ? 'border-red-200 bg-red-50 text-red-700 capitalize'
                            : 'border-stone-200 bg-stone-50 text-stone-700 capitalize'
                        }
                      >
                        {user.role}
                      </Badge>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setOpenUserMenuId(openUserMenuId === user.id ? null : user.id)
                          }
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open actions</span>
                        </Button>
                        {openUserMenuId === user.id && (
                          <div className="absolute right-0 z-10 mt-2 w-44 rounded-md border bg-white p-1 shadow-lg">
                            <button
                              type="button"
                              disabled={user.role === 'admin' || isActionLoading}
                              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void promoteUser(user)}
                            >
                              <ShieldCheck className="size-4" />
                              Assign as Admin
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!isLoading && users.length === 0 && (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-stone-500">
                      <UserRound className="size-5" />
                      No users found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-none">
              <CardHeader>
                <CardTitle>Pending moderation</CardTitle>
                <CardDescription>Review miniApps submitted by users before publishing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border bg-card">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>MiniApp Name</TableHead>
                        <TableHead>Owner name</TableHead>
                        <TableHead>Launch URL</TableHead>
                        <TableHead className="w-44 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMiniapps.map((miniapp) => (
                        <TableRow key={miniapp.id}>
                          <TableCell className="font-medium">{miniapp.title}</TableCell>
                          <TableCell>{getOwnerName(users, miniapp.created_by)}</TableCell>
                          <TableCell>
                            <a
                              className="block max-w-[360px] truncate text-sm text-sky-700 underline-offset-4 hover:underline"
                              href={miniapp.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {miniapp.url}
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                disabled={isActionLoading}
                                onClick={() => void publishMiniapp(miniapp)}
                              >
                                Publish
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isActionLoading}
                                onClick={() => setRejectMiniapp(miniapp)}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && pendingMiniapps.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-sm text-stone-500">
                            No miniApps are waiting for moderation.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg shadow-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border bg-stone-50 text-stone-700">
                  <ListChecks className="size-4" />
                </div>
                <div>
                  <CardTitle>Audit log</CardTitle>
                  <CardDescription>Recent miniApp activity across the platform.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="overflow-hidden rounded-md border bg-card">
                {auditLogs.map((log) => (
                  <div
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-3 text-sm last:border-b-0"
                    key={log.id}
                  >
                    <Badge className="capitalize" variant="outline">
                      {formatRole(log.actor_role)}
                    </Badge>
                    <span className="min-w-0 break-all text-muted-foreground">{log.actor_email}</span>
                    <span className={`font-medium ${getAuditActionClassName(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-muted-foreground">miniapp</span>
                    <span className="font-medium text-foreground">{log.miniapp_name}</span>
                    <Badge variant="secondary">{log.category}</Badge>
                  </div>
                ))}
                {!isLoading && auditLogs.length === 0 && (
                  <div className="flex min-h-28 items-center justify-center px-4 text-sm text-muted-foreground">
                    No audit events yet.
                  </div>
                )}
              </div>

              {auditPageCount > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{auditLogs.length}</span> of {auditTotal} loaded
                  </p>
                  <Button
                    disabled={!hasMoreAuditLogs || isAuditLoading}
                    onClick={() => void loadMoreAuditLogs()}
                    type="button"
                    variant="outline"
                  >
                    {isAuditLoading ? 'Loading...' : hasMoreAuditLogs ? 'Load more' : 'All loaded'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={Boolean(rejectMiniapp)} onOpenChange={(open) => !open && setRejectMiniapp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject miniApp</DialogTitle>
            <DialogDescription>
              Write the rejection reason for {rejectMiniapp?.title}.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-28 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Reason"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectMiniapp(null);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!rejectReason.trim() || isActionLoading}
              onClick={() => void submitReject()}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
