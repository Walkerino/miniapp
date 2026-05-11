import { useEffect } from 'react';

import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';

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
    return <p>Loading miniapps...</p>;
  }

  if (store.error) {
    return <p role="alert">{store.error}</p>;
  }

  return (
    <MiniAppListView
      items={store.items}
      onCreate={() => navigate(routesMasks.miniapps.create())}
      onEdit={(id) => navigate(routesMasks.miniapps.edit(id))}
      onToggleFavorite={store.toggleFavorite}
    />
  );
});
