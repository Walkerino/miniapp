import type { MiniappCardData } from 'entities/miniapp';
import { MiniApp } from 'widgets/MiniAppList/ui/Miniapp';

import styles from '../styles.module.css';

type MiniAppListViewProps = {
  items: MiniappCardData[];
  onCreate: () => void;
  onEdit: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

export function MiniAppListView({
  items,
  onCreate,
  onEdit,
  onToggleFavorite,
}: MiniAppListViewProps) {
  return (
    <section className={styles.miniappList}>
      <h2 className={styles.heading}>MiniApps</h2>
      <div className={styles.list}>
        {items.map((miniapp) => (
          <MiniApp
            key={miniapp.id}
            miniapp={miniapp}
            onEdit={() => onEdit(miniapp.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
      <button className={styles.createCard} type="button" onClick={onCreate}>
        <span className={styles.createIcon}>+</span>
        <span>Создать мини-приложение</span>
      </button>
    </section>
  );
}
