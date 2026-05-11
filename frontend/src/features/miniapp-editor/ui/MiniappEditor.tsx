import { useEffect } from 'react';

import { observer } from 'mobx-react-lite';
import { useNavigate, useParams } from 'react-router-dom';

import { MiniappEditorStore } from 'features/miniapp-editor/model/MiniappEditorStore';
import { MiniappEditorForm } from 'features/miniapp-editor/ui/MiniappEditorForm';
import { routesMasks } from 'shared/config/routesMasks';
import { useLocalStore } from 'shared/lib/useLocalStore';

import styles from './styles.module.css';

export const MiniappEditor = observer(() => {
  const { miniappId } = useParams();
  const navigate = useNavigate();
  const store = useLocalStore(() => new MiniappEditorStore());

  useEffect(() => {
    void store.load(miniappId);
  }, [miniappId, store]);

  if (store.isLoading) {
    return <p className={styles.stateText}>Loading miniapp...</p>;
  }

  if (store.error) {
    return (
      <p className={styles.stateText} role="alert">
        {store.error}
      </p>
    );
  }

  return (
    <MiniappEditorForm
      canSubmit={store.canSubmit}
      form={store.form}
      isCreateMode={store.isCreateMode}
      isSaved={store.isSaved}
      isSaving={store.isSaving}
      onBack={() => navigate(routesMasks.main.create())}
      onDescriptionChange={store.setDescription}
      onStatusChange={store.setStatus}
      onSubmit={() => void store.submit()}
      onTitleChange={store.setTitle}
      onUrlChange={store.setUrl}
    />
  );
});
