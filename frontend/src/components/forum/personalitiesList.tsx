import React, { useState } from 'react';
import { useInfinitePersonalities } from '@/hooks/usePersonalities';
import { useDialog } from '@/hooks/useDialog';
import { Dialog } from '@/components/common/Dialog';
import PersonalityCard from './PersonalityCard';
import CreatePersonalityModal from './CreatePersonalityModal';
import EditPersonalityModal from './EditPersonalityModal';
import { SearchInput } from '@/components/common/SearchInput';
import InfiniteScrollTrigger from '@/components/common/InfiniteScroll';
import { SortDropdown } from '@/components/common/SortDropdown';
import { useDeletePersonality } from '@/hooks/usePersonalities';
import type { Personality } from '@/types/personalities';

interface PersonalitiesListProps {
  orgSlug: string;
  canModerateOrg?: boolean;
}

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'created_at', order: 'desc' as const },
  { label: 'Oldest First', value: 'created_at', order: 'asc' as const },
  { label: 'Highest Rated', value: 'average_review', order: 'desc' as const },
  { label: 'Lowest Rated', value: 'average_review', order: 'asc' as const },
  { label: 'Most Reviews', value: 'total_reviews', order: 'desc' as const },
  { label: 'Fewest Reviews', value: 'total_reviews', order: 'asc' as const },
  { label: 'Name (A-Z)', value: 'name', order: 'asc' as const },
  { label: 'Name (Z-A)', value: 'name', order: 'desc' as const },
];

export const PersonalitiesList: React.FC<PersonalitiesListProps> = ({ orgSlug, canModerateOrg = false }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const { dialog, confirm, alert, close } = useDialog();

  const { items, loading, error, hasMore, loadMore, refetch } = useInfinitePersonalities({
    orgSlug,
    search,
    sort,
    order,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<Personality | null>(null);

  const { deletePersonality } = useDeletePersonality();

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort);
    setOrder(newOrder);
  };

  const handleEdit = (p: Personality) => {
    setSelected(p);
    setIsEditOpen(true);
  };

  const handleDelete = async (p: Personality) => {
    const confirmed = await confirm('Delete Personality', `Delete "${p.name}"?`);
    if (!confirmed) return;
    try {
      await deletePersonality(orgSlug, p.slug);
      refetch();
    } catch (err: any) {
      await alert('Error', err?.message || 'Failed to delete personality');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Personalities ({items.length})</h2>
        <button onClick={() => setIsCreateOpen(true)} className="btn-primary">Create Personality</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search personalities..." />
        </div>
        <SortDropdown options={SORT_OPTIONS} currentSort={sort} currentOrder={order} onChange={handleSortChange} />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4 divide-y divide-light-border dark:divide-dark-border">
        {items.map((p) => (
          <div key={p.id} className="py-3">
            <PersonalityCard
              personality={p}
              orgSlug={orgSlug}
              canModerateOrg={!!canModerateOrg}
              onEdit={handleEdit}
              onDelete={() => handleDelete(p)}
            />
          </div>
        ))}
      </div>

      {loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading personalities...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">{search ? 'No personalities found.' : 'No personalities yet.'}</p>
        </div>
      )}

      {hasMore && !loading && <InfiniteScrollTrigger onVisible={loadMore} />}

      {loading && items.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Loading more...</p>
        </div>
      )}

      <CreatePersonalityModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} orgSlug={orgSlug} />

      <Dialog
        dialog={dialog}
        onConfirm={() => {
          dialog.onConfirm?.();
        }}
        onCancel={() => {
          dialog.onCancel?.();
        }}
      />

      <EditPersonalityModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setSelected(null); }} orgSlug={orgSlug} personality={selected} />
    </div>
  );
};

export default PersonalitiesList;
