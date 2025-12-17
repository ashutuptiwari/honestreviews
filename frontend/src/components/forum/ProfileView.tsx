// src/components/profile/ProfileView.tsx
import React from 'react';
import { Profile } from '@/types/profiles';
import Button from '@/components/common/Button';

interface ProfileViewProps {
  profile: Profile;
  canEdit: boolean;
  onEdit?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, canEdit, onEdit }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-light-text dark:text-dark-text">
          {canEdit ? 'My Profile' : 'Profile'}
        </h2>
        {canEdit && onEdit && (
          <Button variant="primary" onClick={onEdit} className="w-full sm:w-auto">
            Edit Profile
          </Button>
        )}
      </div>

      <div className="space-y-4 sm:space-y-5">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Username
          </label>
          <p className="text-sm sm:text-base text-light-text dark:text-dark-text font-medium">{profile.username}</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Bio
          </label>
          <p className="text-sm sm:text-base text-light-text dark:text-dark-text whitespace-pre-wrap">
            {profile.bio || (
              <span className="text-light-text-secondary dark:text-dark-text-secondary italic">No bio yet</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Member Since
          </label>
          <p className="text-sm sm:text-base text-light-text dark:text-dark-text font-medium">{formatDate(profile.created_at)}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

