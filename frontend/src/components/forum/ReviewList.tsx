import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDialog } from '@/hooks/useDialog';
import { Dialog } from '@/components/common/Dialog';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchReviews,
  deleteReview,
  selectPersonalityReviewsList,
  selectPersonalityReviews,
  selectIsDeleting,
  selectDeleteError,
} from '@/store/reviewSlice';
import { ReviewCard } from './ReviewCard';
import { SearchInput } from '@/components/common/SearchInput';
import { SortDropdown } from '@/components/common/SortDropdown';
import type { Review } from '@/types/reviews';

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest', order: 'desc' as const },
  { label: 'Oldest First', value: 'oldest', order: 'asc' as const },
  { label: 'Highest Rated', value: 'rating_desc', order: 'desc' as const },
  { label: 'Lowest Rated', value: 'rating_asc', order: 'asc' as const },
];

interface ReviewListProps {
  orgSlug: string;
  personalitySlug: string;
  personalityId: string;
  currentUserId?: string;
  onEditReview?: (review: Review) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  orgSlug,
  personalitySlug,
  personalityId,
  currentUserId,
  onEditReview,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { dialog, confirm, close } = useDialog();
  const reviews = useSelector((state: RootState) =>
    selectPersonalityReviewsList(state, personalityId)
  ) ?? [];
  const personalityData = useSelector((state: RootState) =>
    selectPersonalityReviews(state, personalityId)
  );

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSortChange = (newSort: string, newOrder: 'asc' | 'desc') => {
    setSort(newSort);
    dispatch(
      fetchReviews({
        orgSlug,
        personalitySlug,
        personalityId,
        params: {
          sort: newSort as 'newest' | 'oldest' | 'rating_desc' | 'rating_asc',
        },
      })
    );
  };

  useEffect(() => {
    dispatch(
      fetchReviews({
        orgSlug,
        personalitySlug,
        personalityId,
        params: {
          sort: sort as 'newest' | 'oldest' | 'rating_desc' | 'rating_asc',
        },
      })
    );
  }, [dispatch, orgSlug, personalitySlug, personalityId, sort]);

  // Client-side filtering by search
  const filteredReviews = reviews.filter((review) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (review.title?.toLowerCase().includes(q) ?? false) ||
      (review.body?.toLowerCase().includes(q) ?? false) ||
      (review.author?.username?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleLoadMore = () => {
    if (personalityData?.nextCursor && !personalityData.loading) {
      dispatch(
        fetchReviews({
          orgSlug,
          personalitySlug,
          personalityId,
          params: {
            cursor: personalityData.nextCursor,
            sort: sort as 'newest' | 'oldest' | 'rating_desc' | 'rating_asc',
          },
        })
      );
    }
  };

  const handleDelete = async (reviewId: string) => {
    const confirmed = await confirm('Delete Review', 'Are you sure you want to delete this review?');
    if (!confirmed) {
      return;
    }

    setDeletingId(reviewId);
    await dispatch(deleteReview({ reviewId, personalityId }));
    setDeletingId(null);
  };

  // Loading state
  if (personalityData?.loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-light-primary dark:border-dark-primary border-t-transparent"></div>
      </div>
    );
  }

  // Error state
  if (personalityData?.error && reviews.length === 0) {
    return (
      <div className="text-center py-12 card">
        <p className="text-red-600 dark:text-red-400 mb-4">{personalityData.error}</p>
        <button
          onClick={() =>
            dispatch(
              fetchReviews({
                orgSlug,
                personalitySlug,
                personalityId,
                params: {
                  sort: sort as 'newest' | 'oldest' | 'rating_desc' | 'rating_asc',
                },
              })
            )
          }
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (filteredReviews.length === 0) {
    return (
      <div>
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-full">
            <SearchInput value={search} onChange={setSearch} placeholder="Search reviews..." />
          </div>
          <SortDropdown options={SORT_OPTIONS} currentSort={sort} currentOrder="desc" onChange={handleSortChange} />
        </div>
        <div className="text-center py-8 sm:py-12 card">
          <svg
            className="mx-auto h-10 h-10 sm:h-12 sm:w-12 text-light-text-secondary dark:text-dark-text-secondary mb-3 sm:mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {search ? 'No reviews found.' : 'No reviews yet. Be the first to review!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search reviews..." />
        </div>
        <SortDropdown options={SORT_OPTIONS} currentSort={sort} currentOrder="desc" onChange={handleSortChange} />
      </div>

      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            currentUserId={currentUserId}
            onEdit={onEditReview ? () => onEditReview(review) : undefined}
            onDelete={() => handleDelete(review.id)}
            isDeleting={deletingId === review.id}
          />
        ))}

        {/* Load More */}
        {personalityData?.nextCursor && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleLoadMore}
              disabled={personalityData.loading}
              className="btn-primary"
            >
              {personalityData.loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <Dialog
        dialog={dialog}
        onConfirm={() => {
          dialog.onConfirm?.();
        }}
        onCancel={() => {
          dialog.onCancel?.();
        }}
      />
    </div>
  );
};
