import { useMemo, useState, type FormEvent, type ReactNode } from 'react';

import {
  AppWindow,
  Cable,
  CheckCircle2,
  Copy,
  ExternalLink,
  Heart,
  PauseCircle,
  PlayCircle,
  Settings,
} from 'lucide-react';

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
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import type { MiniappCardData } from 'entities/miniapp';
import { cn } from 'shared/lib/utils';

type MiniAppProps = {
  isAdmin: boolean;
  isSelectMode: boolean;
  isSelected: boolean;
  isStatusUpdating: boolean;
  miniapp: MiniappCardData;
  onLaunch: (id: string) => void | Promise<void>;
  onPreview: (id: string) => string | null | Promise<string | null>;
  onUpdateDetails: (id: string, title: string, description: string, url: string) => void | Promise<void>;
  onSelect: (checked: boolean) => void;
  onStatusAction: (id: string, action: 'publish' | 'disable' | 'enable') => void | Promise<void>;
  onToggleFavorite: (id: string) => void | Promise<void>;
};

type StatusActionConfig = {
  action: 'publish' | 'disable' | 'enable';
  label: string;
  icon: typeof CheckCircle2;
  variant: 'default' | 'outline' | 'secondary';
};

const statusVariants = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border-stone-200 bg-stone-100 text-stone-600',
  deleted: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<MiniappCardData['status'], string>;

const miniappCoverPaths = [
  '/miniapp-covers/cover-1.png',
  '/miniapp-covers/cover-2.png',
  '/miniapp-covers/cover-3.png',
  '/miniapp-covers/cover-4.png',
  '/miniapp-covers/cover-5.png',
  '/miniapp-covers/cover-6.png',
  '/miniapp-covers/cover-7.png',
  '/miniapp-covers/cover-8.png',
];

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function getMiniappCoverPath(id: string) {
  const hash = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return miniappCoverPaths[hash % miniappCoverPaths.length];
}

function highlightCodeLine(line: string, lineIndex: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenRegex = /(<\/?[\w-]+|\/?>|[\w:-]+(?==)|"[^"]*"|=)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line))) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    const className =
      token.startsWith('<') || token === '>' || token === '/>'
        ? 'text-sky-400'
        : token.startsWith('"')
          ? 'text-emerald-300'
          : token === '='
            ? 'text-slate-400'
            : 'text-violet-300';

    nodes.push(
      <span key={`${lineIndex}-${match.index}`} className={className}>
        {token}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }

  return nodes;
}

