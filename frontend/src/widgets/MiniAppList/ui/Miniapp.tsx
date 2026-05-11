import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { MiniappCardData } from 'entities/miniapp';
import infoIcon from 'shared/ui/img/info.svg';
import loveIcon from 'shared/ui/img/love.svg';
import playIcon from 'shared/ui/img/play.svg';
import unloveIcon from 'shared/ui/img/unlove.svg';

import styles from './styles.module.css';

type MiniAppProps = {
  miniapp: MiniappCardData;
  onEdit: () => void;
  onToggleFavorite: (id: string) => void;
};

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export const MiniApp = ({ miniapp, onEdit, onToggleFavorite }: MiniAppProps) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const defaultIframeCode = useMemo(() => {
    return `<iframe src="${escapeAttribute(miniapp.url)}" title="${escapeAttribute(
      miniapp.title
    )}" width="100%" height="640" loading="lazy"></iframe>`;
  }, [miniapp.title, miniapp.url]);

  const defaultWebviewCode = useMemo(() => {
    return `<webview src="${escapeAttribute(miniapp.url)}"></webview>`;
  }, [miniapp.url]);

  const [iframeCode, setIframeCode] = useState(defaultIframeCode);
  const [webviewCode, setWebviewCode] = useState(defaultWebviewCode);

  useEffect(() => {
    setIframeCode(defaultIframeCode);
    setWebviewCode(defaultWebviewCode);
  }, [defaultIframeCode, defaultWebviewCode]);

  function stopCardClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function openInfo(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setIsInfoOpen(true);
  }

  function toggleFavorite(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggleFavorite(miniapp.id);
  }

  function launchMiniapp(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
  }

  return (
    <article
      className={styles.card}
      data-miniapp-id={miniapp.id}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onEdit();
        }
      }}
    >
      <h2 className={styles.title}>{miniapp.title}</h2>

      <div className={styles.preview}>
        <button
          className={`${styles.iconButton} ${styles.infoButton}`}
          type="button"
          onClick={openInfo}
          aria-label="Open info"
          title="Info"
        >
          <img src={infoIcon} alt="" />
        </button>

        <button
          className={`${styles.iconButton} ${styles.favoriteButton}`}
          type="button"
          onClick={toggleFavorite}
          aria-label={miniapp.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
          title={miniapp.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <img src={miniapp.is_favorite ? loveIcon : unloveIcon} alt="" />
        </button>

        <button
          className={`${styles.iconButton} ${styles.playButton}`}
          type="button"
          onClick={launchMiniapp}
          aria-label="Launch miniapp"
          title="Launch"
        >
          <img src={playIcon} alt="" />
        </button>
      </div>

      {isInfoOpen && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`miniapp-title-${miniapp.id}`}
          onClick={stopCardClick}
        >
          <button
            className={styles.modalBackdrop}
            type="button"
            aria-label="Close modal"
            onClick={() => setIsInfoOpen(false)}
          />

          <div className={styles.modalContent}>
            <button
              className={styles.modalClose}
              type="button"
              onClick={() => setIsInfoOpen(false)}
              aria-label="Close modal"
            >
              x
            </button>

            <h2 id={`miniapp-title-${miniapp.id}`} className={styles.modalTitle}>
              {miniapp.title}
            </h2>
            {miniapp.description && (
              <p className={styles.modalDescription}>{miniapp.description}</p>
            )}

            <div className={styles.codeRow}>
              <textarea
                className={styles.code}
                value={iframeCode}
                onChange={(event) => {
                  setIframeCode(event.target.value);
                  setIsCopied(false);
                }}
              />
              <button type="button" onClick={() => void copyCode(iframeCode)}>
                Copy iframe
              </button>
            </div>

            <div className={styles.codeRow}>
              <textarea
                className={styles.code}
                value={webviewCode}
                onChange={(event) => {
                  setWebviewCode(event.target.value);
                  setIsCopied(false);
                }}
              />
              <button type="button" onClick={() => void copyCode(webviewCode)}>
                Copy webview
              </button>
            </div>

            {isCopied && <p className={styles.copied}>Copied</p>}
          </div>
        </div>
      )}
    </article>
  );
};
