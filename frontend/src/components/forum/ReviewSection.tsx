import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  createReview,
  updateReview,
  selectPersonalityStats,
  selectIsCreating,
  selectCreateError,
  selectIsUpdating,
  selectUpdateError,
  clearCreateError,
  clearUpdateError,
} from '@/store/reviewSlice';
import { StarRating } from '@/components/common/StarRating';
import { ReviewEditor } from './ReviewEditor';
import { ReviewList } from './ReviewList';
import type { Review } from '@/types/reviews';

interface ReviewsSectionProps {
  orgSlug: string;
  personalitySlug: string;
  personalityId: string;
  currentUserId?: string;
  isOrgMember: boolean;
  canModerateOrg?: boolean;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  orgSlug,
  personalitySlug,
  personalityId,
  currentUserId,
  isOrgMember,
  canModerateOrg = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector((state: RootState) =>
    selectPersonalityStats(state, personalityId)
  );
  const isCreating = useSelector(selectIsCreating);
  const createError = useSelector(selectCreateError);

  const [isWritingReview, setIsWritingReview] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const isUpdating = useSelector((state: RootState) =>
    editingReview ? selectIsUpdating(state, editingReview.id) : false
  );
  const updateError = useSelector((state: RootState) =>
    editingReview ? selectUpdateError(state, editingReview.id) : null
  );

  const handleCreateReview = async (data: {
    title?: string;
    body: string;
    rating: number;
  }) => {
    const result = await dispatch(
      createReview({
        orgSlug,
        personalitySlug,
        personalityId,
        payload: {
          title: data.title || '',
          body: data.body,
          rating: data.rating,
        },
      })
    );

    if (createReview.fulfilled.match(result)) {
      setIsWritingReview(false);
    }
  };

  const handleUpdateReview = async (data: {
    title?: string;
    body: string;
    rating: number;
  }) => {
    if (!editingReview) return;

    const result = await dispatch(
      updateReview({
        reviewId: editingReview.id,
        payload: {
          title: data.title,
          body: data.body,
          rating: data.rating,
        },
      })
    );

    if (updateReview.fulfilled.match(result)) {
      setEditingReview(null);
    }
  };

  const handleCancelCreate = () => {
    setIsWritingReview(false);
    dispatch(clearCreateError());
  };

  const handleCancelEdit = () => {
    if (editingReview) {
      dispatch(clearUpdateError(editingReview.id));
    }
    setEditingReview(null);
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setIsWritingReview(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="card">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Reviews</h2>
        
        {stats && stats.total_reviews > 0 ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold text-light-primary dark:text-dark-primary">
                {stats.average_review.toFixed(1)}
              </span>
              <div className="flex flex-col gap-2">
                <StarRating rating={stats.average_review} size="md" />
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-light-text-secondary dark:text-dark-text-secondary">No reviews yet</p>
        )}
      </div>

      {/* Write Review Button / Editor */}
      {currentUserId && (
        <div>
          {isOrgMember ? (
            <>
              {!isWritingReview && !editingReview && (
                <button
                  onClick={() => setIsWritingReview(true)}
                  className="btn-primary"
                >
                  Write a Review
                </button>
              )}

              {isWritingReview && (
                <ReviewEditor
                  mode="create"
                  onSubmit={handleCreateReview}
                  onCancel={handleCancelCreate}
                  isSubmitting={isCreating}
                  error={createError}
                />
              )}

              {editingReview && (
                <ReviewEditor
                  mode="edit"
                  existingReview={editingReview}
                  onSubmit={handleUpdateReview}
                  onCancel={handleCancelEdit}
                  isSubmitting={isUpdating}
                  error={updateError}
                />
              )}
            </>
          ) : (
            <div className="card bg-light-primary/10 dark:bg-dark-primary/10 border-light-primary/30 dark:border-dark-primary/30">
              <p className="text-light-primary dark:text-dark-primary font-medium">
                Join the organization to write a review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <ReviewList
        orgSlug={orgSlug}
        personalitySlug={personalitySlug}
        personalityId={personalityId}
        currentUserId={currentUserId}
        onEditReview={handleEditReview}
        canModerateOrg={canModerateOrg}
      />
    </div>
  );
};
