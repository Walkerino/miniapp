import { useMemo, useState } from 'react';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import type { MiniappCardData } from 'entities/miniapp';
import { MiniApp } from 'widgets/MiniAppList/ui/Miniapp';

type StatusFilter = 'all' | MiniappCardData['status'];

type MiniAppListViewProps = {
  hasMore: boolean;
  isAdmin: boolean;
  isLoadingMore: boolean;
  items: MiniappCardData[];
  onCreate: () => void;
  onDelete: (ids: string[]) => void | Promise<void>;
  onEdit: (id: string) => void;
  onLoadMore: () => void | Promise<void>;
  onPreview: (id: string) => string | null | Promise<string | null>;
  onLaunch: (id: string) => void | Promise<void>;
  onStatusFilterChange: (status: StatusFilter) => void | Promise<void>;
  onToggleFavorite: (id: string) => void | Promise<void>;
  page: number;
  pageCount: number;
  total: number;
};

export function MiniAppListView({
  hasMore,
  isAdmin,
  isLoadingMore,
  items,
  onCreate,
  onDelete,
  onEdit,
  onLoadMore,
  onPreview,
  onLaunch,
  onStatusFilterChange,
  onToggleFavorite,
  page,
  pageCount,
  total,
}: MiniAppListViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const visibleItems = useMemo(() => {
    const roleItems = isAdmin ? items : items.filter((item) => item.status !== 'deleted');
    const filteredItems =
      statusFilter === 'all'
        ? roleItems
        : roleItems.filter((item) => item.status === statusFilter);

    return [...filteredItems].sort((first, second) => {
      if (first.is_favorite === second.is_favorite) {
        return 0;
      }

      return first.is_favorite ? -1 : 1;
    });
  }, [isAdmin, items, statusFilter]);

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

  return (
    <section className="dashboard-shell h-[calc(100svh-48px)] overflow-hidden">
      <Card className="border-0 bg-transparent p-0 shadow-none">
        <CardHeader className="gap-4 px-0">
          <div>
            <CardTitle className="text-2xl tracking-normal">MiniApps</CardTitle>
            <CardDescription className="mt-2">
              Manage miniapps, launch them, and copy embed snippets.
            </CardDescription>
          </div>
          <CardAction className="flex flex-wrap justify-end gap-2">
            {selectedCount > 0 && (
              <Button type="button" variant="destructive" onClick={deleteSelected}>
                <Trash2 />
                Delete {selectedCount}
              </Button>
            )}
            <Select
              onValueChange={(value) => {
                const nextStatusFilter = value as StatusFilter;
                setStatusFilter(nextStatusFilter);
                setSelectedIds(new Set());
                void onStatusFilterChange(nextStatusFilter);
              }}
              value={statusFilter}
            >
              <SelectTrigger aria-label="Filter by status" className="w-[156px]">
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
              <Button type="button" onClick={onCreate}>
                <Plus />
                New MiniApp
              </Button>
            )}
          </CardAction>
        </CardHeader>
      </Card>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {visibleItems.length > 0 ? (
            visibleItems.map((miniapp) => (
              <MiniApp
                key={miniapp.id}
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(miniapp.id)}
                miniapp={miniapp}
                onEdit={() => onEdit(miniapp.id)}
                onLaunch={onLaunch}
                onPreview={onPreview}
                onSelect={(checked) => toggleItemSelection(miniapp.id, checked)}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          ) : (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No miniapps found for this status.
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
