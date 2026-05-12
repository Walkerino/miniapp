import { miniappCategories } from 'entities/miniapp';
import type { MiniappCategory, MiniappFormData } from 'entities/miniapp';
import type { StatusType } from 'shared/types';

import styles from './styles.module.css';

const statusOptions: StatusType[] = ['pending', 'active', 'disabled', 'deleted'];

type MiniappEditorFormProps = {
  canChangeStatus: boolean;
  canSubmit: boolean;
  form: MiniappFormData;
  isCreateMode: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onBack: () => void;
  onCategoryChange: (category: MiniappCategory) => void;
  onDescriptionChange: (description: string) => void;
  onStatusChange: (status: StatusType) => void;
  onSubmit: () => void;
  onTitleChange: (title: string) => void;
  onUrlChange: (url: string) => void;
};

export function MiniappEditorForm({
  canChangeStatus,
  canSubmit,
  form,
  isCreateMode,
  isSaved,
  isSaving,
  onBack,
  onCategoryChange,
  onDescriptionChange,
  onStatusChange,
  onSubmit,
  onTitleChange,
  onUrlChange,
}: MiniappEditorFormProps) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} type="button" onClick={onBack}>
          Back
        </button>
        <h1>{isCreateMode ? 'Create miniapp' : 'Edit miniapp'}</h1>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className={styles.field}>
          <span>Title</span>
          <input
            value={form.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Weather App"
          />
        </label>

        <label className={styles.field}>
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Miniapp description"
          />
        </label>

        <label className={styles.field}>
          <span>URL</span>
          <input
            value={form.url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://example.com/weather"
          />
        </label>

        <label className={styles.field}>
          <span>Category</span>
          <select
            value={form.category}
            onChange={(event) => onCategoryChange(event.target.value as MiniappCategory)}
          >
            {miniappCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        {canChangeStatus && (
          <label className={styles.field}>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => onStatusChange(event.target.value as StatusType)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className={styles.submitButton} type="submit" disabled={!canSubmit}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>

        {isSaved && <p className={styles.savedText}>Saved</p>}
      </form>
    </main>
  );
}
