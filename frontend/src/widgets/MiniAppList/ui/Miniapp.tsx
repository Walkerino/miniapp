import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Code2, Copy, ExternalLink, Heart, Info, Pencil } from 'lucide-react';

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
  isSelectMode: boolean;
  isSelected: boolean;
  miniapp: MiniappCardData;
  onEdit: () => void;
  onLaunch: (id: string) => void | Promise<void>;
  onRename: (id: string, title: string, description: string) => void | Promise<void>;
  onSelect: (checked: boolean) => void;
  onToggleFavorite: (id: string) => void | Promise<void>;
};

const statusVariants = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disabled: 'border-stone-200 bg-stone-100 text-stone-600',
  deleted: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<MiniappCardData['status'], string>;

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export const MiniApp = ({
  isSelectMode,
  isSelected,
  miniapp,
  onEdit,
  onLaunch,
  onRename,
  onSelect,
  onToggleFavorite,
}: MiniAppProps) => {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [renameForm, setRenameForm] = useState({
    title: miniapp.title,
    description: miniapp.description ?? '',
  });

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

  useEffect(() => {
    if (!isRenameOpen) {
      setRenameForm({
        title: miniapp.title,
        description: miniapp.description ?? '',
      });
    }
  }, [isRenameOpen, miniapp.description, miniapp.title]);

  function launchMiniapp() {
    void onLaunch(miniapp.id);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
  }

  function saveRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = renameForm.title.trim();
    const description = renameForm.description.trim();

    if (!title) {
      return;
    }

    void onRename(miniapp.id, title, description);
    setIsRenameOpen(false);
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

      <CardFooter className="justify-between gap-2 border-t pt-4">
        <div className="flex gap-1">
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
                      setIframeCode(event.target.value);
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
                      setWebviewCode(event.target.value);
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

        <div className="flex gap-1">
          <Button aria-label="Launch miniapp" size="icon-sm" type="button" variant="ghost" onClick={launchMiniapp}>
            <ExternalLink />
          </Button>
          <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
            <DialogTrigger asChild>
              <Button aria-label="Rename miniapp" size="icon-sm" type="button" variant="outline">
                <Pencil />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form className="grid gap-5" onSubmit={saveRename}>
                <DialogHeader>
                  <DialogTitle>Rename MiniApp</DialogTitle>
                  <DialogDescription>Update the name and description for this miniapp.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`rename-title-${miniapp.id}`}>App name</Label>
                    <Input
                      id={`rename-title-${miniapp.id}`}
                      onChange={(event) =>
                        setRenameForm((current) => ({ ...current, title: event.target.value }))
                      }
                      required
                      value={renameForm.title}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`rename-description-${miniapp.id}`}>Description</Label>
                    <Input
                      id={`rename-description-${miniapp.id}`}
                      onChange={(event) =>
                        setRenameForm((current) => ({ ...current, description: event.target.value }))
                      }
                      value={renameForm.description}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button aria-label="Edit miniapp embed" size="icon-sm" type="button" variant="ghost" onClick={onEdit}>
            <Code2 />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
