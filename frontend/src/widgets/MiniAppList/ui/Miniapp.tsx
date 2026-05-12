import { useEffect, useMemo, useRef, useState } from 'react';

import { AppWindow, Code2, Copy, ExternalLink, Heart, Info, Pencil } from 'lucide-react';

import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { Checkbox } from 'components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'components/ui/dialog';
import { sessionStore } from 'entities/session';
import type { MiniappCardData } from 'entities/miniapp';
import { cn } from 'shared/lib/utils';

type MiniAppProps = {
  isSelectMode: boolean;
  isSelected: boolean;
  miniapp: MiniappCardData;
  onEdit: () => void;
  onLaunch: (id: string) => void | Promise<void>;
  onPreview: (id: string) => string | null | Promise<string | null>;
  onSelect: (checked: boolean) => void;
  onToggleFavorite: (id: string) => void | Promise<void>;
};

const statusVariants = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border-stone-200 bg-stone-100 text-stone-600',
  deleted: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<MiniappCardData['status'], string>;

const miniappContextMessageTypes = new Set([
  'MINIAPP_READY',
  'MINIAPP_CONTEXT_REQUESTED',
  'miniapp:ready',
  'miniapp:context-requested',
]);

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export const MiniApp = ({
  isSelectMode,
  isSelected,
  miniapp,
  onEdit,
  onLaunch,
  onPreview,
  onSelect,
  onToggleFavorite,
}: MiniAppProps) => {
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isActive = miniapp.status === 'active';

  const defaultIframeCode = useMemo(() => {
    return `<iframe
  src="${escapeAttribute(miniapp.url)}"
  title="${escapeAttribute(miniapp.title)}"
  width="100%"
  height="640"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
  allow="clipboard-read; clipboard-write"
  style="width:100%;height:640px;border:0;border-radius:8px;"
></iframe>`;
  }, [miniapp.title, miniapp.url]);

  const defaultWebviewCode = useMemo(() => {
    return `<webview
  src="${escapeAttribute(miniapp.url)}"
  style="width:100%;height:640px;border:0;"
  allowpopups
></webview>`;
  }, [miniapp.url]);

  const [iframeCodeOverride, setIframeCodeOverride] = useState<string | null>(null);
  const [webviewCodeOverride, setWebviewCodeOverride] = useState<string | null>(null);
  const iframeCode = iframeCodeOverride ?? defaultIframeCode;
  const webviewCode = webviewCodeOverride ?? defaultWebviewCode;
  function getHostContext() {
    const user = sessionStore.user;

    if (!user) {
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      miniapp: {
        id: miniapp.id,
        title: miniapp.title,
      },
      expires_at: null,
    };
  }

  function postContextToPreview() {
    const context = getHostContext();

    if (!previewIframeRef.current?.contentWindow || !context) {
      return;
    }

    previewIframeRef.current.contentWindow.postMessage(
      {
        type: 'MINIAPP_CONTEXT',
        payload: context,
      },
      '*'
    );
  }

  useEffect(() => {
    if (!isPreviewOpen || !previewUrl) {
      return undefined;
    }

    function handleMessage(event: MessageEvent) {
      const message = event.data;
      const isPreviewSource =
        event.source === previewIframeRef.current?.contentWindow ||
        message?.source === 'miniapp-platform-widget';

      if (!isPreviewSource) {
        return;
      }

      if (!message || typeof message !== 'object') {
        return;
      }

      if (miniappContextMessageTypes.has(String(message.type))) {
        postContextToPreview();
      }
    }

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [isPreviewOpen, previewUrl]);

  useEffect(() => {
    if (!isPreviewOpen || !previewUrl) {
      return undefined;
    }

    const retryDelays = [0, 100, 300, 700, 1200, 2000];
    const timers = retryDelays.map((delay) =>
      window.setTimeout(postContextToPreview, delay)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isPreviewOpen, previewUrl]);

  function launchMiniapp() {
    void onLaunch(miniapp.id);
  }

  async function previewMiniapp() {
    setIsPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewError(null);

    if (miniapp.status !== 'active') {
      setPreviewError('Preview requires active status.');
      return;
    }

    setIsPreviewLoading(true);
    const launchUrl = await onPreview(miniapp.id);
    setIsPreviewLoading(false);

    if (!launchUrl) {
      setPreviewError('Failed to prepare preview.');
      return;
    }

    setPreviewUrl(launchUrl);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
  }

  return (
    <Card data-miniapp-id={miniapp.id} className="overflow-hidden">
      <CardHeader>
        <div className="flex min-w-0 gap-3">
          {isSelectMode && (
            <Checkbox
              aria-label={`Select ${miniapp.title}`}
              checked={isSelected}
              className="mt-0.5"
              onCheckedChange={(checked) => onSelect(checked === true)}
            />
          )}
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{miniapp.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2 min-h-10">
              {miniapp.description || 'No description'}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge className={cn('capitalize', statusVariants[miniapp.status])} variant="outline">
            {miniapp.status}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="flex aspect-video items-center justify-center rounded-md border bg-muted/50">
          <Code2 className="size-9 text-muted-foreground" />
        </div>
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-2 border-t pt-4">
        <div className="flex gap-1">
          {isActive && (
            <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <DialogTrigger asChild>
                <Button aria-label="Open info" size="icon-sm" type="button" variant="ghost">
                  <Info />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{miniapp.title}</DialogTitle>
                  <DialogDescription>
                    {miniapp.description || 'Embed snippets for this miniapp.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">iframe</span>
                      <Button size="sm" type="button" variant="outline" onClick={() => void copyCode(iframeCode)}>
                        <Copy />
                        Copy
                      </Button>
                    </div>
                    <textarea
                      className="min-h-24 resize-y rounded-md border bg-muted/40 p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={iframeCode}
                      onChange={(event) => {
                        setIframeCodeOverride(event.target.value);
                        setIsCopied(false);
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">webview</span>
                      <Button size="sm" type="button" variant="outline" onClick={() => void copyCode(webviewCode)}>
                        <Copy />
                        Copy
                      </Button>
                    </div>
                    <textarea
                      className="min-h-20 resize-y rounded-md border bg-muted/40 p-3 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={webviewCode}
                      onChange={(event) => {
                        setWebviewCodeOverride(event.target.value);
                        setIsCopied(false);
                      }}
                    />
                  </div>
                </div>

                <DialogFooter className="items-center sm:justify-between">
                  <p className="truncate text-sm text-muted-foreground">{isCopied ? 'Copied' : miniapp.url}</p>
                  <Button type="button" onClick={launchMiniapp}>
                    <ExternalLink />
                    Launch
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Button
            aria-label={miniapp.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => void onToggleFavorite(miniapp.id)}
          >
            <Heart className={cn(miniapp.is_favorite && 'fill-red-500 text-red-500')} />
          </Button>
        </div>

        <div className="flex flex-wrap justify-end gap-1">
          {isActive && (
            <>
              <Dialog
                open={isPreviewOpen}
                onOpenChange={(open) => {
                  setIsPreviewOpen(open);

                  if (!open) {
                    setPreviewUrl(null);
                    setPreviewError(null);
                    setIsPreviewLoading(false);
                  }
                }}
              >
                <Button size="sm" type="button" variant="outline" onClick={() => void previewMiniapp()}>
                  <AppWindow />
                  Preview
                </Button>
                <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-6xl">
                  <DialogHeader className="min-w-0 px-6 pb-4 pt-6">
                    <DialogTitle>{miniapp.title}</DialogTitle>
                    <DialogDescription>Preview runs through launch URL with a temporary token.</DialogDescription>
                  </DialogHeader>

                  <div className="min-w-0 border-y bg-muted/30">
                    {isPreviewLoading && (
                      <div className="flex h-[min(720px,calc(100svh-13rem))] items-center justify-center text-sm text-muted-foreground">
                        Preparing preview...
                      </div>
                    )}

                    {previewError && (
                      <div className="flex h-[min(720px,calc(100svh-13rem))] items-center justify-center px-6 text-center text-sm text-destructive">
                        {previewError}
                      </div>
                    )}

                    {previewUrl && !isPreviewLoading && !previewError && (
                      <iframe
                        ref={previewIframeRef}
                        className="block h-[min(720px,calc(100svh-13rem))] w-full max-w-full bg-background"
                        src={previewUrl}
                        title={miniapp.title}
                        onLoad={postContextToPreview}
                        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                      />
                    )}
                  </div>

                  <DialogFooter className="min-w-0 items-center px-6 pb-6 pt-4 sm:justify-between">
                    <p className="min-w-0 max-w-full flex-1 truncate text-sm text-muted-foreground">
                      {previewUrl ?? miniapp.url}
                    </p>
                    <Button disabled={!previewUrl} type="button" variant="outline" onClick={launchMiniapp}>
                      <ExternalLink />
                      Open tab
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button aria-label="Launch miniapp" size="icon-sm" type="button" variant="ghost" onClick={launchMiniapp}>
                <ExternalLink />
              </Button>
            </>
          )}
          <Button aria-label="Edit miniapp" size="icon-sm" type="button" variant="ghost" onClick={onEdit}>
            <Pencil />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
