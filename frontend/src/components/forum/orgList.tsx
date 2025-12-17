import React, { useState } from 'react';
import { useInfiniteOrgs } from '@/hooks/useOrgs';
import OrganizationCard from './orgCard';
import { SearchInput } from '@/components/common/SearchInput';
import InfiniteScrollTrigger from '@/components/common/InfiniteScroll';
import {SortDropdown} from '@/components/common/SortDropdown';

interface OrganizationListProps {
  onJoin?: (slug: string) => void;
  joiningSlug?: string | null;
}

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'created_at', order: 'desc' as const },
  { label: 'Oldest First', value: 'created_at', order: 'asc' as const },
  { label: 'Most Members', value: 'members_count', order: 'desc' as const },
  { label: 'Fewest Members', value: 'members_count', order: 'asc' as const },
  { label: 'Most Personalities', value: 'personalities_count', order: 'desc' as const },
  { label: 'Fewest Personalities', value: 'personalities_count', order: 'asc' as const },
  { label: 'Most Reviews', value: 'reviews_count', order: 'desc' as const },
  { label: 'Fewest Reviews', value: 'reviews_count', order: 'asc' as const },
  { label: 'Name (A-Z)', value: 'name', order: 'asc' as const },
  { label: 'Name (Z-A)', value: 'name', order: 'desc' as const },
];

export const OrgList: React.FC<OrganizationListProps> = ({
  onJoin,
  joiningSlug,
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const { items, loading, error, hasMore, loadMore } = useInfiniteOrgs({
    search,
    sort,
    order,
  });

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort);
    setOrder(newOrder);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search and Sort Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="w-full">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search organizations..."
          />
        </div>
        <SortDropdown
          options={SORT_OPTIONS}
          currentSort={sort}
          currentOrder={order}
          onChange={handleSortChange}
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Organizations List */}
      <div className="space-y-4 divide-y divide-light-border dark:divide-dark-border">
        {items.map((org) => (
          <div key={org.id} className="py-3">
            <OrganizationCard
              org={org}
              onJoin={onJoin}
              isJoining={joiningSlug === org.slug}
            />
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Loading organizations...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {search ? 'No organizations found matching your search.' : 'No organizations yet.'}
          </p>
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      {hasMore && !loading && (
        <InfiniteScrollTrigger onVisible={loadMore} />
      )}

      {/* Loading More Indicator */}
      {loading && items.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Loading more...
          </p>
        </div>
      )}
    </div>
  );
};