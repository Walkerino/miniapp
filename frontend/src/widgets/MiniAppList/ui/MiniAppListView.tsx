import { useMemo, useState, type FormEvent } from 'react';

import { Plus, Trash2 } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { miniappCategories } from 'entities/miniapp';
import type { MiniappCardData, MiniappCategory } from 'entities/miniapp';
import { MiniApp } from 'widgets/MiniAppList/ui/Miniapp';

type StatusFilter = 'all' | MiniappCardData['status'];
type CategoryFilter = 'all' | MiniappCategory;

type CreateMiniAppData = {
  title: string;
  description: string;
  url: string;
  category: MiniappCategory;
};

type MiniAppListViewProps = {
  hasMore: boolean;
  isAdmin: boolean;
  isLoadingMore: boolean;
  items: MiniappCardData[];
  onCreate: (
    title: string,
    description: string,
    url: string,
    category: MiniappCategory
  ) => boolean | Promise<boolean>;
  onDelete: (ids: string[]) => void | Promise<void>;
  onPreview: (id: string) => string | null | Promise<string | null>;
  onLaunch: (id: string) => void | Promise<void>;
  onLoadMore: () => void | Promise<void>;
  onUpdateDetails: (
    id: string,
    title: string,
    description: string,
    url: string,
    category: MiniappCategory
  ) => void | Promise<void>;
  onStatusAction: (id: string, action: 'publish' | 'disable' | 'enable') => void | Promise<void>;
  onStatusFilterChange: (status: StatusFilter) => void | Promise<void>;
  isStatusUpdating: (id: string) => boolean;
  getCreatorName: (id: string) => string;
  onToggleFavorite: (id: string) => void | Promise<void>;
  page: number;
  pageCount: number;
  statusFilter: StatusFilter;
  total: number;
};

