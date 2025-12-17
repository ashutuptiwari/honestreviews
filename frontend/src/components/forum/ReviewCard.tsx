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
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  currentUserId,
  onEdit,
  onDelete,
  isDeleting = false,
  compact = false,
}) => {
  const isAuthor = Boolean(currentUserId && review.author?.id === currentUserId);
  const showActions = isAuthor && (onEdit || onDelete);

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
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Author Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">
              {review.author?.username?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          
          {/* Author Info */}
          <div>
            <p className="text-sm font-semibold text-light-text dark:text-dark-text">
              {review.author?.username || 'Anonymous'}
            </p>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {timeAgo}
            </p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={onEdit}
                disabled={isDeleting}
                className="text-sm font-medium text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover disabled:opacity-50 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                disabled={isDeleting}
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      {!compact && review.title && (
        <h3 className="mb-3 text-base font-semibold text-light-text dark:text-dark-text">
          {review.title}
        </h3>
      )}

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={review.rating} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Personality Info */}
      {hasPersonalityInfo && !compact && (
        <div className="mb-4 flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
          <span>Review for</span>
          <span className="font-medium text-light-text dark:text-dark-text">
            {review.personality!.name}
          </span>
          <span>in</span>
          <span className="font-medium text-light-text dark:text-dark-text">
            {review.personality!.organization.name}
          </span>
        </div>
      )}

      {/* Body */}
      <p className="text-sm text-light-text dark:text-dark-text leading-relaxed whitespace-pre-wrap">
        {reviewBody}
      </p>
    </div>
  );
};
