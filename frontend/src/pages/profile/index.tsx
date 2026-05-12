import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { Avatar, AvatarFallback } from 'components/ui/avatar';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { sessionStore } from 'entities/session';
import { DashboardLayout } from 'widgets/DashboardLayout';

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

function formatRole(role: string | null) {
  if (!role) {
    return 'User';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

const dangerActions = [
  {
    dialog: 'password',
    icon: KeyRound,
    title: 'Change password',
    description: 'Update the password used to sign in to this account.',
    buttonLabel: 'Change password',
    buttonVariant: 'outline' as const,
  },
  {
    dialog: 'personal-info',
    icon: Pencil,
    title: 'Change personal info',
    description: 'Edit your name and email address.',
    buttonLabel: 'Edit info',
    buttonVariant: 'outline' as const,
  },
  {
    dialog: null,
    icon: Trash2,
    title: 'Delete account',
    description: 'Permanently remove this account and all related data.',
    buttonLabel: 'Delete account',
    buttonVariant: 'destructive' as const,
  },
];

type ProfileDialog = 'password' | 'personal-info' | null;

export const ProfilePage = observer(function ProfilePage() {
  const [activeDialog, setActiveDialog] = useState<ProfileDialog>(null);
  const user = sessionStore.userData;
  const userName = sessionStore.fullName;
  const email = user?.email ?? 'No email';
  const initials = getUserInitials(userName);
  const role = formatRole(sessionStore.role);

  return (
    <DashboardLayout userName={userName}>
      <main className="dashboard-shell">
        <div>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Account settings</h1>
        </div>

        <Card className="rounded-lg">
          <CardContent className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">{userName}</h2>
                  <Badge variant={role === 'Admin' ? 'default' : 'secondary'}>{role}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 rounded-lg border border-red-200 bg-red-50/60 p-4 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-red-950">Danger zone</h2>
            <p className="mt-1 text-sm text-red-900/70">
              Sensitive account actions are grouped here.
            </p>
          </div>

          <div className="grid gap-3">
            {dangerActions.map((action) => (
              <Card className="rounded-lg border-red-200 bg-white/85" key={action.title}>
                <CardHeader className="gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="flex size-10 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700">
                    <action.icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>{action.title}</CardTitle>
                    <CardDescription className="mt-1">{action.description}</CardDescription>
                  </div>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => setActiveDialog(action.dialog as ProfileDialog)}
                    type="button"
                    variant={action.buttonVariant}
                  >
                    {action.buttonLabel}
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Dialog onOpenChange={(open) => setActiveDialog(open ? activeDialog : null)} open={activeDialog === 'password'}>
          <DialogContent>
            <form className="grid gap-5">
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
                <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input id="current-password" autoComplete="current-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" autoComplete="new-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input id="confirm-password" autoComplete="new-password" type="password" />
                </div>
              </div>

              <DialogFooter>
                <Button disabled type="submit">
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => setActiveDialog(open ? activeDialog : null)}
          open={activeDialog === 'personal-info'}
        >
          <DialogContent>
            <form className="grid gap-5">
              <DialogHeader>
                <DialogTitle>Change personal info</DialogTitle>
                <DialogDescription>Update the name and email shown on your account.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input id="profile-name" defaultValue={user?.name ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" defaultValue={user?.email ?? ''} type="email" />
                </div>
              </div>

              <DialogFooter>
                <Button disabled type="submit">
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </DashboardLayout>
  );
});
