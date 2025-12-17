'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { useDialog } from '@/hooks/useDialog';
import { Dialog } from '@/components/common/Dialog';
import { selectAuthUser } from '@/store/authSlice';
import { Personality } from '@/types/personalities';
import { StarRating } from '@/components/common/StarRating';

interface PersonalityCardProps {
  personality: Personality;
  orgSlug: string;
  canModerateOrg: boolean;
  onEdit: (personality: Personality) => void;
  onDelete: (personality: Personality) => void;
}

export default function PersonalityCard({
  personality,
  orgSlug,
  canModerateOrg,
  onEdit,
  onDelete,
}: PersonalityCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUser = useSelector(selectAuthUser);
  const { dialog, confirm, close } = useDialog();

  const canModify = canModerateOrg;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(personality);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm('Delete Personality', `Are you sure you want to delete "${personality.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(personality);
    } finally {
      setIsDeleting(false);
    }
  };

  const truncateDescription = (text: string | null | undefined, maxLength: number = 120) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  // List variant (horizontal layout)
  return (
    <>
      <Link
        href={`/orgs/${orgSlug}/personalities/${personality.slug}`}
        className="block group"
      >
        <div className="card transition-all hover:shadow-card-hover dark:hover:shadow-card-hover-dark">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {personality.avatar_url ? (
              <img
                src={personality.avatar_url}
                alt={personality.name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-light-border dark:ring-dark-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-light-primary to-light-primary-hover dark:from-dark-primary dark:to-dark-primary-hover flex items-center justify-center text-white text-xl font-semibold">
                {personality.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors truncate">
                  {personality.name}
                </h3>
                
                {/* Rating and Review Count */}
                <div className="flex items-center gap-3 mt-1">
                  {personality.average_review !== null && personality.average_review !== undefined && (
                    <StarRating 
                      rating={personality.average_review} 
                      size="sm"
                      showValue
                    />
                  )}
                  <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {personality.total_reviews} {personality.total_reviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {canModify && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEdit}
                    disabled={isDeleting}
                    className="text-sm text-light-primary dark:text-dark-primary hover:text-light-primary-hover dark:hover:text-dark-primary-hover font-medium disabled:opacity-50 transition-colors"
                  >
                    Edit
                  </button>
                  <span className="text-light-border dark:text-dark-border">•</span>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50 transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            {personality.description && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary line-clamp-2">
                {truncateDescription(personality.description, 200)}
              </p>
            )}

            {/* Created Date */}
            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
              Created {new Date(personality.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </Link>

      <Dialog
        dialog={dialog}
        onConfirm={() => {
          dialog.onConfirm?.();
        }}
        onCancel={() => {
          dialog.onCancel?.();
        }}
      />
    </>)}
