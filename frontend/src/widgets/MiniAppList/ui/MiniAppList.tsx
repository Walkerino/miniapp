import { useEffect } from 'react';

import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from 'components/ui/card';
import { routesMasks } from 'shared/config/routesMasks';
import { useLocalStore } from 'shared/lib/useLocalStore';
import { MiniAppListStore } from 'widgets/MiniAppList/model/MiniAppListStore';
import { MiniAppListView } from 'widgets/MiniAppList/ui/MiniAppListView';

export const MiniAppList = observer(() => {
  const store = useLocalStore(() => new MiniAppListStore());
  const navigate = useNavigate();

  useEffect(() => {
    void store.load();
  }, [store]);

  if (store.isLoading) {
    return (
      <section className="dashboard-shell">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading miniapps...
          </CardContent>
        </Card>
      </section>
    );
  }

  if (store.error) {
    return (
      <section className="dashboard-shell">
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive" role="alert">
            {store.error}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <MiniAppListView
      hasMore={store.hasMore}
      isAdmin={store.isAdmin}
      isLoadingMore={store.isLoadingMore}
      items={store.items}
      onCreate={() => navigate(routesMasks.miniapps.create())}
      onDelete={store.deleteMiniapps}
      onLoadMore={store.loadNextPage}
      onPreview={store.getMiniappLaunchUrl}
      onLaunch={store.launchMiniapp}
      onStatusFilterChange={(status) =>
        store.load({ status: status === 'all' ? undefined : status })
      }
      onUpdateDetails={store.updateMiniappDetails}
      onStatusAction={store.updateStatus}
      isStatusUpdating={store.isStatusUpdating}
      onToggleFavorite={store.toggleFavorite}
      page={store.page}
      pageCount={store.pageCount}
      total={store.total}
    />
  );
});
