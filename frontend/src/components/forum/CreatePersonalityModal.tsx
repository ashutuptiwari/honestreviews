// src/components/forum/CreatePersonalityModal.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { createPersonality, clearError } from '@/store/personalitySlice';
import { PersonalityCreate } from '@/types/personalities';

interface CreatePersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
}

export default function CreatePersonalityModal({
  isOpen,
  onClose,
  orgSlug,
}: CreatePersonalityModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.personalities);

  const [formData, setFormData] = useState<PersonalityCreate>({
    name: '',
    description: '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: { name?: string; description?: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      errors.name = 'Name must not exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must not exceed 500 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await dispatch(createPersonality({ orgSlug, payload: formData })).unwrap();
      handleClose();
    } catch (err) {
      // Error handled by Redux
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    setValidationErrors({});
    dispatch(clearError());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full mx-4 border border-light-border dark:border-dark-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">Create Personality</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text disabled:opacity-50 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Name Field */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (validationErrors.name) {
                  setValidationErrors({ ...validationErrors, name: undefined });
                }
              }}
              disabled={loading}
              className={`input ${validationErrors.name ? 'border-red-500 dark:border-red-400' : ''}`}
              placeholder="Enter personality name"
              maxLength={100}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.name}</p>
            )}
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">{formData.name.length}/100 characters</p>
          </div>

          {/* Description Field */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (validationErrors.description) {
                  setValidationErrors({ ...validationErrors, description: undefined });
                }
              }}
              disabled={loading}
              rows={4}
              className={`textarea ${validationErrors.description ? 'border-red-500 dark:border-red-400' : ''}`}
              placeholder="Provide a brief description (optional)"
              maxLength={500}
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.description}</p>
            )}
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {formData.description?.length || 0}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Personality'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
