// frontend/src/pages/orgs/new.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import Layout from '@/components/layout/Layout';
import OrgForm from '@/components/forum/orgForm';
import { useCreateOrg } from '@/hooks/useOrgs';
import { selectAuthUser } from '@/store/authSlice';

const NewOrgPage: React.FC = () => {
  const router = useRouter();
  const user = useSelector(selectAuthUser);
  const { createOrg } = useCreateOrg();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  const handleSubmit = async (data: { name: string; description?: string }) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const org = await createOrg(data);
      router.push(`/orgs/${org.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null; // Will redirect
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">Create Organization</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
            Start a new community
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="card p-6">
          <OrgForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Create Organization"
          />
        </div>
      </div>
    </Layout>
  );
};

export default NewOrgPage;
