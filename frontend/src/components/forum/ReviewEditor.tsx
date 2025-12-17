import React, { useState, useEffect } from 'react';
import { StarRating } from '@/components/common/StarRating';
import type { Review } from '@/types/reviews';

interface ReviewEditorProps {
  mode: 'create' | 'edit';
  existingReview?: Review;
  onSubmit: (data: { title?: string; body: string; rating: number }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

export const ReviewEditor: React.FC<ReviewEditorProps> = ({
  mode,
  existingReview,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
}) => {
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [title, setTitle] = useState<string>(existingReview?.title || '');
  const [body, setBody] = useState<string>(existingReview?.body || '');
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title || '');
      setBody(existingReview.body);
    }
  }, [existingReview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setValidationError('Please select a rating');
      return;
    }

    if (body.trim().length === 0) {
      setValidationError('Please write a review');
      return;
    }

    if (body.trim().length < 10) {
      setValidationError('Review must be at least 10 characters');
      return;
    }

    setValidationError('');

    const trimmedTitle = title.trim();

    onSubmit({
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
      body: body.trim(),
      rating,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h3 className="text-lg sm:text-xl font-semibold text-light-text dark:text-dark-text mb-4 sm:mb-6">
        {mode === 'create' ? 'Write a Review' : 'Edit Review'}
      </h3>

      {/* Title (optional) */}
      <div className="mb-4 sm:mb-5">
        <label htmlFor="review-title" className="block text-xs sm:text-sm font-medium text-light-text dark:text-dark-text mb-1 sm:mb-2">
          Title <span className="text-light-text-secondary dark:text-dark-text-secondary">(optional)</span>
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Summarize your experience"
          disabled={isSubmitting}
          className="input text-sm sm:text-base"
        />
      </div>

      {/* Rating Selector */}
      <div className="mb-4 sm:mb-5">
        <label className="block text-xs sm:text-sm font-medium text-light-text dark:text-dark-text mb-1 sm:mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <StarRating rating={rating} interactive size="lg" onChange={setRating} />
      </div>

      {/* Review Body */}
      <div className="mb-4 sm:mb-5">
        <label htmlFor="review-body" className="block text-xs sm:text-sm font-medium text-light-text dark:text-dark-text mb-1 sm:mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="textarea text-sm sm:text-base"
          placeholder="Share your experience..."
          disabled={isSubmitting}
        />
        <p className="mt-1 sm:mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {body.length} characters (minimum 10)
        </p>
      </div>

      {/* Errors */}
      {(validationError || error) && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs sm:text-sm text-red-800 dark:text-red-300">{validationError || error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm sm:text-base py-2 sm:py-2.5">
          {isSubmitting ? 'Submitting...' : mode === 'create' ? 'Post Review' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-secondary text-sm sm:text-base py-2 sm:py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
