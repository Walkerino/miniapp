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
      items={store.items}
      onCreate={() => navigate(routesMasks.miniapps.create())}
      onEdit={(id) => navigate(routesMasks.miniapps.edit(id))}
      onDelete={store.deleteMiniapps}
      onPreview={store.getMiniappLaunchUrl}
      onLaunch={store.launchMiniapp}
      onRename={store.renameMiniapp}
      onToggleFavorite={store.toggleFavorite}
    />
  );
});
