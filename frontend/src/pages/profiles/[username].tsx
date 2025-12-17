// src/pages/profiles/[username].tsx
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import ProfileView from '@/components/forum/ProfileView';
import { Profile } from '@/types/profiles';
import { fetchPublicProfile } from '@/services/profileWrapper';

/**
 * Public Profile Page (/profiles/[username])
 * 
 * Responsibilities:
 * - Fetch public profile directly (no Redux)
 * - No auth required
 * - Read-only view (canEdit=false)
 * - Handle 404 (profile not found)
 */
const PublicProfilePage: React.FC = () => {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username || typeof username !== 'string') {
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPublicProfile(username);
        setProfile(data);
      } catch (err: any) {
        // Handle 404 specifically
        if (err.status === 404) {
          setError('Profile not found');
        } else {
          setError(err.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

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

  // Error state (including 404)
  if (error) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            <p className="font-medium">{error}</p>
            {error === 'Profile not found' ? (
              <p className="text-sm mt-1">
                The user &quot;{username}&quot; does not exist.
              </p>
            ) : (
              <button
                onClick={() => router.reload()}
                className="mt-3 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // No profile data (shouldn't happen if no error, but defensive)
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
        <ProfileView
          profile={profile}
          canEdit={false}
        />
      </div>
    </Layout>
  );
};

export default PublicProfilePage;