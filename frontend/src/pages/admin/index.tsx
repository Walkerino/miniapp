import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Check,
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
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
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
import { adminApi, type AdminMetricsResponse } from 'entities/admin';
import { sessionStore } from 'entities/session';
import type { Miniapp } from 'entities/miniapp';
import type { AuthUser } from 'entities/user';
import { routesMasks } from 'shared/config/routesMasks';
import { DashboardLayout } from 'widgets/DashboardLayout';

function formatMetric(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
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

export function AdminPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
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

    const [usersResponse, metricsResponse, pendingResponse] = await Promise.all([
      adminApi.getUsers(search, 100),
      adminApi.getMetrics(),
      adminApi.getPendingMiniapps(),
    ]);

    if (usersResponse.isError || metricsResponse.isError || pendingResponse.isError) {
      setError('Failed to load admin dashboard data.');
      setIsLoading(false);
      return;
    }

    setUsers(usersResponse.data?.items ?? []);
    setUsersTotal(usersResponse.data?.total ?? 0);
    setMetrics(metricsResponse.data ?? null);
    setPendingMiniapps(pendingResponse.data?.items ?? []);
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

  return (
    <DashboardLayout userName={sessionStore.fullName}>
      <main className="min-h-svh bg-stone-50 p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-stone-900 text-white">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-normal text-stone-950">Admin panel</h1>
                <p className="text-sm text-stone-500">Users, moderation, and platform metrics.</p>
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
              <Card key={metric.label} className="rounded-md py-4">
                <CardContent className="flex items-center justify-between gap-4 px-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal">
                      {isLoading ? '-' : formatMetric(metric.value)}
                    </p>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-md bg-stone-100 text-stone-700">
                    <metric.icon className="size-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle>User roles</CardTitle>
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

                <div className="max-h-[420px] overflow-y-auto rounded-md border bg-white">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 border-b px-3 py-3 last:border-b-0"
                    >
                      <Avatar className="size-10">
                        <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-950">
                          {user.name || 'Unnamed user'}
                        </p>
                        <p className="truncate text-xs text-stone-500">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
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
                              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
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

            <Card className="rounded-md">
              <CardHeader>
                <CardTitle>Pending moderation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border bg-white">
                  <Table>
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
                              className="block max-w-[360px] truncate text-sm text-stone-600 underline-offset-4 hover:underline"
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
