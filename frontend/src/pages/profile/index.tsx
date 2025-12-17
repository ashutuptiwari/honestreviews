// src/pages/profile/index.tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import Layout from '@/components/layout/Layout';
import ProfileView from '@/components/forum/ProfileView';
import ProfileEditForm from '@/components/forum/ProfileEditForm';
import { AppDispatch } from '@/store';
import {
  fetchProfile,
  updateProfile,
  selectProfile,
  selectProfileLoading,
  selectProfileError,
  selectProfileUpdating,
  selectProfileUpdateError,
  clearUpdateError,
} from '@/store/profileSlice';
import { selectAuthUser } from '@/store/authSlice';
import { ProfileUpdatePayload } from '@/types/profiles';

/**
 * Personal Profile Page (/profile)
 * 
 * Responsibilities:
 * - Auth protection (redirect if not logged in)
 * - Fetch personal profile via Redux
 * - Toggle between view and edit modes
 * - Handle profile updates with strict re-fetching
 */
const ProfilePage: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const authUser = useSelector(selectAuthUser);
  const profile = useSelector(selectProfile);
  const loading = useSelector(selectProfileLoading);
  const error = useSelector(selectProfileError);
  const updating = useSelector(selectProfileUpdating);
  const updateError = useSelector(selectProfileUpdateError);

  const [isEditing, setIsEditing] = useState(false);

  // Auth protection: redirect to login if not authenticated
  useEffect(() => {
    if (!authUser) {
      router.push('/auth/login');
    }
  }, [authUser, router]);

  // Fetch profile on mount
  useEffect(() => {
    if (authUser && !profile) {
      dispatch(fetchProfile());
    }
  }, [authUser, profile, dispatch]);

  const handleEdit = () => {
    setIsEditing(true);
    dispatch(clearUpdateError());
  };

  const handleCancel = () => {
    setIsEditing(false);
    dispatch(clearUpdateError());
  };

  const handleSave = async (payload: ProfileUpdatePayload) => {
    const result = await dispatch(updateProfile(payload));

    if (updateProfile.fulfilled.match(result)) {
      // Success - exit edit mode
      setIsEditing(false);
    }
    // Error is displayed via updateError state
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-light-primary dark:border-dark-primary mx-auto mb-4"></div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            <p className="font-medium">Failed to load profile</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => dispatch(fetchProfile())}
              className="mt-3 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // No profile data
  if (!profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center text-light-text-secondary dark:text-dark-text-secondary">
          <p>No profile data available</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {isEditing ? (
          <ProfileEditForm
            profile={profile}
            onSave={handleSave}
            onCancel={handleCancel}
            updating={updating}
            error={updateError}
          />
        ) : (
          <ProfileView
            profile={profile}
            canEdit={true}
            onEdit={handleEdit}
          />
        )}
      </div>
    </Layout>
  );
};

export default ProfilePage;