export function MiniAppListView({
  hasMore,
  isAdmin,
  isLoadingMore,
  items,
  onCreate,
  onDelete,
  onPreview,
  onLaunch,
  onLoadMore,
  onUpdateDetails,
  onStatusAction,
  onStatusFilterChange,
  isStatusUpdating,
  getCreatorName,
  onToggleFavorite,
  page,
  pageCount,
  statusFilter,
  total,
}: MiniAppListViewProps) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMiniApp, setNewMiniApp] = useState<CreateMiniAppData>({
    title: '',
    description: '',
    url: '',
    category: miniappCategories[0],
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const visibleItems = useMemo(() => {
    const roleItems = isAdmin ? items : items.filter((item) => item.status !== 'deleted');
    const statusItems =
      statusFilter === 'all'
        ? roleItems
        : roleItems.filter((item) => item.status === statusFilter);
    const filteredItems =
      categoryFilter === 'all'
        ? statusItems
        : statusItems.filter((item) => item.category === categoryFilter);

    return [...filteredItems].sort((first, second) => {
      if (first.is_favorite === second.is_favorite) {
        return 0;
      }

      return first.is_favorite ? -1 : 1;
    });
  }, [categoryFilter, isAdmin, items, statusFilter]);

  const selectedCount = selectedIds.size;

  function toggleSelectMode() {
    setIsSelectMode((current) => !current);
    setSelectedIds(new Set());
  }

  function toggleItemSelection(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }

  function deleteSelected() {
    void onDelete([...selectedIds]);
    setSelectedIds(new Set());
    setIsSelectMode(false);
  }

  async function createMiniApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newMiniApp.title.trim();
    const description = newMiniApp.description.trim();
    const url = newMiniApp.url.trim();
    const category = newMiniApp.category;

    if (!title || !description || !url) {
      return;
    }

    const isCreated = await onCreate(title, description, url, category);

    if (!isCreated) {
      return;
    }

    setNewMiniApp({ title: '', description: '', url: '', category: miniappCategories[0] });
    setCategoryFilter('all');
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setIsCreateOpen(false);
  }

  return (
    <section className="dashboard-shell min-h-[calc(100svh-20px)] md:h-[calc(100svh-48px)] md:overflow-hidden">
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="grid-cols-1 gap-4 px-0 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <CardTitle className="text-2xl tracking-normal">MiniApps</CardTitle>
            <CardDescription className="mt-2">
              Manage miniapps, launch them, and copy embed snippets.
            </CardDescription>
          </div>
          <CardAction className="col-start-1 row-span-1 row-start-2 flex w-full flex-wrap justify-start gap-2 self-start justify-self-stretch sm:col-start-2 sm:row-start-1 sm:w-auto sm:justify-end sm:justify-self-end max-sm:[&>*]:min-w-0 max-sm:[&>*]:flex-1">
            {selectedCount > 0 && (
              <Button type="button" variant="destructive" onClick={deleteSelected}>
                <Trash2 />
                Delete {selectedCount}
              </Button>
            )}
            <Select
              onValueChange={(value) => {
                const nextStatusFilter = value as StatusFilter;
                setSelectedIds(new Set());
                void onStatusFilterChange(nextStatusFilter);
              }}
              value={statusFilter}
            >
              <SelectTrigger aria-label="Filter by status" className="w-full sm:w-[156px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                {isAdmin && <SelectItem value="deleted">Deleted</SelectItem>}
              </SelectContent>
            </Select>
            <Button type="button" variant={isSelectMode ? 'secondary' : 'outline'} onClick={toggleSelectMode}>
              {isSelectMode ? 'Cancel' : 'Select'}
            </Button>
            {!isAdmin && (
              <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="max-sm:w-full" type="button">
                    <Plus />
                    New MiniApp
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form className="grid gap-5" onSubmit={createMiniApp}>
                    <DialogHeader>
                      <DialogTitle>Create MiniApp</DialogTitle>
                      <DialogDescription>
                        Enter the miniapp details to add it to the dashboard.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-list-name">App name</Label>
                        <Input
                          id="miniapp-list-name"
                          onChange={(event) =>
                            setNewMiniApp((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="Customer Portal"
                          required
                          value={newMiniApp.title}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-list-description">Description</Label>
                        <Input
                          id="miniapp-list-description"
                          onChange={(event) =>
                            setNewMiniApp((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Short description"
                          required
                          value={newMiniApp.description}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-list-url">App URL</Label>
                        <Input
                          id="miniapp-list-url"
                          onChange={(event) =>
                            setNewMiniApp((current) => ({ ...current, url: event.target.value }))
                          }
                          placeholder="https://example.com"
                          required
                          type="url"
                          value={newMiniApp.url}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="miniapp-list-category">Category</Label>
                        <Select
                          onValueChange={(value) =>
                            setNewMiniApp((current) => ({
                              ...current,
                              category: value as MiniappCategory,
                            }))
                          }
                          value={newMiniApp.category}
                        >
                          <SelectTrigger id="miniapp-list-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {miniappCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button className="bg-black text-white hover:bg-black/90" type="submit">
                        Create
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardAction>
          <div className="col-span-full row-start-3 flex flex-wrap gap-2 sm:row-start-2">
            <Button
              className="max-sm:flex-1"
              size="sm"
              type="button"
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setCategoryFilter('all');
                setSelectedIds(new Set());
              }}
            >
              All
            </Button>
            {miniappCategories.map((category) => (
              <Button
                className="max-sm:flex-1"
                key={category}
                size="sm"
                type="button"
                variant={categoryFilter === category ? 'default' : 'outline'}
                onClick={() => {
                  setCategoryFilter(category);
                  setSelectedIds(new Set());
                }}
              >
                {category}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <div className="min-h-0 flex-1 pr-0 md:overflow-y-auto md:pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4">
          {visibleItems.length > 0 ? (
            visibleItems.map((miniapp) => (
              <MiniApp
                key={miniapp.id}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(miniapp.id)}
                isAdmin={isAdmin}
                isStatusUpdating={isStatusUpdating(miniapp.id)}
                miniapp={miniapp}
                creatorName={getCreatorName(miniapp.created_by)}
                onLaunch={onLaunch}
                onPreview={onPreview}
                onUpdateDetails={onUpdateDetails}
                onSelect={(checked) => toggleItemSelection(miniapp.id, checked)}
                onStatusAction={onStatusAction}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          ) : (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No miniapps found for these filters.
              </CardContent>
            </Card>
          )}
        </div>

        {pageCount > 1 && (
          <CardFooter className="mt-4 flex-wrap justify-between gap-3 border-t px-0 pt-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Page {page}</span> of {pageCount}
              {' - '}
              {items.length} of {total} loaded
            </p>
            <Button
              disabled={!hasMore || isLoadingMore}
              onClick={() => void onLoadMore()}
              type="button"
              variant="outline"
            >
              {isLoadingMore ? 'Loading...' : hasMore ? 'Load more' : 'All loaded'}
            </Button>
          </CardFooter>
        )}
      </div>
    </section>
  );
}
