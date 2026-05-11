import { sessionStore } from 'entities/session';
import { MiniAppList } from 'widgets/MiniAppList';
import { DashboardLayout } from 'widgets/DashboardLayout';

export function MiniappsPage() {
  const userName = sessionStore.fullName;

  return (
    <DashboardLayout userName={userName}>
      <MiniAppList />
    </DashboardLayout>
  );
}
