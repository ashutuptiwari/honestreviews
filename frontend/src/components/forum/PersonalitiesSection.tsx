// src/components/org/PersonalitiesSection.tsx
'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  fetchPersonalities,
  deletePersonality,
  selectPersonalities,
  selectPersonalitiesLoading,
  selectPersonalitiesError,
} from '@/store/personalitySlice';
import { Personality } from '@/types/personalities';
import PersonalityCard from './PersonalityCard';
import CreatePersonalityModal from './CreatePersonalityModal';
import EditPersonalityModal from './EditPersonalityModal';

interface PersonalitiesSectionProps {
  orgSlug: string;
  canModerateOrg: boolean | false;
}

export default function PersonalitiesSection({ orgSlug, canModerateOrg }: PersonalitiesSectionProps) {
  const dispatch = useDispatch<AppDispatch>();
  const personalities = useSelector(selectPersonalities);
  const loading = useSelector(selectPersonalitiesLoading);
  const error = useSelector(selectPersonalitiesError);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);

  useEffect(() => {
    dispatch(fetchPersonalities({ orgSlug }));
  }, [dispatch, orgSlug]);

  const handleEdit = (personality: Personality) => {
    setSelectedPersonality(personality);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (personality: Personality) => {
    try {
      await dispatch(
        deletePersonality({ orgSlug, personalitySlug: personality.slug })
      ).unwrap();
    } catch (err) {
      console.error('Failed to delete personality:', err);
    }
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedPersonality(null);
  };

  // Loading state
  if (loading && personalities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-light-primary dark:border-dark-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Loading personalities...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && personalities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md card">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">Failed to Load Personalities</h3>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchPersonalities({ orgSlug }))}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (personalities.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md card">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-light-text-secondary dark:text-dark-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">No Personalities Yet</h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
              Get started by creating your first personality to review.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
            >
              Create Personality
            </button>
          </div>
        </div>

        <CreatePersonalityModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
          orgSlug={orgSlug}
        />
      </>
    );
  }

  // Grid view with personalities
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            Personalities ({personalities.length})
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
            People and entities being reviewed in this organization
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Personality
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personalities.map((personality) => (
          <PersonalityCard
            key={personality.id}
            personality={personality}
            orgSlug={orgSlug}
            canModerateOrg={canModerateOrg}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Modals */}
      <CreatePersonalityModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        orgSlug={orgSlug}
      />

      <EditPersonalityModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        orgSlug={orgSlug}
        personality={selectedPersonality}
      />
    </>
  );
}