function SnippetBlock({
  code,
  copied,
  label,
  onCopy,
}: {
  code: string;
  copied: boolean;
  label: string;
  onCopy: () => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {copied && <span className="text-xs text-muted-foreground">Copied</span>}
      </div>
      <div className="relative overflow-hidden rounded-md border bg-slate-950 text-slate-100">
        <Button
          aria-label={`Copy ${label} code`}
          className="absolute right-2 top-2 bg-slate-900/85 text-slate-100 hover:bg-slate-800 hover:text-white"
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={onCopy}
        >
          <Copy />
        </Button>
        <pre className="m-0 whitespace-pre-wrap break-words p-4 pr-12 font-mono text-xs leading-5">
          <code>
            {code.split('\n').map((line, index) => (
              <span key={index}>
                {highlightCodeLine(line, index)}
                {index < code.split('\n').length - 1 ? '\n' : null}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export const MiniApp = ({
  isAdmin,
  isSelectMode,
  isSelected,
  isStatusUpdating,
  miniapp,
  onLaunch,
  onPreview,
  onUpdateDetails,
  onSelect,
  onStatusAction,
  onToggleFavorite,
}: MiniAppProps) => {
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<'iframe' | 'webview' | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    title: miniapp.title,
    description: miniapp.description ?? '',
    url: miniapp.url,
  });

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

  const iframeCode = defaultIframeCode;
  const webviewCode = defaultWebviewCode;
  const coverPath = useMemo(() => getMiniappCoverPath(miniapp.id), [miniapp.id]);
  const isActive = miniapp.status === 'active';
  const statusAction: StatusActionConfig | null =
    miniapp.status === 'pending'
      ? { action: 'publish', label: 'Publish', icon: CheckCircle2, variant: 'default' }
      : miniapp.status === 'active'
        ? { action: 'disable', label: 'Disable', icon: PauseCircle, variant: 'outline' }
        : miniapp.status === 'disabled'
          ? { action: 'enable', label: 'Enable', icon: PlayCircle, variant: 'secondary' }
          : null;
  const StatusActionIcon = statusAction?.icon;

  function launchMiniapp() {
    if (!isActive) {
      return;
    }

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

  async function copyCode(type: 'iframe' | 'webview', code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedSnippet(type);
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = settingsForm.title.trim();
    const description = settingsForm.description.trim();
    const url = settingsForm.url.trim();

    if (!title || !url) {
      return;
    }

    void onUpdateDetails(miniapp.id, title, description, url);
    setIsSettingsOpen(false);
  }

  function updateStatus(action: StatusActionConfig['action']) {
    void onStatusAction(miniapp.id, action);
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
        <div className="aspect-video overflow-hidden rounded-md border bg-muted/50">
          <img
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            src={coverPath}
          />
        </div>
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-2 border-t pt-4">
        <div className="flex gap-1">
          <Dialog open={isIntegrationOpen} onOpenChange={setIsIntegrationOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Open integration snippets" size="icon-sm" type="button" variant="ghost">
                <Cable />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Integration</DialogTitle>
                <DialogDescription>
                  {miniapp.description || 'Embed snippets for this miniapp.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <SnippetBlock
                  code={iframeCode}
                  copied={copiedSnippet === 'iframe'}
                  label="iframe"
                  onCopy={() => void copyCode('iframe', iframeCode)}
                />

                <SnippetBlock
                  code={webviewCode}
                  copied={copiedSnippet === 'webview'}
                  label="webview"
                  onCopy={() => void copyCode('webview', webviewCode)}
                />
              </div>

              <DialogFooter className="items-center sm:justify-between">
                <p className="truncate text-sm text-muted-foreground">{miniapp.url}</p>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
          {isAdmin && statusAction && StatusActionIcon && (
            <Button
              disabled={isStatusUpdating}
              size="sm"
              type="button"
              variant={statusAction.variant}
              onClick={() => updateStatus(statusAction.action)}
            >
              <StatusActionIcon />
              {isStatusUpdating ? 'Updating' : statusAction.label}
            </Button>
          )}
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
            <Button
              disabled={!isActive}
              size="sm"
              title={isActive ? undefined : 'Preview is available after activation'}
              type="button"
              variant="outline"
              onClick={() => void previewMiniapp()}
            >
              <AppWindow />
              Preview
            </Button>
            <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 p-0 sm:max-w-6xl">
              <DialogHeader className="px-6 pb-4 pt-6">
                <DialogTitle>{miniapp.title}</DialogTitle>
                <DialogDescription>Preview runs through launch URL with a temporary token.</DialogDescription>
              </DialogHeader>

              <div className="border-y bg-muted/30">
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
                    className="block h-[min(720px,calc(100svh-13rem))] w-full bg-background"
                    src={previewUrl}
                    title={miniapp.title}
                    sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
                )}
              </div>

              <DialogFooter className="items-center px-6 pb-6 pt-4 sm:justify-between">
                <p className="max-w-full truncate text-sm text-muted-foreground">
                  {previewUrl ?? miniapp.url}
                </p>
                <Button disabled={!previewUrl || !isActive} type="button" variant="outline" onClick={launchMiniapp}>
                  <ExternalLink />
                  Open tab
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                aria-label="Open miniapp settings"
                size="icon-sm"
                type="button"
                variant="outline"
                onClick={() =>
                  setSettingsForm({
                    title: miniapp.title,
                    description: miniapp.description ?? '',
                    url: miniapp.url,
                  })
                }
              >
                <Settings />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form className="grid gap-5" onSubmit={saveSettings}>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>Update the miniapp name, description, and URL.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`settings-title-${miniapp.id}`}>App name</Label>
                    <Input
                      id={`settings-title-${miniapp.id}`}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, title: event.target.value }))
                      }
                      required
                      value={settingsForm.title}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`settings-description-${miniapp.id}`}>Description</Label>
                    <Input
                      id={`settings-description-${miniapp.id}`}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, description: event.target.value }))
                      }
                      value={settingsForm.description}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`settings-url-${miniapp.id}`}>URL</Label>
                    <Input
                      id={`settings-url-${miniapp.id}`}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, url: event.target.value }))
                      }
                      required
                      type="url"
                      value={settingsForm.url}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardFooter>
    </Card>
  );
};
