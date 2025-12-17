import React from 'react';
import { StarRating } from '@/components/common/StarRating';
import type { Review, ReviewListItem } from '@/types/reviews';
import { formatDistanceToNow } from 'date-fns';

interface ReviewCardProps {
  review: Review | ReviewListItem;
  currentUserId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  compact?: boolean;
  canDelete?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  currentUserId,
  onEdit,
  onDelete,
  isDeleting = false,
  compact = false,
  canDelete = false,
}) => {
  const isAuthor = Boolean(currentUserId && review.author?.id === currentUserId);
  const showEdit = isAuthor && onEdit;
  const showDelete = (isAuthor || canDelete) && onDelete;

  const reviewBody = 'snippet' in review ? review.snippet : review.body;
  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
  });

  const hasPersonalityInfo =
    'personality' in review &&
    review.personality &&
    review.personality.name &&
    review.personality.organization?.name;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Author Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover flex items-center justify-center flex-shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-white">
              {review.author?.username?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          
          {/* Author Info */}
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-light-text dark:text-dark-text truncate">
              {review.author?.username || 'Anonymous'}
            </p>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {timeAgo}
            </p>
          </div>
        </div>

        {/* Actions */}
        {(showEdit || showDelete) && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {showEdit && (
              <button
                onClick={onEdit}
                disabled={isDeleting}
                className="text-xs sm:text-sm font-medium text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover disabled:opacity-50 transition-colors"
              >
                Edit
              </button>
            )}
            {showDelete && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {!compact && review.title && (
        <h3 className="mb-2 sm:mb-3 text-sm sm:text-base font-semibold text-light-text dark:text-dark-text">
          {review.title}
        </h3>
      )}

      {/* Rating */}
      <div className="mb-3 sm:mb-4">
        <StarRating rating={review.rating} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Personality Info */}
      {hasPersonalityInfo && !compact && (
        <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <span>Review for</span>
          <span className="font-medium text-light-text dark:text-dark-text truncate">
            {review.personality!.name}
          </span>
          <span className="hidden sm:inline">in</span>
          <span className="font-medium text-light-text dark:text-dark-text truncate">
            {review.personality!.organization.name}
          </span>
        </div>
      )}

      {/* Body */}
      <p className="text-xs sm:text-sm text-light-text dark:text-dark-text leading-relaxed whitespace-pre-wrap">
        {reviewBody}
      </p>
    </div>
  );
};
