import React, { useState, useEffect } from 'react';
import { Profile, ProfileUpdatePayload } from '@/types/profiles';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

interface ProfileEditFormProps {
  profile: Profile;
  onSave: (payload: ProfileUpdatePayload) => void;
  onCancel: () => void;
  updating: boolean;
  error: string | null;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  profile,
  onSave,
  onCancel,
  updating,
  error,
}) => {
  const [bio, setBio] = useState(profile.bio || '');
  const [validationErrors, setValidationErrors] = useState<{
    displayName?: string;
    bio?: string;
  }>({});

  useEffect(() => {
    setBio(profile.bio || '');
  }, [profile]);

  const validate = (): boolean => {
    const errors: { displayName?: string; bio?: string } = {};


    if (bio.length > 500) {
      errors.bio = 'Bio must be 500 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: ProfileUpdatePayload = {
      bio: bio.trim() || null,
    };

    onSave(payload);
  };

  const hasChanges =
    bio !== (profile.bio || '');

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-6">Edit Profile</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Username
          </label>
          <Input
            type="text"
            value={profile.username}
            disabled
            className="bg-light-border/30 dark:bg-dark-border/30 cursor-not-allowed"
          />
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">Username cannot be changed</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            disabled={updating}
            rows={4}
            maxLength={501}
            className="textarea"
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${validationErrors.bio ? 'text-red-600 dark:text-red-400' : 'text-light-text-secondary dark:text-dark-text-secondary'}`}>
              {validationErrors.bio || 'Optional, max 500 characters'}
            </p>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{bio.length}/500</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={updating || !hasChanges || Object.keys(validationErrors).length > 0}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={updating}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileEditForm;
