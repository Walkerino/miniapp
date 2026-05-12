import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { userApi } from 'api';
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
import { routesMasks } from 'shared/config/routesMasks';
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
    dialog: 'delete-account',
    icon: Trash2,
    title: 'Delete account',
    description: 'Permanently remove this account and all related data.',
    buttonLabel: 'Delete account',
    buttonVariant: 'destructive' as const,
  },
];

type ProfileDialog = 'password' | 'personal-info' | 'delete-account' | null;

function getErrorMessage(status: number | undefined, fallback: string) {
  if (!status) {
    return 'Connection failed';
  }

  if (status === 400) {
    return 'Check the entered data';
  }

  if (status === 401) {
    return 'Current password is incorrect';
  }

  if (status === 409) {
    return 'Email is already registered';
  }

  return fallback;
}

export const ProfilePage = observer(function ProfilePage() {
  const [activeDialog, setActiveDialog] = useState<ProfileDialog>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
  });
  const [deletePassword, setDeletePassword] = useState('');
  const navigate = useNavigate();
  const user = sessionStore.userData;
  const userName = sessionStore.fullName;
  const email = user?.email ?? 'No email';
  const initials = getUserInitials(userName);
  const role = formatRole(sessionStore.role);

  useEffect(() => {
    setPersonalForm((current) => ({
      ...current,
      name: user?.name ?? '',
      email: user?.email ?? '',
    }));
  }, [user?.email, user?.name]);

  function openDialog(dialog: ProfileDialog) {
    setFormError(null);
    setActiveDialog(dialog);

    if (dialog === 'personal-info') {
      setPersonalForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        currentPassword: '',
      });
    }

    if (dialog === 'password') {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }

    if (dialog === 'delete-account') {
      setDeletePassword('');
    }
  }

  function closeDialog() {
    setActiveDialog(null);
    setFormError(null);
    setIsSubmitting(false);
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (passwordForm.currentPassword.length < 6 || passwordForm.newPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setFormError('New password must be different');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const response = await userApi.updatePassword({
      current_password: passwordForm.currentPassword,
      new_password: passwordForm.newPassword,
    });
    setIsSubmitting(false);

    if (response.isError || !response.data) {
      setFormError(getErrorMessage(response.status, 'Could not change password'));
      return;
    }

    sessionStore.setUser(response.data);
    closeDialog();
  }

  async function handlePersonalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const nextName = personalForm.name.trim();
    const nextEmail = personalForm.email.trim();
    const currentName = user?.name ?? '';
    const currentEmail = user?.email ?? '';
    const nameChanged = nextName !== currentName;
    const emailChanged = nextEmail !== currentEmail;

    if (!nextName) {
      setFormError('Name is required');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      setFormError('Invalid email');
      return;
    }

    if (!nameChanged && !emailChanged) {
      closeDialog();
      return;
    }

    if (emailChanged && personalForm.currentPassword.length < 6) {
      setFormError('Current password is required to change email');
      return;
    }

    setIsSubmitting(true);

    if (emailChanged) {
      const emailResponse = await userApi.updateEmail({
        email: nextEmail,
        current_password: personalForm.currentPassword,
      });

      if (emailResponse.isError || !emailResponse.data) {
        setIsSubmitting(false);
        setFormError(getErrorMessage(emailResponse.status, 'Could not change email'));
        return;
      }

      sessionStore.setUser(emailResponse.data);
    }

    if (nameChanged) {
      const nameResponse = await userApi.updateName({ name: nextName });

      if (nameResponse.isError || !nameResponse.data) {
        setIsSubmitting(false);
        setFormError(getErrorMessage(nameResponse.status, 'Could not change name'));
        return;
      }

      sessionStore.setUser(nameResponse.data);
    }

    setIsSubmitting(false);
    closeDialog();
  }

  async function handleDeleteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (deletePassword.length < 6) {
      setFormError('Current password is required');
      return;
    }

    setIsSubmitting(true);
    const response = await userApi.deleteAccount({ current_password: deletePassword });
    setIsSubmitting(false);

    if (response.isError) {
      setFormError(getErrorMessage(response.status, 'Could not delete account'));
      return;
    }

    sessionStore.clearSession();
    navigate(routesMasks.login.create(), { replace: true });
  }

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
                    onClick={() => openDialog(action.dialog as ProfileDialog)}
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

        <Dialog onOpenChange={(open) => (open ? openDialog('password') : closeDialog())} open={activeDialog === 'password'}>
          <DialogContent>
            <form className="grid gap-5" onSubmit={handlePasswordSubmit}>
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
                <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
              </DialogHeader>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    autoComplete="current-password"
                    id="current-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    type="password"
                    value={passwordForm.currentPassword}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    autoComplete="new-password"
                    id="new-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    type="password"
                    value={passwordForm.newPassword}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    autoComplete="new-password"
                    id="confirm-password"
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    type="password"
                    value={passwordForm.confirmPassword}
                  />
                </div>
              </div>

              <DialogFooter showCloseButton>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => (open ? openDialog('personal-info') : closeDialog())}
          open={activeDialog === 'personal-info'}
        >
          <DialogContent>
            <form className="grid gap-5" onSubmit={handlePersonalSubmit}>
              <DialogHeader>
                <DialogTitle>Change personal info</DialogTitle>
                <DialogDescription>Update the name and email shown on your account.</DialogDescription>
              </DialogHeader>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    onChange={(event) =>
                      setPersonalForm((current) => ({ ...current, name: event.target.value }))
                    }
                    value={personalForm.name}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    onChange={(event) =>
                      setPersonalForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    value={personalForm.email}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-current-password">Current password</Label>
                  <Input
                    autoComplete="current-password"
                    id="profile-current-password"
                    onChange={(event) =>
                      setPersonalForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    type="password"
                    value={personalForm.currentPassword}
                  />
                </div>
              </div>

              <DialogFooter showCloseButton>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => (open ? openDialog('delete-account') : closeDialog())}
          open={activeDialog === 'delete-account'}
        >
          <DialogContent>
            <form className="grid gap-5" onSubmit={handleDeleteSubmit}>
              <DialogHeader>
                <DialogTitle>Delete account</DialogTitle>
                <DialogDescription>
                  Enter your current password to permanently delete this account.
                </DialogDescription>
              </DialogHeader>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="delete-current-password">Current password</Label>
                <Input
                  autoComplete="current-password"
                  id="delete-current-password"
                  onChange={(event) => setDeletePassword(event.target.value)}
                  type="password"
                  value={deletePassword}
                />
              </div>

              <DialogFooter showCloseButton>
                <Button disabled={isSubmitting} type="submit" variant="destructive">
                  {isSubmitting ? 'Deleting...' : 'Delete account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </DashboardLayout>
  );
});
