import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { useDialog } from '@/hooks/useDialog';
import { Dialog } from '@/components/common/Dialog';
import {
  fetchPersonalityBySlug,
  deletePersonality,
  selectCurrentPersonality,
  selectPersonalitiesLoading,
  selectPersonalitiesError,
  clearCurrentPersonality,
} from '@/store/personalitySlice';
import { selectCanModerateOrg, selectIsOrgMember } from '@/store/orgsSlice';
import { selectAuthUser } from '@/store/authSlice';
import Layout from '@/components/layout/Layout';
import PersonalityDetail from '@/components/forum/PersonalityDetail';
import EditPersonalityModal from '@/components/forum/EditPersonalityModal';
import { ReviewsSection } from '@/components/forum/ReviewSection';

export default function PersonalityDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialog, confirm, alert, close } = useDialog();
  
  // Guard against undefined route params
  const router = useRouter();
  const { slug, personalitySlug } = router.query;

  const orgSlug = typeof slug === 'string' ? slug : undefined;
  const personalitySlugNormalized = typeof personalitySlug === 'string' ? personalitySlug : undefined;

  const personality = useSelector(selectCurrentPersonality);
  const loading = useSelector(selectPersonalitiesLoading);
  const error = useSelector(selectPersonalitiesError);
  const authUser = useSelector(selectAuthUser);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOrgMember = useSelector(
  selectIsOrgMember(orgSlug || '', authUser?.id)
);


  // Fetch personality data when params are available
  useEffect(() => {
    if (orgSlug && personalitySlugNormalized) {
      dispatch(fetchPersonalityBySlug({ orgSlug, personalitySlug: personalitySlugNormalized }));
    }

    // Cleanup on unmount to avoid stale data
    return () => {
      dispatch(clearCurrentPersonality());
    };
  }, [dispatch, orgSlug, personalitySlugNormalized]);

  // Compute permissions
  const canModify = useSelector(
    selectCanModerateOrg(orgSlug || '', authUser?.id)
  );

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!personality || !orgSlug) return;

    const confirmed = await confirm(
      'Delete Personality',
      `Are you sure you want to delete "${personality.name}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await dispatch(
        deletePersonality({ 
          orgSlug, 
          personalitySlug: personality.slug 
        })
      ).unwrap();
      
      // Redirect back to org page after successful deletion
      router.push(`/orgs/${orgSlug}`);
    } catch (err) {
      console.error('Failed to delete personality:', err);
      setIsDeleting(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    // Optionally refetch to get updated data
    if (orgSlug && personalitySlugNormalized) {
      dispatch(fetchPersonalityBySlug({ orgSlug, personalitySlug: personalitySlugNormalized }));
    }
  };

  const handleBackToOrg = () => {
    if (orgSlug) {
      router.push(`/orgs/${orgSlug}`);
    }
  };

  // Guard: return null if params not ready
  if (!orgSlug || !personalitySlugNormalized) {
    return null;
  }

  // Loading state
  if (loading && !personality) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-light-primary dark:border-dark-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Loading personality...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state (404 or other errors)
  if (error && !personality) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-red-500"
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
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
                Personality Not Found
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                {error || 'The personality you are looking for does not exist or has been removed.'}
              </p>
              <button
                onClick={handleBackToOrg}
                className="px-4 py-2 text-sm font-medium text-white bg-light-primary dark:bg-dark-primary rounded-md hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover"
              >
                Back to Organization
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Not found state (no error but no personality either)
  if (!personality) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-2">
                Personality Not Found
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                Unable to load personality details.
              </p>
              <button
                onClick={handleBackToOrg}
                className="px-4 py-2 text-sm font-medium text-white bg-light-primary dark:bg-dark-primary rounded-md hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover"
              >
                Back to Organization
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Success state - show personality details
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackToOrg}
          className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Organization
        </button>

        {/* Personality Details */}
        <PersonalityDetail personality={personality} />

        {/* Edit/Delete Actions */}
        {canModify && (
          <div className="mt-6 flex items-center gap-3 pb-6 border-b border-light-border dark:border-dark-border">
              <button
                onClick={handleEdit}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-light-primary dark:text-dark-primary bg-light-surface dark:bg-dark-surface rounded-md hover:bg-light-primary-hover dark:hover:bg-dark-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit Personality
              </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Personality'}
            </button>
          </div>
        )}

        {/* Reviews Section - Replaces ReviewsPlaceholder */}
        <div className="mt-8">
          <ReviewsSection
            orgSlug={orgSlug}
            personalitySlug={personalitySlugNormalized}
            personalityId={personality.id}
            currentUserId={authUser?.id}
            isOrgMember={isOrgMember}
          />
        </div>

        {/* Edit Modal */}
        <EditPersonalityModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          orgSlug={orgSlug}
          personality={personality}
        />

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
    </Layout>
  );
}
