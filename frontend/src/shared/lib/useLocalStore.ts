import { useEffect, useState } from 'react';

export interface ILocalStore {
  destroy: () => void;
}

export function useLocalStore<TStore extends ILocalStore>(creator: () => TStore): TStore {
  const [store] = useState(creator);

  useEffect(() => {
    return () => store.destroy();
  }, [store]);

  return store;
}
