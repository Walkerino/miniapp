import { useMemo, useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from 'components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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

type StatusFilter = 'all' | 'pending' | 'active' | 'disabled';

type MiniAppListViewProps = {
  items: MiniappCardData[];
  onCreate: () => void;
  onDelete: (ids: string[]) => void | Promise<void>;
  onEdit: (id: string) => void;
  onPreview: (id: string) => string | null | Promise<string | null>;
  onLaunch: (id: string) => void | Promise<void>;
  onRename: (id: string, title: string, description: string) => void | Promise<void>;
  onToggleFavorite: (id: string) => void | Promise<void>;
};

export function MiniAppListView({
  items,
  onCreate,
  onDelete,
  onEdit,
  onPreview,
  onLaunch,
  onRename,
  onToggleFavorite,
}: MiniAppListViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const visibleItems = useMemo(() => {
    const filteredItems =
      statusFilter === 'all'
        ? items
        : items.filter((item) => item.status === statusFilter);

    return [...filteredItems].sort((first, second) => {
      if (first.is_favorite === second.is_favorite) {
        return 0;
      }

      return first.is_favorite ? -1 : 1;
    });
  }, [items, statusFilter]);

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
                setStatusFilter(value as StatusFilter);
                setSelectedIds(new Set());
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
              </SelectContent>
            </Select>
            <Button type="button" variant={isSelectMode ? 'secondary' : 'outline'} onClick={toggleSelectMode}>
              {isSelectMode ? 'Cancel' : 'Select'}
            </Button>
            <Button type="button" onClick={onCreate}>
              <Plus />
              New MiniApp
            </Button>
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
                onRename={onRename}
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
      </div>
    </section>
  );
}
